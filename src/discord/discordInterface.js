import { Client, GatewayIntentBits, Partials, MessageType, MessageFlags, TextChannel, ChannelType } from 'discord.js';
import { Groq } from 'groq-sdk';
import { setTimeout } from 'timers/promises';
import config from '../config.js';
import memoryManager from '../memory/memoryManager.js';
import contextManager from '../context/contextManager.js';
import timeManager from '../time/timeManager.js';
import agentManager from '../agents/agentManager.js';

/**
 * Maximum message length allowed by Discord
 */
const MAX_MESSAGE_LENGTH = 2000;

/**
 * Message queue item states
 */
const QueueItemState = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SENT: 'sent',
  FAILED: 'failed'
};

/**
 * Class representing a message in the queue
 */
class QueuedMessage {
  /**
   * Create a queued message
   * @param {Object} params - Message parameters
   */
  constructor({
    id = Date.now().toString(),
    content,
    channelId,
    agentId = null,
    userId = null,
    reference = null,
    priority = 0,
    state = QueueItemState.PENDING,
    createdAt = new Date(),
    attempts = 0,
    error = null
  }) {
    this.id = id;
    this.content = content;
    this.channelId = channelId;
    this.agentId = agentId;
    this.userId = userId;
    this.reference = reference;
    this.priority = priority;
    this.state = state;
    this.createdAt = createdAt;
    this.attempts = attempts;
    this.error = error;
  }
}

/**
 * Class managing the Discord interface
 */
class DiscordInterface {
  /**
   * Create a Discord interface
   */
  constructor() {
    this.client = null;
    this.groq = new Groq({ apiKey: config.api.groq.apiKey });
    this.messageQueue = [];
    this.processingQueue = false;
    this.activeCollectors = new Map(); // Map of channelId to collector
    this.userAIAssignments = new Map(); // Map of userId to agentId
    this.channelAssignments = new Map(); // Map of channelId to Array of agentIds
    this.cooldowns = new Map(); // For rate limiting
    this.initialized = false;
  }

  /**
   * Initialize the Discord interface
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      // Create Discord client with required intents
      this.client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent,
          GatewayIntentBits.DirectMessages,
          GatewayIntentBits.GuildMessageReactions,
          GatewayIntentBits.DirectMessageReactions
        ],
        partials: [
          Partials.Channel,
          Partials.Message,
          Partials.Reaction
        ]
      });

      // Set up event handlers
      this._setupEventHandlers();

      // Login to Discord
      await this.client.login(config.discord.token);
      console.log(`Discord bot logged in as ${this.client.user.tag}`);

      // Start queue processor
      this._startQueueProcessor();

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize Discord interface:', error);
      throw error;
    }
  }

  /**
   * Set up Discord event handlers
   * @private
   */
  _setupEventHandlers() {
    this.client.on('ready', () => {
      console.log(`Discord bot is ready! Logged in as ${this.client.user.tag}`);
    });

    this.client.on('messageCreate', async (message) => {
      try {
        // Ignore messages from bots (including self)
        if (message.author.bot) return;

        // Check for command prefix if it's a command
        if (message.content.startsWith(config.discord.prefix)) {
          await this._handleCommand(message);
          return;
        }

        // Check if this is a message in a channel with active collectors
        if (this.activeCollectors.has(message.channelId)) {
          await this._handleCollectedMessage(message);
          return;
        }

        // Otherwise, it might be a message directed at the bot
        if (message.mentions.has(this.client.user)) {
          await this._handleMention(message);
          return;
        }
      } catch (error) {
        console.error('Error handling message:', error);
        await this._safeReply(message, 'Sorry, I encountered an error processing your message.');
      }
    });

    this.client.on('error', (error) => {
      console.error('Discord client error:', error);
    });
  }

  /**
   * Handle a command message
   * @param {Message} message - Discord message
   * @private
   */
  async _handleCommand(message) {
    // Extract command and arguments
    const args = message.content.slice(config.discord.prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    switch (command) {
      case 'start':
        await this._startConversation(message, args);
        break;

      case 'assign':
        await this._assignAgent(message, args);
        break;

      case 'list':
        await this._listAgents(message);
        break;

      case 'time':
        await this._showTime(message);
        break;

      case 'help':
        await this._showHelp(message);
        break;

      default:
        await this._safeReply(message, `Unknown command: \`${command}\`. Type \`${config.discord.prefix}help\` for a list of commands.`);
    }
  }

  /**
   * Start a conversation with an AI agent
   * @param {Message} message - Discord message
   * @param {string[]} args - Command arguments
   * @private
   */
  async _startConversation(message, args) {
    try {
      // Get agent ID from args or use default
      let agentId = args[0];
      
      if (!agentId) {
        // Find agents and use the first one
        const agents = await agentManager.getAllAgents();
        if (agents.length === 0) {
          await this._safeReply(message, 'No AI agents are available. Please create one first.');
          return;
        }
        agentId = agents[0].id;
      }
      
      // Verify agent exists
      const agent = await agentManager.getAgent(agentId);
      if (!agent) {
        await this._safeReply(message, `Agent with ID ${agentId} not found.`);
        return;
      }
      
      // Assign agent to user
      this.userAIAssignments.set(message.author.id, agentId);
      
      // Assign agent to channel
      if (!this.channelAssignments.has(message.channelId)) {
        this.channelAssignments.set(message.channelId, []);
      }
      
      if (!this.channelAssignments.get(message.channelId).includes(agentId)) {
        this.channelAssignments.get(message.channelId).push(agentId);
      }
      
      // Start message collector for this channel
      this._startCollector(message.channel);
      
      // Generate initial response
      const initialPrompt = args.slice(1).join(' ') || 'Hello!';
      
      // Add to context
      await contextManager.addContextMessage({
        content: initialPrompt,
        role: 'user',
        userId: message.author.id
      });
      
      // Generate response
      const response = await agentManager.generateAgentResponse(agentId, {
        message: initialPrompt,
        fromUserId: message.author.id,
        additionalContext: []
      });
      
      // Queue the response
      await this._queueMessage({
        content: response,
        channelId: message.channelId,
        agentId,
        userId: message.author.id,
        reference: message.id
      });
    } catch (error) {
      console.error('Error starting conversation:', error);
      await this._safeReply(message, 'Sorry, I encountered an error starting the conversation.');
    }
  }

  /**
   * Assign an agent to a user
   * @param {Message} message - Discord message
   * @param {string[]} args - Command arguments
   * @private
   */
  async _assignAgent(message, args) {
    try {
      if (args.length < 1) {
        await this._safeReply(message, `Usage: ${config.discord.prefix}assign <agentId>`);
        return;
      }
      
      const agentId = args[0];
      
      // Verify agent exists
      const agent = await agentManager.getAgent(agentId);
      if (!agent) {
        await this._safeReply(message, `Agent with ID ${agentId} not found.`);
        return;
      }
      
      // Assign agent to channel
      this.channelAssignments.set(message.author.id, agentId);
      
      // Confirm assignment
      await this._safeReply(message, `You are now talking to ${agent.name}.`);
    } catch (error) {
      console.error('Error assigning agent:', error);
      await this._safeReply(message, 'Sorry, I encountered an error assigning the agent.');
    }
  }

  /**
   * List available agents
   * @param {Message} message - Discord message
   * @private
   */
  async _listAgents(message) {
    try {
      const agents = await agentManager.getAllAgents();

      if (agents.length === 0) {
        await this._safeReply(message, 'No AI agents are available. Please create one first.');
        return;
      }

      const agentLines = agents.map(agent =>
        `- **${agent.name}** (ID: \`${agent.id}\`): ${agent.description.substring(0, 100)}${agent.description.length > 100 ? '...' : ''}`
      );

      const MAX_LENGTH = 1999; // Discord message limit safety
      const chunks = [];
      let currentChunk = '**Available Agents:**\n';

      for (const line of agentLines) {
        if ((currentChunk + line + '\n').length > MAX_LENGTH) {
          chunks.push(currentChunk.trim());
          currentChunk = ''; // Reset chunk without the prefix for subsequent parts
        }

        currentChunk += line + '\n';
      }

      if (currentChunk.trim() !== '') {
        chunks.push(currentChunk.trim());
      }

      for (const chunk of chunks) {
        await this._safeReply(message, chunk);
      }
    } catch (error) {
      console.error('Error listing agents:', error);
      await this._safeReply(message, 'Sorry, I encountered an error listing the agents.');
    }
  }

  /**
   * Show the current time (both real and in-universe)
   * @param {Message} message - Discord message
   * @private
   */
  async _showTime(message) {
    try {
      const timeDetails = timeManager.getTimeDetails();
      
      const response = `**Current Time:**\n` +
        `Real Time: ${timeDetails.real.formatted}\n` +
        `In-Universe Time: ${timeDetails.inUniverse.formatted} (${timeDetails.inUniverse.timeOfDay})\n` +
        `Day: ${timeDetails.inUniverse.dayName}, ${timeDetails.inUniverse.monthName} ${timeDetails.inUniverse.day}, ${timeDetails.inUniverse.year}\n` +
        `Time Scale: ${timeDetails.timeScale}x`;
      
      await this._safeReply(message, response);
    } catch (error) {
      console.error('Error showing time:', error);
      await this._safeReply(message, 'Sorry, I encountered an error retrieving the time information.');
    }
  }

  /**
   * Show help information
   * @param {Message} message - Discord message
   * @private
   */
  async _showHelp(message) {
    const helpText = `
**Available Commands:**

\`${config.discord.prefix}start [agentId] [initialMessage]\` - Start a conversation with an AI agent
\`${config.discord.prefix}assign <agentId>\` - Assign yourself to talk to a specific agent
\`${config.discord.prefix}list\` - List all available AI agents
\`${config.discord.prefix}time\` - Show current real and in-universe time
\`${config.discord.prefix}item\` - Interacts with the worlds items
\`${config.discord.prefix}map\`  - Interacts with the worlds places
\`${config.discord.prefix}help\` - Show this help message

You can also mention me in any message to get a response.
`;
    
    await this._safeReply(message, helpText);
  }

  /**
   * Handle a message directed at the bot via mention
   * @param {Message} message - Discord message
   * @private
   */
  async _handleMention(message) {
    try {
      // Find the assigned agent for this user, or use default
      let agentId = this.userAIAssignments.get(message.author.id);
      
      if (!agentId) {
        // Find agents and use the first one
        const agents = await agentManager.getAllAgents();
        if (agents.length === 0) {
          await this._safeReply(message, 'No AI agents are available. Please create one first.');
          return;
        }
        agentId = agents[0].id;
        this.userAIAssignments.set(message.author.id, agentId);
      }
      
      // Clean the message content (remove the mention)
      const cleanContent = message.content.replace(/<@!?(\d+)>/g, '').trim();
      
      // Add to context
      await contextManager.addContextMessage({
        content: cleanContent,
        role: 'user',
        userId: message.author.id
      });
      
      // Generate response
      const response = await agentManager.generateAgentResponse(agentId, {
        message: cleanContent,
        fromUserId: message.author.id,
        additionalContext: [
          {
            role: 'system',
            content: `You are having a conversation with ${message.author.username}.`
          }
        ]
      });

      const formattedResponse = `**${agentManager.getAgent(agentId).name}**: ${response}`;
      
      // Queue the response
      await this._queueMessage({
        content: formattedResponse,
        channelId: message.channelId,
        agentId,
        userId: message.author.id,
        reference: message.id
      });
    } catch (error) {
      console.error('Error handling mention:', error);
      await this._safeReply(message, 'Sorry, I encountered an error processing your message.');
    }
  }

  /**
   * Extract lowercase agent names from a message using @agentName
   * @param {string} content - Message content
   * @returns {string[]} - Lowercase agent names mentioned
   * @private
   */
  _extractAgentMentions(content) {
    const matches = [...content.matchAll(/@"(\w+)"/g)];
    return matches.map(m => m[1].toLowerCase());
  }

  /**
   * Handle a message collected by an active collector
   * @param {Message} message - Discord message
   * @private
   */
  async _handleCollectedMessage(message) {
    try {
      const allAgentIds = this.channelAssignments.get(message.channelId);
      if (!allAgentIds || allAgentIds.length === 0) return;
  
      if (this._isOnCooldown(message.author.id)) return;
      this._applyCooldown(message.author.id);
  
      const mentionedAgentNames = this._extractAgentMentions(message.content);
      const agentsToRespond = [];
  
      for (const agentId of allAgentIds) {
        const agent = await agentManager.getAgent(agentId);
        if (!agent) continue;
  
        const agentNameLower = agent.name.toLowerCase();
        const mentioned = mentionedAgentNames.length === 0 || mentionedAgentNames.includes(agentNameLower);
  
        if (mentioned) {
          agentsToRespond.push({ id: agentId, name: agent.name });
        }
      }
  
      await contextManager.addContextMessage({
        content: message.content,
        role: 'user',
        userId: message.author.id
      });
  
      for (const agent of agentsToRespond) {
        const response = await agentManager.generateAgentResponse(agent.id, {
          message: message.content,
          fromUserId: message.author.id,
          additionalContext: [
            { role: 'system', content: `You are having a conversation with ${message.author.username}.` }
          ]
        });
  
        const formattedResponse = `**${agent.name}**: ${response}`;
  
        await this._queueMessage({
          content: formattedResponse,
          channelId: message.channelId,
          agentId: agent.id,
          userId: message.author.id,
          reference: message.id
        });
  
        await memoryManager.addMemory({
          content: `${message.author.username} spoke to ${agent.name}. Agent replied: "${response.substring(0, 100)}..."`,
          agentId: agent.id,
          tags: ['conversation', 'multi-agent'],
          keywords: [message.author.username, agent.name],
          metadata: { channelId: message.channelId, userId: message.author.id }
        });
      }  

      await timeManager.advanceTime({ minutes: 1 });
    } catch (error) {
      console.error('Error in enhanced multi-agent handling:', error);
    }
  }  

  /**
   * Start a message collector for a channel
   * @param {TextChannel} channel - Discord text channel
   * @private
   */
  _startCollector(channel) {
    // Skip if there's already a collector for this channel
    if (this.activeCollectors.has(channel.id)) {
      return;
    }
    
    // Create collector with a filter for non-bot messages
    const collector = channel.createMessageCollector({
      filter: m => !m.author.bot,
      time: 24 * 60 * 60 * 1000 // 24 hours
    });
    
    // When the collector ends, remove it from active collectors
    collector.on('end', () => {
      this.activeCollectors.delete(channel.id);
      console.log(`Collector for channel ${channel.id} has ended`);
    });
    
    // Store the collector
    this.activeCollectors.set(channel.id, collector);
    console.log(`Started message collector for channel ${channel.id}`);
  }

  /**
   * Queue a message to be sent
   * @param {Object} messageData - Message data
   * @returns {Promise<void>}
   */
  async _queueMessage(messageData) {
    // Create a queued message
    const queuedMessage = new QueuedMessage(messageData);
    
    // Add to queue
    this.messageQueue.push(queuedMessage);
    
    // Sort queue by priority and creation time
    this.messageQueue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Higher priority first
      }
      return a.createdAt - b.createdAt; // Older messages first
    });
    
    // Start the queue processor if it's not already running
    if (!this.processingQueue) {
      this._processQueue();
    }
  }

  /**
   * Start the queue processor
   * @private
   */
  _startQueueProcessor() {
    // Check the queue periodically
    setInterval(() => {
      if (this.messageQueue.length > 0 && !this.processingQueue) {
        this._processQueue();
      }
    }, 1000);
  }

  /**
   * Process the message queue
   * @private
   */
  async _processQueue() {
    if (this.processingQueue || this.messageQueue.length === 0) {
      return;
    }
    
    this.processingQueue = true;
    
    try {
      // Get the next message
      const queuedMessage = this.messageQueue.shift();
      
      // Update state
      queuedMessage.state = QueueItemState.PROCESSING;
      queuedMessage.attempts += 1;
      
      // Get the channel
      const channel = await this.client.channels.fetch(queuedMessage.channelId);
      if (!channel || channel.type !== ChannelType.GuildText) {
        throw new Error(`Invalid channel: ${queuedMessage.channelId}`);
      }
      
      // Check if message is too long
      if (queuedMessage.content.length > MAX_MESSAGE_LENGTH) {
        // Split message intelligently
        const splitMessages = await this._splitMessage(queuedMessage.content);
        
        // Send each part with a small delay to maintain order
        let reference = queuedMessage.reference;
        for (const part of splitMessages) {
          // Send message
          const message = await channel.send({
            content: part,
            reply: reference ? { messageReference: reference, failIfNotExists: false } : undefined
          });
          
          // Only reply to the first message
          reference = null;
          
          // Wait before sending next part
          await setTimeout(config.discord.messageRateLimit);
        }
      } else {
        // Send simple message
        await channel.send({
          content: queuedMessage.content,
          reply: queuedMessage.reference ? { messageReference: queuedMessage.reference, failIfNotExists: false } : undefined
        });
      }
      
      // Update state
      queuedMessage.state = QueueItemState.SENT;
      
      // Wait before processing next message
      await setTimeout(config.discord.messageRateLimit);
    } catch (error) {
      console.error('Error processing message queue:', error);
      
      // Handle failed message
      if (this.messageQueue.length > 0) {
        const failedMessage = this.messageQueue[0];
        failedMessage.state = QueueItemState.FAILED;
        failedMessage.error = error.message;
        
        // Retry logic
        if (failedMessage.attempts < config.discord.maxRetries) {
          failedMessage.state = QueueItemState.PENDING;
          this.messageQueue.push(failedMessage); // Move to end of queue
        }
      }
    } finally {
      this.processingQueue = false;
      
      // Continue processing if there are more messages
      if (this.messageQueue.length > 0) {
        this._processQueue();
      }
    }
  }

  /**
   * Split a message intelligently
   * @param {string} content - Message content
   * @returns {Promise<string[]>} Array of message parts
   * @private
   */
  async _splitMessage(content) {
    try {
      // If the message is short enough, just return it
      if (content.length <= MAX_MESSAGE_LENGTH) {
        return [content];
      }
      
      // Try to use AI to split the message intelligently
      const response = await this.groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `You are a message splitting assistant. Your task is to split the following message into chunks that are each less than ${MAX_MESSAGE_LENGTH} characters. Split at natural breaks like paragraph boundaries or sentence ends. Never split in the middle of a word or code block. Format your response as a JSON array of strings, with each string being a chunk of the message.`
          },
          {
            role: 'user',
            content
          }
        ],
        model: config.api.groq.model,
        response_format: { type: 'json_object' }
      });
      
      // Parse the response
      const result = JSON.parse(response.choices[0].message.content);
      
      if (Array.isArray(result.chunks) && result.chunks.length > 0) {
        return result.chunks;
      }
      
      // Fallback to simple splitting if AI fails
      return this._simpleSplitMessage(content);
    } catch (error) {
      console.error('Error splitting message with AI:', error);
      // Fallback to simple splitting
      return this._simpleSplitMessage(content);
    }
  }

  /**
   * Split a message using a simple algorithm
   * @param {string} content - Message content
   * @returns {string[]} Array of message parts
   * @private
   */
  _simpleSplitMessage(content) {
    const parts = [];
    let remaining = content;
    
    while (remaining.length > 0) {
      if (remaining.length <= MAX_MESSAGE_LENGTH) {
        parts.push(remaining);
        break;
      }
      
      // Find a good split point
      let splitPoint = MAX_MESSAGE_LENGTH;
      
      // Try to split at a newline
      const lastNewline = remaining.lastIndexOf('\n', MAX_MESSAGE_LENGTH);
      if (lastNewline > MAX_MESSAGE_LENGTH * 0.5) {
        splitPoint = lastNewline + 1; // Include the newline
      } else {
        // Try to split at a period, question mark, or exclamation mark
        const lastPeriod = Math.max(
          remaining.lastIndexOf('. ', MAX_MESSAGE_LENGTH),
          remaining.lastIndexOf('? ', MAX_MESSAGE_LENGTH),
          remaining.lastIndexOf('! ', MAX_MESSAGE_LENGTH)
        );
        
        if (lastPeriod > MAX_MESSAGE_LENGTH * 0.5) {
          splitPoint = lastPeriod + 2; // Include the period and space
        } else {
          // Try to split at a space
          const lastSpace = remaining.lastIndexOf(' ', MAX_MESSAGE_LENGTH);
          if (lastSpace > MAX_MESSAGE_LENGTH * 0.5) {
            splitPoint = lastSpace + 1; // Include the space
          }
          // Otherwise, just split at the max length
        }
      }
      
      parts.push(remaining.substring(0, splitPoint));
      remaining = remaining.substring(splitPoint);
    }
    
    return parts;
  }

  /**
   * Safely reply to a message
   * @param {Message} message - Discord message
   * @param {string} content - Reply content
   * @returns {Promise<Message>} Sent message
   * @private
   */
  async _safeReply(message, content) {
    try {
      return await message.reply(content);
    } catch (error) {
      console.error('Error replying to message:', error);
      try {
        return await message.channel.send(content);
      } catch (channelError) {
        console.error('Error sending to channel:', channelError);
        return null;
      }
    }
  }

  /**
   * Check if a user is on cooldown
   * @param {string} userId - User ID
   * @returns {boolean} Whether the user is on cooldown
   * @private
   */
  _isOnCooldown(userId) {
    if (!this.cooldowns.has(userId)) {
      return false;
    }
    
    const cooldownTime = this.cooldowns.get(userId);
    return Date.now() < cooldownTime;
  }

  /**
   * Apply cooldown to a user
   * @param {string} userId - User ID
   * @private
   */
  _applyCooldown(userId) {
    const cooldownTime = Date.now() + config.discord.messageRateLimit;
    this.cooldowns.set(userId, cooldownTime);
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    try {
      // Stop all collectors
      for (const [channelId, collector] of this.activeCollectors.entries()) {
        collector.stop();
      }
      
      // Clear all maps
      this.activeCollectors.clear();
      this.userAIAssignments.clear();
      this.channelAssignments.clear();
      this.cooldowns.clear();
      
      // Logout from Discord
      if (this.client) {
        await this.client.destroy();
      }
      
      this.initialized = false;
      console.log('Discord interface resources cleaned up');
    } catch (error) {
      console.error('Failed to clean up Discord interface resources:', error);
    }
  }
}

// Create and export a singleton instance
const discordInterface = new DiscordInterface();
export default discordInterface;

