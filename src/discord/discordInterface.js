import { Client, GatewayIntentBits, Partials, MessageType, MessageFlags, TextChannel, ChannelType } from 'discord.js';
import { Groq } from 'groq-sdk';
import { setTimeout } from 'timers/promises';
import config from '../config.js';
import memoryManager from '../memory/memoryManager.js';
import contextManager from '../context/contextManager.js';
import scenarioManager from '../scenario/scenarioManager.js';
import timeManager from '../time/timeManager.js';
import agentManager from '../agents/agentManager.js';
import placeManager from '../places/placeManager.js';
import itemManager from '../items/itemManager.js';
import userManager from '../users/userManager.js';

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

      case 'item':
        await this._handleItemCommand(message, args);
        break;

      case 'map':
        await this._handleMapCommand(message, args);
        break;

      case 'user':
        await this._handleUserCommand(message, args);
        break;

      default:
        await this._safeReply(message, `Unknown command: \`${command}\`. Type \`${config.discord.prefix}help\` for a list of commands.`);
    }
  }

  /**
   * Handle User command
   * @param {Message} message - Discord message
   * @param {string[]} args - Command arguments
   * @private
   */
  async _handleUserCommand(message, args) {
    const discordId = message.author.id;
    const user = userManager.getUserByDiscordId(discordId);

    const subCommand = args[0]?.toLowerCase();

    switch (subCommand) {
      case undefined: {
        if (!user) {
          return message.reply("You don't have a profile yet. Use `!user create <name>` to make one.");
        }

        return message.reply(`👤 **Your Profile:**\n• Name: **${user.name}**\n• ID: \`${user.id}\`\n• Created: ${user.created}\n• Last Active: ${user.lastActive}`);
      }

      case "addrelationship": {
        if (!user) return message.reply("Create a profile first.");
        const [targetId, type] = [args[1], args[2]];
        if (!targetId || !type) return message.reply("Usage: `!user addrelationship <userId> <type>`");
      
        await this.userManager.createRelationship(user.id, targetId, { type, bidirectional: true });
        return message.reply(`🤝 Relationship with \`${targetId}\` set to "${type}".`);
      }      

      case "create": {
        if (user) {
          return message.reply("You already have a profile.");
        }

        const name = args.slice(1).join(' ').trim() || "Anonymous";
        const userId = await userManager.createUser({ name, discordId });

        return message.reply(`✅ User **${name}** created with ID \`${userId}\``);
      }

      case "update": {
        if (!user) return message.reply("You need to create a profile first.");

        const field = args[1];
        const value = args.slice(2).join(' ');

        if (!field || !value) {
          return message.reply("Usage: `!user update <field> <value>`");
        }

        const updates = {};
        updates[field] = value;

        await userManager.updateUser(user.id, updates);
        return message.reply(`✅ Updated **${field}** to \`${value}\``);
      }
      
      case "setlocation": {
        if (!user) return message.reply("You need to create a profile first.");
        const locationId = args[1];
        if (!locationId) return message.reply("Usage: `!user setlocation <placeId>`");
      
        await this.userManager.updateUserLocation(user.id, locationId);
        return message.reply(`📍 Moved you to \`${locationId}\``);
      }      

      case "homes": {
        if (!user) return message.reply("Create a profile first.");
        const homes = user.properties?.homes || [];
        return message.reply(
          homes.length ? `🏠 **Your Homes:**\n• ${homes.map(h => h.name).join('\n• ')}` : "🏠 You have no homes."
        );
      }      

      case "location": {
        if (!user) return message.reply("You need to create a profile first.");

        if (!user.currentLocation) {
          return message.reply("You are not currently in a place.");
        }

        const place = await this.placeManager.getPlace(user.currentLocation);
        return message.reply(`📍 You are at **${place.name}**\n${place.description}`);
      }

      case "inventory": {
        if (!user) return message.reply("You need to create a profile first.");

        const inventory = user.properties?.inventory || [];
        return message.reply(
          inventory.length
            ? `🎒 **Your Inventory:**\n• ${inventory.join('\n• ')}`
            : "🎒 Your inventory is empty."
        );
      }

      case "additem": {
        if (!user) return message.reply("You need to create a profile first.");
        const itemId = args[1];
        if (!itemId) return message.reply("Usage: `!user additem <itemId>`");

        const success = await userManager.addItemToInventory(user.id, itemId);
        return message.reply(success ? `✅ Added item \`${itemId}\` to your inventory.` : `⚠️ Item \`${itemId}\` is already in your inventory.`);
      }

      case "removeitem": {
        if (!user) return message.reply("You need to create a profile first.");
        const itemId = args[1];
        if (!itemId) return message.reply("Usage: `!user removeitem <itemId>`");

        await userManager.removeItemFromInventory(user.id, itemId);
        return message.reply(`✅ Removed item \`${itemId}\` from your inventory.`);
      }

      case "relationships": {
        if (!user) return message.reply("You need to create a profile first.");

        const relations = user.relationships || {};
        if (Object.keys(relations).length === 0) return message.reply("🤝 You have no relationships.");

        const list = Object.entries(relations).map(([id, r]) => `• With \`${id}\`: ${r.type} (${r.strength})`).join('\n');
        return message.reply(`🤝 **Your Relationships:**\n${list}`);
      }

      case "list": {
        const users = userManager.getAllUsers();
        const list = users.map(u => `\`${u.id}\`: ${u.name}`).join('\n');
        return message.reply(`📋 **All Users:**\n${list}`);
      }

      default:
        return message.reply("Unknown subcommand. Try `!user`, `!user create <name>`, `!user update <field> <value>`, `!user location`, `!user inventory`, `!user additem <id>`, `!user removeitem <id>`, `!user relationships`, or `!user list`.");
    }
  }

  /**
   * Handle Map command
   * @param {Message} message - Discord message
   * @param {string[]} args - Command arguments
   * @private
   */
  async _handleMapCommand(message, args) {
    const userId = message.author.id;
    const MAX_LENGTH = 1999;

    const smartReply = async (prefix, lines) => {
      const chunks = [];
      let currentChunk = prefix ? `${prefix}\n` : '';

      for (const line of lines) {
        if ((currentChunk + line + '\n').length > MAX_LENGTH) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
        currentChunk += line + '\n';
      }

      if (currentChunk.trim() !== '') {
        chunks.push(currentChunk.trim());
      }

      for (const chunk of chunks) {
        await message.reply(chunk);
      }
    };

    if (!args.length) {
      const agent = await agentManager.getAgent(this.userAIAssignments.get(userId));
      if (!agent || !agent.locationId) {
        return message.reply("You're not currently in any place. Use `!map go <placeId>` to travel.");
      }

      const place = await placeManager.getPlace(agent.locationId);
      return message.reply(`📍 You are currently at **${place.name}**\n${place.description}`);
    }

    const subCommand = args[0].toLowerCase();

    switch (subCommand) {
      case "list": {
        const places = await placeManager.searchPlaces({}, 50);
        const list = places.map(p => `\`${p.id}\`: ${p.name}`);
        return smartReply(`📜 **Available Places:**\n`, list);
      }

      case "go": {
        const destinationId = args[1];
        if (!destinationId) {
          return message.reply("Please specify a place ID: `!map go <placeId>`");
        }

        const result = await placeManager.moveAgentToPlace(this.userAIAssignments.get(userId), destinationId);
        if (!result.success) {
          return message.reply(`❌ ${result.message}`);
        }

        const place = result.place;
        return message.reply(`✅ You have traveled to **${place.name}**.\n${place.description}`);
      }

      case "nearby": {
        const agent = await agentManager.getAgent(this.userAIAssignments.get(userId));
        if (!agent || !agent.locationId) {
          return message.reply("You're not currently in a place. Use `!map go <placeId>`.");
        }

        const adjacent = await placeManager.getAdjacentPlaces(agent.locationId);
        if (!adjacent.length) {
          return message.reply("There are no nearby places.");
        }

        const descriptions = adjacent.map(({ place, connection }) =>
          `\`${place.id}\`: ${place.name} via ${connection.getFormattedDescription()}`
        );

        return smartReply(`🧭 **Connected Places:**\n`, descriptions);
      }

      case "info": {
        const agent = await agentManager.getAgent(this.userAIAssignments.get(userId));
        if (!agent || !agent.locationId) {
          return message.reply("You're not currently in a place.");
        }
  
        const info = await placeManager.getPlaceInfo(agent.locationId);
        const place = info.place;
  
        const lines = [
          `ℹ️ **${place.name}** (${place.type})`,
          place.description
        ];
  
        if (info.children.length) {
          lines.push('\n📁 **Sub-locations:**');
          lines.push(...info.children.map(c => `\`${c.id}\`: ${c.name} (${c.type})`));
        }
  
        if (info.connections.length) {
          lines.push('\n🔗 **Connections:**');
          lines.push(...info.connections.map(c => {
            const to = c.fromPlaceId === agent.locationId ? c.toPlaceId : c.fromPlaceId;
            const connectedPlace = placeManager.places.get(to);
            return connectedPlace ? `To **${connectedPlace.name}** via ${c.type}` : `To \`${to}\``;
          }));
        }
  
        if (info.agents.length) {
          lines.push('\n🧑‍🤝‍🧑 **Agents Here:**');
          lines.push(...info.agents.map(a => `• ${a.name}: ${a.description}`));
        }
  
        return smartReply(null, lines);
      }

      case 'help':
        return message.reply("Use `!map`, `!map list`, `!map go <placeId>`, `!map nearby`, or `!map info`.");

      default:
        return message.reply("Unknown subcommand. Try `!map`, `!map list`, `!map go <placeId>`, `!map nearby`, or `!map info`.");
    }
  }

  /**
   * Handle an item command message
   * @param {Message} message - Discord message
   * @param {string[]} args - Command arguments
   * @private
   */
  async _handleItemCommand(message, args) {
    const subcommand = args[0];
    const subargs = args[1];
    const params = args[2];
    /**
     * Blueprint Name: ${blueprintData.name}
        Description: ${blueprintData.description || 'None provided'}
        Item Type: ${blueprintData.itemType}
        Materials: ${JSON.stringify(blueprintData.materials || [])}
        Crafting Steps: ${JSON.stringify(blueprintData.craftingSteps || [])}
        Properties: ${JSON.stringify(blueprintData.properties || {})}
        Effects: ${JSON.stringify(blueprintData.effects || [])}
     */

    switch (subcommand) {
      case 'create':
      if (subargs === 'blueprint') {
        if (!args.slice(2).join(' ').trim()) {
          await this._safeReply(message, 'Please provide blueprint JSON.\nExample:\n```json\n' + JSON.stringify({
            name: "Example Blueprint",
            description: "Description here",
            itemType: "TECHNOLOGY",
            materials: [],
            craftingSteps: [],
            properties: { origin: "Core", rank: "Unique", usage: "Passive" },
            effects: [{ type: "absorption", description: "Example effect" }],
            requiredSkills: { "Engineering": 1 }
          }, null, 2) + '\n```\nItem types:\n```json\n' + JSON.stringify(Object.values(ItemType)) + '\n```');
          return;
        }
        const data = parseJsonInput(args.slice(2).join(' ').trim());
        const blueprint = await itemManager.createBlueprint(data);
        await this._safeReply(message, `✅ Created blueprint **${blueprint.name}** with ID \`${blueprint.id}\``);

      } else if (subargs === 'item') {
        if (!args.slice(2).join(' ').trim()) {
          await this._safeReply(message, 'Please provide item JSON.\nExample:\n```json\n' + JSON.stringify({
            name: "Example Item",
            description: "Item description",
            type: "TECHNOLOGY",
            effects: [{ type: "absorption", description: "Example" }],
            properties: { origin: "Core", rank: "Unique", usage: "Passive" },
            tags: ["core"],
            uses: -1,
            equippable: false
          }, null, 2) + '\n```\nItem types:\n```json\n' + JSON.stringify(Object.values(ItemType)) + '\n```');
          return;
        }
        const data = parseJsonInput(args.slice(2).join(' ').trim());
        const item = await itemManager.createItem(data);
        await this._safeReply(message, `✅ Created item **${item.name}** with ID \`${item.id}\``);

      } else {
        await this._safeReply(message, `Unknown creation type: \`${subargs}\`. Use \`blueprint\` or \`item\`.`);
      }
      break;

      case 'list':
        if (subargs === 'items') {
          const items = await itemManager.searchItems({}, 20);
          if (items.length === 0) return await this._safeReply(message, "No items found.");
          const list = items.map(i => `• \`${i.id}\` **${i.name}** [${i.type}]`).join('\n');
          await this._safeReply(message, `**Items:**\n${list}`);
        } else if (subargs === 'blueprints') {
          const blueprints = Array.from(itemManager.blueprints.values()).slice(0, 20);
          if (blueprints.length === 0) return await this._safeReply(message, "No blueprints found.");
          const list = blueprints.map(b => `• \`${b.id}\` **${b.name}** [${b.itemType}]`).join('\n');
          await this._safeReply(message, `**Blueprints:**\n${list}`);
        } else {
          await this._safeReply(message, `Usage: \`${config.discord.prefix}item list items\` or \`list blueprints\``);
        }
        break;

      case 'use':
        if (!subargs || !params) {
          await this._safeReply(message, `Usage: \`${config.discord.prefix}item use <itemId> <userId>\``);
          return;
        }
        let result = await itemManager.useItem(subargs, params);
        await this._safeReply(message, result.message);
        break;

      case 'view':
        if (!subargs) return await this._safeReply(message, 'Please specify an item or blueprint ID.');
        try {
          const details = await itemManager.getItemDetails(subargs);
          await this._safeReply(message, `**Item Details:**\n\`\`\`json\n${JSON.stringify(details, null, 2)}\n\`\`\``);
        } catch {
          try {
            const blueprint = await itemManager.getBlueprint(subargs);
            await this._safeReply(message, `**Blueprint Details:**\n\`\`\`json\n${JSON.stringify(blueprint.toJSON(), null, 2)}\n\`\`\``);
          } catch {
            await this._safeReply(message, 'Item or Blueprint not found.');
          }
        }
        break;
    
      case 'update':
        if (!subargs || !params) return await this._safeReply(message, 'Usage: `item update <itemId> <json>`');
        await itemManager.updateItem(subargs, parseJsonInput(params));
        await this._safeReply(message, `Item ${subargs} updated.`);
        break;
    
      case 'delete':
        if (!subargs) return await this._safeReply(message, 'Usage: `item delete <itemId|blueprintId>`');
        try {
          await itemManager.deleteItem(subargs);
          await this._safeReply(message, `Item ${subargs} deleted.`);
        } catch {
          try {
            await itemManager.deleteBlueprint(subargs);
            await this._safeReply(message, `Blueprint ${subargs} deleted.`);
          } catch (err) {
            await this._safeReply(message, `Error deleting: ${err.message}`);
          }
        }
        break;
    
      case 'transfer':
        const [itemId, key, value] = [subargs, args[2], args[3]];
        if (!itemId || !key || !value) {
          await this._safeReply(message, 'Usage: `item transfer <itemId> <toAgentId|toLocationId|toContainerId> <value>`');
          return;
        }
        await itemManager.transferItem(itemId, { [key]: value });
        await this._safeReply(message, `Item ${itemId} transferred to ${key}: ${value}`);
        break;
    
      // case 'use':
      //   if (!subargs || !params) return await this._safeReply(message, 'Usage: `item use <itemId> <userId>`');
      //   result = await itemManager.useItem(subargs, params);
      //   await this._safeReply(message, `**Use Result:**\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``);
      //   break;

      case 'help':
        await this._safeReply(message, `**Item Command Help**
\`${config.discord.prefix}item create blueprint <json>\` - Create a blueprint  
\`${config.discord.prefix}item create item <json>\` - Create an item  
\`${config.discord.prefix}item list items\` - List recent items  
\`${config.discord.prefix}item list blueprints\` - List recent blueprints  
\`${config.discord.prefix}item use <itemId> <userId>\` - Use an item`);
        break;

      default:
        await this._safeReply(message, `Unknown item command: \`${subcommand}\`. Type \`${config.discord.prefix}item help\` for a list of item commands.`);
    }

    /**
     * Parse JSON input
     * @param {string} input 
     * @returns {object}
     */
    function parseJsonInput(input) {
      const cleaned = input
        .trim()
        .replace(/^```(?:json)?\s*/i, '')   // remove opening ``` or ```json
        .replace(/\s*```$/, '');            // remove closing ```

      try {
        return JSON.parse(cleaned);
      } catch (e) {
        throw new Error(`\n  Invalid JSON input:\n\n    ${e.message}\n\n      Debug JSON:\n       ${cleaned}\n`);
      }
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
      
      // // Add conversation start to memory
      // await memoryManager.addMemory({
      //   content: `Started a conversation with ${message.author.username} on Discord.`,
      //   agentId,
      //   tags: ['conversation', 'discord'],
      //   keywords: ['discord', message.author.username],
      //   metadata: { channelId: message.channelId, userId: message.author.id }
      // });
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
      
      // Assign agent to user
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
      
      // Queue the response
      await this._queueMessage({
        content: response,
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

      if (!allAgentIds || allAgentIds.length > 2) {
        const agents = await Promise.all(
          allAgentIds.map(async id => {
            const agent = await agentManager.getAgent(id);
            return agent ? { id: agent.id, name: agent.name } : null;
          })
        );
    
        const cleanAgents = agents.filter(Boolean);
        const chatLog = [];
    
        // Initial user message to context
        await contextManager.addContextMessage({
          content: message.content,
          role: 'user',
          userId: message.author.id
        });
    
        chatLog.push(`**${message.author.username}**: ${message.content}`);
    
        const systemBase = [
          { role: 'system', content: `The user is ${message.author.username}. You are collaborating with other agents.` }
        ];
    
        const MAX_TURNS = 3;
        let needsUser = false;
    
        for (let i = 0; i < MAX_TURNS; i++) {
          for (const agent of cleanAgents) {
            const agentContext = [
              ...systemBase,
              ...chatLog.map(line => ({ role: 'assistant', content: line }))
            ];
    
            const response = await agentManager.generateAgentResponse(agent.id, {
              message: message.content,
              fromUserId: message.author.id,
              additionalContext: agentContext
            });
    
            const formatted = `**${agent.name}**: ${response}`;
            chatLog.push(formatted);
    
            if (response.toLowerCase().includes('[awaiting user]')) {
              needsUser = true;
              break;
            }
    
            await memoryManager.addMemory({
              content: `${agent.name} said: "${response}"`,
              agentId: agent.id,
              tags: ['internal-dialogue', 'multi-agent'],
              keywords: [agent.name],
              metadata: { channelId: message.channelId, userId: message.author.id }
            });
          }
    
          if (needsUser) break;
        }
    
        if (needsUser) {
          // Now respond to the user with the transcript
          const summaryHeader = `🧠 The agents have discussed the situation and await your input:\n\n`;
          const fullSummary = summaryHeader + chatLog.join('\n');
      
          await this._queueMessage({
            content: fullSummary,
            channelId: message.channelId,
            userId: message.author.id,
            reference: message.id
          });
              
          await scenarioManager.updateWorldState({
            lastUserMessage: message.content,
            lastAgentResponse: 'Agents completed internal discussion.'
          });
  
          await timeManager.advanceTime({ minutes: 1 });
          return;
        }
      }      

      await scenarioManager.updateWorldState({
        lastUserMessage: message.content,
        lastAgentResponse: `Agents responded: ${agentsToRespond.map(a => a.name).join(', ')}`
      });
    
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

