/**
 * Discord Interface Tests
 * 
 * Tests for core Discord Interface functionality:
 * - Message handling
 * - Command processing
 * - AI response generation
 * - Message splitting
 * - Rate limiting
 * - Multi-agent conversations
 */

import { jest } from '@jest/globals';
import discordInterface from '../../src/discord/discordInterface.js';

// Mock Discord.js Client and components
jest.mock('discord.js', () => {
  // Create mock classes for Discord components
  class MockClient {
    constructor() {
      this.user = { id: 'bot-id', username: 'TestBot' };
      this.application = { commands: { create: jest.fn(), set: jest.fn() } };
      this.guilds = { cache: new Map() };
      this.login = jest.fn().mockResolvedValue('token');
      this.destroy = jest.fn().mockResolvedValue(true);
      this.on = jest.fn();
      this.once = jest.fn();
    }
  }
  
  class MockGuild {
    constructor(id, name) {
      this.id = id;
      this.name = name;
      this.channels = { cache: new Map() };
    }
  }
  
  class MockTextChannel {
    constructor(id, name) {
      this.id = id;
      this.name = name;
      this.send = jest.fn().mockImplementation(content => {
        return Promise.resolve({
          id: 'msg-' + Math.random().toString(36).substring(7),
          content: typeof content === 'string' ? content : content.content,
          edit: jest.fn(),
          delete: jest.fn(),
          channel: this
        });
      });
      this.type = 'GUILD_TEXT';
    }
  }
  
  class MockUser {
    constructor(id, username, bot = false) {
      this.id = id;
      this.username = username;
      this.bot = bot;
      this.send = jest.fn().mockImplementation(content => {
        return Promise.resolve({
          id: 'dm-' + Math.random().toString(36).substring(7),
          content: typeof content === 'string' ? content : content.content
        });
      });
    }
  }
  
  class MockMessage {
    constructor(options = {}) {
      this.id = options.id || 'msg-' + Math.random().toString(36).substring(7);
      this.content = options.content || '';
      this.author = options.author || new MockUser('user-123', 'TestUser');
      this.channel = options.channel || new MockTextChannel('channel-123', 'test-channel');
      this.guild = options.guild || new MockGuild('guild-123', 'TestGuild');
      this.mentions = {
        users: new Map(),
        has: jest.fn().mockReturnValue(false)
      };
      this.reply = jest.fn().mockImplementation(content => {
        return Promise.resolve({
          id: 'reply-' + Math.random().toString(36).substring(7),
          content: typeof content === 'string' ? content : content.content
        });
      });
      this.delete = jest.fn().mockResolvedValue(true);
      
      // Add any mentioned users to the mentions map
      if (options.mentions) {
        options.mentions.forEach(user => {
          this.mentions.users.set(user.id, user);
        });
        // Override the has method if there are mentions
        if (options.mentions.length > 0) {
          this.mentions.has = jest.fn().mockImplementation(id => {
            return options.mentions.some(user => user.id === id);
          });
        }
      }
    }
  }
  
  class MockMessageCollector {
    constructor() {
      this.on = jest.fn();
      this.stop = jest.fn();
    }
  }
  
  class MockCollection extends Map {
    find(predicate) {
      for (const [key, val] of this.entries()) {
        if (predicate(val)) {
          return val;
        }
      }
      return undefined;
    }
    
    filter(predicate) {
      const results = new MockCollection();
      for (const [key, val] of this.entries()) {
        if (predicate(val)) {
          results.set(key, val);
        }
      }
      return results;
    }
  }
  
  // Create a mock guild and channel
  const mockGuild = new MockGuild('guild-123', 'TestGuild');
  const mockChannel = new MockTextChannel('channel-123', 'test-channel');
  mockGuild.channels.cache.set(mockChannel.id, mockChannel);
  
  // Create a mock client and add the guild
  const mockClient = new MockClient();
  mockClient.guilds.cache.set(mockGuild.id, mockGuild);
  
  // Return the mock Discord.js module
  return {
    Client: jest.fn().mockImplementation(() => mockClient),
    Collection: MockCollection,
    MessageCollector: MockMessageCollector,
    MessageEmbed: jest.fn().mockImplementation(() => ({
      setTitle: jest.fn().mockReturnThis(),
      setDescription: jest.fn().mockReturnThis(),
      setColor: jest.fn().mockReturnThis(),
      addField: jest.fn().mockReturnThis(),
      setFooter: jest.fn().mockReturnThis(),
      setTimestamp: jest.fn().mockReturnThis()
    })),
    MessageActionRow: jest.fn().mockImplementation(() => ({
      addComponents: jest.fn().mockReturnThis()
    })),
    MessageButton: jest.fn().mockImplementation(() => ({
      setCustomId: jest.fn().mockReturnThis(),
      setLabel: jest.fn().mockReturnThis(),
      setStyle: jest.fn().mockReturnThis()
    })),
    Intents: {
      FLAGS: {
        GUILDS: 1,
        GUILD_MESSAGES: 2,
        GUILD_MEMBERS: 4,
        DIRECT_MESSAGES: 8
      }
    },
    PermissionFlagsBits: {
      SEND_MESSAGES: 1,
      READ_MESSAGE_HISTORY: 2
    },
    ApplicationCommandType: {
      CHAT_INPUT: 1,
      USER: 2,
      MESSAGE: 3
    },
    ApplicationCommandOptionType: {
      STRING: 3,
      INTEGER: 4,
      BOOLEAN: 5,
      USER: 6,
      CHANNEL: 7,
      ROLE: 8
    },
    TextChannel: MockTextChannel,
    User: MockUser,
    Message: MockMessage,
    mockClient,
    mockGuild,
    mockChannel
  };
});

// Mock Groq API for response generation
jest.mock('groq-sdk', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: "Hello! I'm an AI assistant. How can I help you today?"
              }
            }
          ]
        })
      }
    }
  }));
});

// Mock all manager integrations
jest.mock('../../src/memory/memoryManager.js', () => ({
  addMemory: jest.fn().mockResolvedValue('mem-123456'),
  getRelevantMemories: jest.fn().mockResolvedValue([
    {
      id: 'mem-789012',
      content: 'User likes to talk about books',
      agentId: 'agent-123',
      timestamp: new Date().toISOString(),
      relevance: 0.85
    }
  ]),
  initialize: jest.fn().mockResolvedValue(true),
  cleanup: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../src/context/contextManager.js', () => ({
  addMessage: jest.fn().mockResolvedValue(true),
  getContext: jest.fn().mockResolvedValue({
    messages: [
      {
        content: 'Hello, how are you?',
        role: 'user',
        userId: 'user-123',
        timestamp: new Date().toISOString()
      }
    ],
    summary: ''
  }),
  getEnrichedContext: jest.fn().mockResolvedValue({
    messages: [
      {
        content: 'Hello, how are you?',
        role: 'user',
        userId: 'user-123',
        timestamp: new Date().toISOString()
      }
    ],
    relevantMemories: [
      {
        content: 'User likes to talk about books',
        relevance: 0.85
      }
    ]
  }),
  initialize: jest.fn().mockResolvedValue(true),
  cleanup: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../src/scenario/scenarioManager.js', () => ({
  getCurrentScenario: jest.fn().mockReturnValue({
    worldState: {
      time: '2025-01-01T12:00:00Z',
      location: 'TestCity',
      events: ['test-event']
    }
  }),
  updateWorldState: jest.fn().mockResolvedValue(true),
  initialize: jest.fn().mockResolvedValue(true),
  cleanup: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../src/time/timeManager.js', () => ({
  getInUniverseTime: jest.fn().mockReturnValue('2025-01-01T12:00:00.000Z'),
  formatTime: jest.fn().mockReturnValue('2025-01-01 12:00:00'),
  setTimeScale: jest.fn().mockResolvedValue(true),
  fastForward: jest.fn().mockResolvedValue({
    from: '2025-01-01T12:00:00.000Z',
    to: '2025-01-01T18:00:00.000Z'
  }),
  initialize: jest.fn().mockResolvedValue(true),
  cleanup: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../src/agents/agentManager.js', () => ({
  getAgent: jest.fn().mockImplementation((agentId) => {
    if (agentId === 'agent-123') {
      return {
        id: 'agent-123',
        name: 'Alice',
        personality: 'Friendly and helpful',
        description: 'A knowledgeable assistant',
        state: {
          mood: 'happy',
          location: 'place-1'
        }
      };
    } else if (agentId === 'agent-456') {
      return {
        id: 'agent-456',
        name: 'Bob',
        personality: 'Logical and precise',
        description: 'A technical guide',
        state: {
          mood: 'focused',
          location: 'place-2'
        }
      };
    }
    return null;
  }),
  getAllAgents: jest.fn().mockReturnValue([
    {
      id: 'agent-123',
      name: 'Alice',
      personality: 'Friendly and helpful'
    },
    {
      id: 'agent-456',
      name: 'Bob',
      personality: 'Logical and precise'
    }
  ]),
  createAgent: jest.fn().mockResolvedValue('agent-789'),
  updateAgent: jest.fn().mockResolvedValue(true),
  sendMessage: jest.fn().mockResolvedValue('Hello, how can I help you?'),
  initialize: jest.fn().mockResolvedValue(true),
  cleanup: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../src/places/placeManager.js', () => ({
  getPlace: jest.fn().mockImplementation((placeId) => {
    if (placeId === 'place-1') {
      return {
        id: 'place-1',
        name: 'Library',
        description: 'A quiet place with many books'
      };
    }
    return null;
  }),
  getAllPlaces: jest.fn().mockReturnValue([
    {
      id: 'place-1',
      name: 'Library',
      description: 'A quiet place with many books'
    },
    {
      id: 'place-2',
      name: 'Cafeteria',
      description: 'A place to eat and socialize'
    }
  ]),
  initialize: jest.fn().mockResolvedValue(true),
  cleanup: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../src/items/itemManager.js', () => ({
  getItem: jest.fn().mockImplementation((itemId) => {
    if (itemId === 'item-1') {
      return {
        id: 'item-1',
        name: 'Book',
        description: 'A useful reference'
      };
    }
    return null;
  }),
  initialize: jest.fn().mockResolvedValue(true),
  cleanup: jest.fn().mockResolvedValue(true),
}));

// Mock event emitter
jest.mock('events', () => {
  return {
    EventEmitter: jest.fn().mockImplementation(() => ({
      emit: jest.fn(),
      on: jest.fn(),
      once: jest.fn(),
      removeListener: jest.fn(),
      removeAllListeners: jest.fn(),
    })),
  };
});

// Mock the setTimeout function
jest.useFakeTimers();

describe('Discord Interface', () => {
  // Mock data for testing
  const mockUser = { id: 'user-123', username: 'TestUser', bot: false };
  const mockBotUser = { id: 'bot-id', username: 'TestBot', bot: true };
  const mockAgentId = 'agent-123';
  const mockChannelId = 'channel-123';
  
  // Setup and teardown
  beforeEach(async () => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Initialize discord interface with test config
    const testConfig = {
      token: 'test-token',
      clientId: 'test-client-id',
      prefix: '!',
      messageRateLimit: 100, // Fast for testing
      maxRetries: 2
    };
    
    await discordInterface.initialize(testConfig);
  });
  
  afterEach(async () => {
    // Cleanup after each test
    await discordInterface.cleanup();
  });
  
  // Tests
  
  test('should initialize successfully and connect to Discord', async () => {
    // Verify the discord interface is defined with expected methods
    expect(discordInterface).toBeDefined();
    expect(discordInterface.initialize).toBeDefined();
    expect(discordInterface.handleMessage).toBeDefined();
    expect(discordInterface.sendResponse).toBeDefined();
    
    // Verify Discord client was initialized and logged in
    const discord = require('discord.js');
    expect(discord.Client).toHaveBeenCalled();
    expect(discord.mockClient.login).toHaveBeenCalledWith('test-token');
    
    // Verify event handlers were set up
    expect(discord.mockClient.on).toHaveBeenCalledWith('ready', expect.any(Function));
    expect(discord.mockClient.on).toHaveBeenCalledWith('messageCreate', expect.any(Function));
  });
  
  test('should handle a basic message from a user', async () => {
    // Create a mock message
    const discord = require('discord.js');
    const mockMessage = new discord.Message({
      content: 'Hello Alice',
      author: mockUser,
      mentions: [{ id: 'agent-123', username: 'Alice' }]
    });
    
    // Get the messageCreate handler
    const messageCreateHandler = discord.mockClient.on.mock.calls.find(
      call => call[0] === 'messageCreate'
    )[1];
    
    // Call the handler with our mock message
    await messageCreateHandler(mockMessage);
    
    // Verify context was updated
    const contextManager = require('../../src/context/contextManager.js');
    expect(contextManager.addMessage).toHaveBeenCalledWith(
      expect.any(String), // Conversation ID
      expect.objectContaining({
        content: 'Hello Alice',
        role: 'user',
        userId: 'user-123'
      })
    );
    
    // Verify agent manager was called to generate a response
    const agentManager = require('../../src/agents/agentManager.js');
    expect(agentManager.sendMessage).toHaveBeenCalled();
    
    // Verify a response was sent
    expect(mockMessage.reply).toHaveBeenCalled();
  });
  
  test('should process a command', async () => {
    // Create a mock message with a command
    const discord = require('discord.js');
    const mockMessage = new discord.Message({
      content: '!help',
      author: mockUser
    });
    
    // Spy on the command handlers
    const helpCommandSpy = jest.spyOn(discordInterface, 'handleHelpCommand');
    
    // Get the messageCreate handler
    const messageCreateHandler = discord.mockClient.on.mock.calls.find(
      call => call[0] === 'messageCreate'
    )[1];
    
    // Call the handler with our mock message
    await messageCreateHandler(mockMessage);
    
    // Verify the help command handler was called
    expect(helpCommandSpy).toHaveBeenCalled();
    
    // Verify a response was sent
    expect(mockMessage.reply).toHaveBeenCalled();
    
    // Restore the spy
    helpCommandSpy.mockRestore();
  });
  
  test('should handle the agent assignment command', async () => {
    // Create a mock message with the assign command
    const discord = require('discord.js');
    const mockMessage = new discord.Message({
      content: '!assign Alice',
      author: mockUser
    });
    
    // Spy on the command handler
    const assignCommandSpy = jest.spyOn(discordInterface, 'handleAssignCommand');
    
    // Get the messageCreate handler
    const messageCreateHandler = discord.mockClient.on.mock.calls.find(
      call => call[0] === 'messageCreate'
    )[1];
    
    // Call the handler with our mock message
    await messageCreateHandler(mockMessage);
    
    // Verify the assign command handler was called
    expect(assignCommandSpy).toHaveBeenCalled();
    
    // Verify the user was assigned the correct agent
    expect(discordInterface.getUserAssignedAgent('user-123', 'channel-123')).toBe('agent-123');
    
    // Verify a confirmation response was sent
    expect(mockMessage.reply).toHaveBeenCalledWith(
      expect.stringContaining('assigned')
    );
    
    // Restore the spy
    assignCommandSpy.mockRestore();
  });
  
  test('should handle the time command', async () => {
    // Create a mock message with the time command
    const discord = require('discord.js');
    const mockMessage = new discord.Message({
      content: '!time',
      author: mockUser
    });
    
    // Spy on the command handler
    const timeCommandSpy = jest.spyOn(discordInterface, 'handleTimeCommand');
    
    // Get the messageCreate handler
    const messageCreateHandler = discord.mockClient.on.mock.calls.find(
      call => call[0] === 'messageCreate'
    )[1];
    
    // Call the handler with our mock message
    await messageCreateHandler(mockMessage);
    
    // Verify the time command handler was called
    expect(timeCommandSpy).toHaveBeenCalled();
    
    // Verify the time manager was called
    const timeManager = require('../../src/time/timeManager.js');
    expect(timeManager.getInUniverseTime).toHaveBeenCalled();
    expect(timeManager.formatTime).toHaveBeenCalled();
    
    // Verify a response with the time was sent
    expect(mockMessage.reply).toHaveBeenCalledWith(
      expect.stringContaining('2025-01-01 12:00:00')
    );
    
    // Restore the spy
    timeCommandSpy.mockRestore();
  });
  
  test('should split long messages into multiple parts', async () => {
    // Mock a very long response from the agent
    const agentManager = require('../../src/agents/agentManager.js');
    const longResponse = 'A'.repeat(3000); // Longer than Discord's 2000 character limit
    agentManager.sendMessage.mockResolvedValueOnce(longResponse);
    
    // Create a mock message
    const discord = require('discord.js');
    const mockMessage = new discord.Message({
      content: 'Hello Alice',
      author: mockUser,
      mentions: [{ id: 'agent-123', username: 'Alice' }]
    });
    
    // Get the messageCreate handler
    const messageCreateHandler = discord.mockClient.on.mock.calls.find(
      call => call[0] === 'messageCreate'
    )[1];
    
    // Call the handler with our mock message
    await messageCreateHandler(mockMessage);
    
    // Verify multiple messages were sent (the response was split)
    expect(mockMessage.reply).toHaveBeenCalledTimes(2);
  });
  
  test('should handle rate limiting', async () => {
    // Create multiple mock messages in quick succession
    const discord = require('discord.js');
    const mockMessage1 = new discord.Message({
      content: 'Hello Alice',
      author: mockUser,
      mentions: [{ id: 'agent-123', username: 'Alice' }]
    });
    
    const mockMessage2 = new discord.Message({
      content: 'How are you?',
      author: mockUser,
      mentions: [{ id: 'agent-123', username: 'Alice' }]
    });
    
    // Get the messageCreate handler
    const messageCreateHandler = discord.mockClient.on.mock.calls.find(
      call => call[0] === 'messageCreate'
    )[1];
    
    // Call the handler with our first mock message
    const promise1 = messageCreateHandler(mockMessage1);
    
    // Immediately call the handler with the second message
    const promise2 = messageCreateHandler(mockMessage2);
    
    // Wait for both promises to resolve
    await Promise.all([promise1, promise2]);
    
    // Verify both messages were eventually processed
    expect(mockMessage1.reply).toHaveBeenCalled();
    expect(mockMessage2.reply).toHaveBeenCalled();
    
    // The second message should have been delayed due to rate limiting
    const agentManager = require('../../src/agents/agentManager.js');
    expect(agentManager.sendMessage).toHaveBeenCalledTimes(2);
  });
  
  test('should handle multi-agent conversations', async () => {
    // Assign an agent to the user
    discordInterface.setUserAssignedAgent('user-123', 'channel-123', 'agent-123');
    
    // Create mock messages mentioning different agents
    const discord = require('discord.js');
    const mockMessage1 = new discord.Message({
      content: 'Hello Alice',
      author: mockUser,
      mentions: [{ id: 'agent-123', username: 'Alice' }]
    });
    
    const mockMessage2 = new discord.Message({
      content: 'Hello Bob',
      author: mockUser,
      mentions: [{ id: 'agent-456', username: 'Bob' }]
    });
    
    // Get the messageCreate handler
    const messageCreateHandler = discord.mockClient.on.mock.calls.find(
      call => call[0] === 'messageCreate'
    )[1];
    
    // Process both messages
    await messageCreateHandler(mockMessage1);
    await messageCreateHandler(mockMessage2);
    
    // Verify both agents were invoked
    const agentManager = require('../../src/agents/agentManager.js');
    expect(agentManager.sendMessage).toHaveBeenCalledWith(
      'agent-123',
      expect.any(String),
      expect.any(Object)
    );
    expect(agentManager.sendMessage).toHaveBeenCalledWith(
      'agent-456',
      expect.any(String),
      expect.any(Object)
    );
    
    // Verify both agents responded
    expect(mockMessage1.reply).toHaveBeenCalled();
    expect(mockMessage2.reply).toHaveBeenCalled();
  });
  
  test('should create conversation collectors for users', async () => {
    // Mock the createMessageCollector method
    const mockCollector = {
      on: jest.fn(),
      stop: jest.fn()
    };
    const discord = require('discord.js');
    discord.mockChannel.createMessageCollector = jest.fn().mockReturnValue(mockCollector);
    
    // Trigger collector creation with a message
    const mockMessage = new discord.Message({
      content: 'Hello Alice',
      author: mockUser,
      mentions: [{ id: 'agent-123', username: 'Alice' }]
    });
    
    // Get the messageCreate handler
    const messageCreateHandler = discord.mockClient.on.mock.calls.find(
      call => call[0] === 'messageCreate'
    )[1];
    
    // Call the handler with our mock message
    await messageCreateHandler(mockMessage);
    
    // Verify a collector was created
    expect(discord.mockChannel.createMessageCollector).toHaveBeenCalled();
    
    // Verify collector event handlers were set up
    expect(mockCollector.on).toHaveBeenCalledWith('collect', expect.any(Function));
    expect(mockCollector.on).toHaveBeenCalledWith('end', expect.any(Function));
    
    // Simulate a collector event
    const collectHandler = mockCollector.on.mock.calls.find(
      call => call[0] === 'collect'
    )[1];
    
    // Create a follow-up message
    const followUpMessage = new discord.Message({
      content: 'What time is it?',
      author: mockUser
    });
    
    // Trigger the collect handler
    await collectHandler(followUpMessage);
    
    // Verify the follow-up message was processed
    const contextManager = require('../../src/context/contextManager.js');
    expect(contextManager.addMessage).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        content: 'What time is it?',
        role: 'user'
      })
    );
    
    // Verify a response was generated
    expect(followUpMessage.reply).toHaveBeenCalled();
  });
  
  test('should use AI to decide how to split long messages', async () => {
    // Mock the Groq API to return a split suggestion
    const groqClient = require('groq-sdk')();
    groqClient.chat.completions.create.mockResolvedValueOnce({
      choices: [{ 
        message: { 
          content: JSON.stringify({
            parts: [
              "This is the first part of the message.",
              "This is the second part of the message."
            ]
          })
        } 
      }]
    });
    
    // Mock a long response that needs to be split
    const longResponse = 'A'.repeat(3000);
    
    // Call the smart split method
    const parts = await discordInterface.smartSplitMessage(longResponse);
    
    // Verify the Groq API was called for splitting
    expect(groqClient.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('split')
          })
        ])
      })
    );
    
    // Verify we got the expected parts
    expect(parts).toEqual([
      "This is the first part of the message.",
      "This is the second part of the message."
    ]);
  });
  
  test('should handle cleanup properly', async () => {
    // Call cleanup
    await discordInterface.cleanup();
    
    // Verify Discord client was destroyed
    const discord = require('discord.js');
    expect(discord.mockClient.destroy).toHaveBeenCalled();
    
    // Verify active collectors were stopped
    const mockCollector = {
      on: jest.fn(),
      stop: jest.fn()
    };
    discord.mockChannel.createMessageCollector = jest.fn().mockReturnValue(mockCollector);
    
    // Create a collector
    const mockMessage = new discord.Message({
      content: 'Hello',
      author: mockUser
    });
    
    // Get the messageCreate handler
    const messageCreateHandler = discord.mockClient.on.mock.calls.find(
      call => call[0] === 'messageCreate'
    )[1];
    
    // Call the handler with our mock message to create a collector
    await messageCreateHandler(mockMessage);
    
    // Call cleanup again
    await discordInterface.cleanup();
    
    // Verify the collector was stopped
    expect(mockCollector.stop).toHaveBeenCalled();
  });
});

