import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { Groq } from 'groq-sdk';
import { v4 as uuidv4 } from 'uuid';
import config from '../config.js';
import memoryManager from '../memory/memoryManager.js';
import contextManager, { ContextMessage } from '../context/contextManager.js';

/**
 * Class managing the Discord interface
 */
class DiscordInterface {
  constructor() {
    this.client = null;
    this.groq = new Groq({ apiKey: config.api.groq.apiKey });
    this.messageQueue = [];
    this.processingQueue = false;
    this.activeCollectors = new Map(); // Map of channelId to collector
    this.cooldowns = new Map(); // For rate limiting
    this.channelConversations = new Map(); // Map of channelId to conversationId
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
          GatewayIntentBits.DirectMessages
        ],
        partials: [
          Partials.Channel,
          Partials.Message
        ]
      });

      // Set up event handlers
      this._setupEventHandlers();

      // Login to Discord
      await this.client.login(config.discord.token);
      console.log(`Discord bot logged in as ${this.client.user.tag}`);
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
        if (message.author.bot) return;

        if (message.content.startsWith(config.discord.prefix)) {
          await this._handleCommand(message);
          return;
        }

        if (this.activeCollectors.has(message.channelId)) {
          await this._handleCollectedMessage(message);
          return;
        }

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
    const args = message.content.slice(config.discord.prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    switch (command) {
      case 'help':
        await this._showHelp(message);
        break;

      case 'new':
        await this._createNewConversation(message, args);
        break;

      case 'switch':
        await this._switchConversation(message, args);
        break;

      case 'list':
        await this._listConversations(message, args);
        break;

      case 'tag':
        await this._tagConversation(message, args);
        break;

      case 'status':
        await this._showConversationStatus(message);
        break;

      default:
        await this._safeReply(message, `Unknown command: ${command}. Type \`${config.discord.prefix}help\` for a list of commands.`);
    }
  }

  /**
   * Get or create conversation ID for a channel
   * @param {string} channelId - Discord channel ID
   * @returns {string} Conversation ID
   * @private
   */
  _getConversationId(channelId) {
    if (!this.channelConversations.has(channelId)) {
      const conversationId = `discord-${channelId}-${Date.now()}`;
      this.channelConversations.set(channelId, conversationId);
      contextManager.createOrSwitchConversation(conversationId, ['discord', 'auto-created']);
    }
    return this.channelConversations.get(channelId);
  }

  /**
   * Create a new conversation
   * @param {Message} message - Discord message
   * @param {string[]} args - Command arguments (tags)
   * @private
   */
  async _createNewConversation(message, args) {
    try {
      const tags = args.length > 0 ? ['discord', ...args] : ['discord'];
      const conversationId = `discord-${message.channel.id}-${uuidv4()}`;

      contextManager.createOrSwitchConversation(conversationId, tags, {
        channelId: message.channel.id,
        channelName: message.channel.name,
        guildId: message.guild?.id,
        createdBy: message.author.id
      });

      this.channelConversations.set(message.channel.id, conversationId);

      await this._safeReply(message, `✅ Created new conversation: \`${conversationId}\`\nTags: ${tags.join(', ')}`);
    } catch (error) {
      console.error('Error creating new conversation:', error);
      await this._safeReply(message, 'Failed to create new conversation.');
    }
  }

  /**
   * Switch to an existing conversation
   * @param {Message} message - Discord message
   * @param {string[]} args - Command arguments (conversationId)
   * @private
   */
  async _switchConversation(message, args) {
    try {
      if (args.length === 0) {
        await this._safeReply(message, 'Please provide a conversation ID to switch to.');
        return;
      }

      const conversationId = args[0];
      const conversation = contextManager.getConversation(conversationId);

      if (!conversation) {
        await this._safeReply(message, `Conversation \`${conversationId}\` not found.`);
        return;
      }

      contextManager.createOrSwitchConversation(conversationId);
      this.channelConversations.set(message.channel.id, conversationId);

      await this._safeReply(message, `✅ Switched to conversation: \`${conversationId}\`\nTags: ${conversation.tags.join(', ')}\nMessages: ${conversation.messages.length}`);
    } catch (error) {
      console.error('Error switching conversation:', error);
      await this._safeReply(message, 'Failed to switch conversation.');
    }
  }

  /**
   * List conversations
   * @param {Message} message - Discord message
   * @param {string[]} args - Command arguments (optional tag filter)
   * @private
   */
  async _listConversations(message, args) {
    try {
      const tagFilter = args.length > 0 ? [args[0]] : [];
      const conversations = contextManager.listConversations(tagFilter, 10);

      if (conversations.length === 0) {
        await this._safeReply(message, 'No conversations found.');
        return;
      }

      let response = '**Recent Conversations:**\n';
      for (const conv of conversations) {
        const isActive = this.channelConversations.get(message.channel.id) === conv.id;
        const activeMarker = isActive ? '🔸' : '🔹';
        const shortId = conv.id.split('-').pop().substring(0, 8);
        response += `${activeMarker} \`${shortId}\` - ${conv.tags.join(', ')} (${conv.messages.length} msgs)\n`;
      }

      await this._safeReply(message, response);
    } catch (error) {
      console.error('Error listing conversations:', error);
      await this._safeReply(message, 'Failed to list conversations.');
    }
  }

  /**
   * Tag current conversation
   * @param {Message} message - Discord message
   * @param {string[]} args - Command arguments (add/remove, tags...)
   * @private
   */
  async _tagConversation(message, args) {
    try {
      if (args.length < 2) {
        await this._safeReply(message, `Usage: \`${config.discord.prefix}tag <add|remove> <tags...>\``);
        return;
      }

      const action = args[0].toLowerCase();
      const tags = args.slice(1);
      const conversationId = this._getConversationId(message.channel.id);

      if (action === 'add') {
        contextManager.addConversationTags(conversationId, tags);
        await this._safeReply(message, `✅ Added tags: ${tags.join(', ')}`);
      } else if (action === 'remove') {
        contextManager.removeConversationTags(conversationId, tags);
        await this._safeReply(message, `✅ Removed tags: ${tags.join(', ')}`);
      } else {
        await this._safeReply(message, 'Action must be either \'add\' or \'remove\'.');
      }
    } catch (error) {
      console.error('Error tagging conversation:', error);
      await this._safeReply(message, 'Failed to tag conversation.');
    }
  }

  /**
   * Show conversation status
   * @param {Message} message - Discord message
   * @private
   */
  async _showConversationStatus(message) {
    try {
      const conversationId = this._getConversationId(message.channel.id);
      const conversation = contextManager.getConversation(conversationId);

      if (!conversation) {
        await this._safeReply(message, 'No active conversation found.');
        return;
      }

      const shortId = conversationId.split('-').pop().substring(0, 8);
      const response = `**Current Conversation Status:**\n` +
        `ID: \`${shortId}\`\n` +
        `Tags: ${conversation.tags.join(', ')}\n` +
        `Messages: ${conversation.messages.length}\n` +
        `Created: ${conversation.createdAt.toLocaleString()}\n` +
        `Last Active: ${conversation.lastActiveAt.toLocaleString()}`;

      await this._safeReply(message, response);
    } catch (error) {
      console.error('Error showing conversation status:', error);
      await this._safeReply(message, 'Failed to show conversation status.');
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

\`${config.discord.prefix}help\` - Show this help message
\`${config.discord.prefix}new [tags...]\` - Create a new conversation with optional tags
\`${config.discord.prefix}switch <conversationId>\` - Switch to an existing conversation
\`${config.discord.prefix}list [tag]\` - List conversations (optionally filtered by tag)
\`${config.discord.prefix}tag <add|remove> <tags...>\` - Add or remove tags from current conversation
\`${config.discord.prefix}status\` - Show current conversation status

You can also mention me in any message to get a response.
**Note:** Each Discord channel maintains its own conversation context.
`;

    await this._safeReply(message, helpText);
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
   * Handle a message directed at the bot via mention
   * @param {Message} message - Discord message
   * @private
   */
  async _handleMention(message) {
    try {
      const userMessage = message.content.replace(/<@!?(\d+)>/, '').trim();
      const conversationId = this._getConversationId(message.channel.id);

      const contextMessage = new ContextMessage({
        content: userMessage,
        role: 'user',
        userId: message.author.id,
        conversationId: conversationId
      });
      contextManager.addContextMessage(contextMessage);

      const aiResponse = await this._generateAIResponse(userMessage, conversationId);

      const aiContextMessage = new ContextMessage({
        content: aiResponse,
        role: 'assistant',
        conversationId: conversationId
      });
      contextManager.addContextMessage(aiContextMessage);

      await this._safeReply(message, aiResponse);
    } catch (error) {
      console.error('Error handling mention:', error);
      await this._safeReply(message, 'Sorry, I encountered an error processing your message.');
    }
  }

  /**
   * Generate AI response using Groq
   * @param {string} userMessage - User's message
   * @param {string} conversationId - Conversation ID
   * @returns {Promise<string>} AI response
   * @private
   */
  async _generateAIResponse(userMessage, conversationId) {
    const groqResponse = await this.groq.chat.completions.create({
      messages: contextManager.getFullContext(true, conversationId),
      model: config.api.groq.model,
      max_tokens: config.api.groq.maxTokens,
      temperature: config.api.groq.temperature
    });

    return groqResponse.choices[0].message.content.trim();
  }

  /**
   * Handle a collected message
   * @param {Message} message - Discord message
   * @private
   */
  async _handleCollectedMessage(message) {
    await this._handleMention(message);
  }

  async cleanup() {
    try {
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

const discordInterface = new DiscordInterface();
export default discordInterface;

