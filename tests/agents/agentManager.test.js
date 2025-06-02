/**
 * Agent Manager Tests
 * 
 * Tests for core Agent Manager functionality:
 * - Agent creation and updates
 * - Agent state management
 * - Emotional state handling
 * - Relationship management
 * - Inter-agent messaging
 * - Agent location tracking
 */

import { jest } from '@jest/globals';
import agentManager from '../../src/agents/agentManager.js';

// Mock the Groq API
jest.mock('groq-sdk', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: 'This is a mocked response from the AI agent.'
              }
            }
          ]
        })
      }
    }
  }));
});

// Mock file system operations
jest.mock('fs/promises', () => ({
  readFile: jest.fn().mockImplementation((path) => {
    if (path.includes('agents.json')) {
      return Promise.resolve(JSON.stringify([
        {
          id: 'agent-123',
          name: 'Alice',
          personality: 'Friendly and curious',
          description: 'A helpful assistant',
          state: {
            mood: 'happy',
            energy: 'high',
            location: 'library',
            inventory: ['book', 'pen']
          },
          emotions: {
            joy: 0.8,
            sadness: 0.1,
            anger: 0.0,
            fear: 0.1,
            surprise: 0.2
          },
          relationships: {
            'agent-456': {
              type: 'friend',
              strength: 0.7,
              history: ['Met at the library']
            }
          }
        },
        {
          id: 'agent-456',
          name: 'Bob',
          personality: 'Logical and precise',
          description: 'A knowledgeable guide',
          state: {
            mood: 'focused',
            energy: 'medium',
            location: 'office',
            inventory: ['glasses', 'notebook']
          },
          emotions: {
            joy: 0.5,
            sadness: 0.1,
            anger: 0.1,
            fear: 0.0,
            surprise: 0.1
          },
          relationships: {
            'agent-123': {
              type: 'colleague',
              strength: 0.6,
              history: ['Works together on research']
            }
          }
        }
      ]));
    } else {
      return Promise.reject(new Error('File not found'));
    }
  }),
  writeFile: jest.fn().mockResolvedValue(undefined),
  mkdir: jest.fn().mockResolvedValue(undefined),
  access: jest.fn().mockImplementation((path) => {
    if (path.includes('missing')) {
      return Promise.reject(new Error('File not found'));
    }
    return Promise.resolve();
  })
}));

// Mock Memory Manager
jest.mock('../../src/memory/memoryManager.js', () => ({
  addMemory: jest.fn().mockResolvedValue('mem-123456'),
  getRelevantMemories: jest.fn().mockResolvedValue([
    {
      id: 'mem-789012',
      content: 'Alice enjoys reading mystery novels',
      agentId: 'agent-123',
      timestamp: new Date().toISOString(),
      importance: 0.7,
      source: 'observation',
      keywords: ['Alice', 'reading', 'mystery', 'novels'],
      metadata: { location: 'library' },
      relevance: 0.85
    }
  ]),
  initialize: jest.fn().mockResolvedValue(true),
  cleanup: jest.fn().mockResolvedValue(true),
}));

// Mock Context Manager
jest.mock('../../src/context/contextManager.js', () => ({
  addMessage: jest.fn().mockResolvedValue(true),
  getContext: jest.fn().mockResolvedValue({
    messages: [
      {
        content: 'What kind of books do you like?',
        role: 'user',
        userId: 'user-123',
        timestamp: new Date().toISOString()
      },
      {
        content: 'I enjoy mystery novels, especially Agatha Christie.',
        role: 'assistant',
        agentId: 'agent-123',
        timestamp: new Date().toISOString()
      }
    ],
    summary: 'User asked about book preferences. Agent mentioned mystery novels.'
  }),
  initialize: jest.fn().mockResolvedValue(true),
  cleanup: jest.fn().mockResolvedValue(true),
}));

// Mock Scenario Manager
jest.mock('../../src/scenario/scenarioManager.js', () => ({
  getCurrentScenario: jest.fn().mockReturnValue({
    worldState: {
      time: '2025-01-01T12:00:00Z',
      location: 'Test City',
      events: ['book fair']
    },
    plots: [
      {
        id: 'plot-1',
        title: 'Book Fair Mystery',
        status: 'active'
      }
    ]
  }),
  updateWorldState: jest.fn().mockResolvedValue(true),
  initialize: jest.fn().mockResolvedValue(true),
  cleanup: jest.fn().mockResolvedValue(true),
}));

// Mock Time Manager
jest.mock('../../src/time/timeManager.js', () => ({
  getInUniverseTime: jest.fn().mockReturnValue('2025-01-01T12:00:00.000Z'),
  formatTime: jest.fn().mockReturnValue('2025-01-01 12:00:00'),
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

describe('Agent Manager', () => {
  // Setup and teardown
  beforeEach(async () => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Initialize agent manager with test config
    const testConfig = {
      agentsPath: '/test/agents',
      defaultAgentsFile: 'agents.json'
    };
    
    await agentManager.initialize(testConfig);
  });
  
  afterEach(async () => {
    // Cleanup after each test
    await agentManager.cleanup();
  });
  
  // Tests
  
  test('should initialize successfully and load agents', async () => {
    // Verify the agent manager is defined with expected methods
    expect(agentManager).toBeDefined();
    expect(agentManager.initialize).toBeDefined();
    expect(agentManager.getAgent).toBeDefined();
    expect(agentManager.createAgent).toBeDefined();
    expect(agentManager.updateAgent).toBeDefined();
    expect(agentManager.sendMessage).toBeDefined();
    expect(agentManager.updateAgentEmotion).toBeDefined();
    
    // Verify agents were loaded
    const agents = agentManager.getAllAgents();
    expect(agents).toHaveLength(2);
    
    const alice = agentManager.getAgent('agent-123');
    expect(alice).toBeDefined();
    expect(alice.name).toBe('Alice');
    expect(alice.state.location).toBe('library');
    
    const bob = agentManager.getAgent('agent-456');
    expect(bob).toBeDefined();
    expect(bob.name).toBe('Bob');
    expect(bob.personality).toBe('Logical and precise');
  });
  
  test('should create a new agent', async () => {
    // Create a new agent
    const newAgent = {
      name: 'Carol',
      personality: 'Creative and artistic',
      description: 'An imaginative designer',
      state: {
        mood: 'inspired',
        energy: 'high',
        location: 'studio',
        inventory: ['sketchbook', 'pencils']
      }
    };
    
    const agentId = await agentManager.createAgent(newAgent);
    
    // Verify the agent was created with an ID
    expect(agentId).toBeDefined();
    
    const carol = agentManager.getAgent(agentId);
    expect(carol).toBeDefined();
    expect(carol.name).toBe('Carol');
    expect(carol.state.location).toBe('studio');
    
    // Verify the event was emitted
    const eventEmitter = agentManager.getEventEmitter();
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'agentCreated',
      expect.objectContaining({ 
        id: agentId,
        name: 'Carol'
      })
    );
    
    // Verify the agent was saved
    const fs = require('fs/promises');
    expect(fs.writeFile).toHaveBeenCalled();
  });
  
  test('should update an existing agent', async () => {
    // Update an existing agent
    const updates = {
      description: 'An enthusiastic and curious researcher',
      state: {
        mood: 'excited',
        inventory: ['book', 'pen', 'notebook']
      }
    };
    
    await agentManager.updateAgent('agent-123', updates);
    
    // Verify the agent was updated
    const alice = agentManager.getAgent('agent-123');
    expect(alice.description).toBe('An enthusiastic and curious researcher');
    expect(alice.state.mood).toBe('excited');
    expect(alice.state.inventory).toContain('notebook');
    expect(alice.state.location).toBe('library'); // Unchanged
    
    // Verify the event was emitted
    const eventEmitter = agentManager.getEventEmitter();
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'agentUpdated',
      expect.objectContaining({ 
        id: 'agent-123',
        name: 'Alice'
      })
    );
  });
  
  test('should handle agent emotions correctly', async () => {
    // Update agent emotions
    const emotionChanges = {
      joy: 0.1,     // Increase
      sadness: 0.2,  // Increase
      anger: 0.0,    // No change
      fear: -0.05,   // Decrease
      surprise: 0.3  // Increase
    };
    
    await agentManager.updateAgentEmotion('agent-123', emotionChanges);
    
    // Verify emotions were updated
    const alice = agentManager.getAgent('agent-123');
    expect(alice.emotions.joy).toBe(0.9);      // 0.8 + 0.1
    expect(alice.emotions.sadness).toBe(0.3);  // 0.1 + 0.2
    expect(alice.emotions.anger).toBe(0.0);    // Unchanged
    expect(alice.emotions.fear).toBe(0.05);    // 0.1 - 0.05
    expect(alice.emotions.surprise).toBe(0.5); // 0.2 + 0.3
    
    // Verify the event was emitted
    const eventEmitter = agentManager.getEventEmitter();
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'agentEmotionChanged',
      expect.objectContaining({ 
        agentId: 'agent-123',
        changes: emotionChanges,
        newEmotions: alice.emotions
      })
    );
    
    // Verify agent state/mood was affected
    expect(alice.state.mood).not.toBe('happy'); // Should have changed based on emotion
  });
  
  test('should manage agent relationships', async () => {
    // Create a new relationship
    const relationship = {
      type: 'mentor',
      strength: 0.8,
      notes: 'Alice is teaching Carol about literature'
    };
    
    // First create Carol
    const carolId = await agentManager.createAgent({
      name: 'Carol',
      personality: 'Eager to learn',
      description: 'A new student',
      state: {
        mood: 'curious',
        location: 'library'
      }
    });
    
    // Add relationship from Alice to Carol
    await agentManager.updateAgentRelationship('agent-123', carolId, relationship);
    
    // Verify relationship was added
    const alice = agentManager.getAgent('agent-123');
    expect(alice.relationships[carolId]).toBeDefined();
    expect(alice.relationships[carolId].type).toBe('mentor');
    expect(alice.relationships[carolId].strength).toBe(0.8);
    
    // Verify the event was emitted
    const eventEmitter = agentManager.getEventEmitter();
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'relationshipUpdated',
      expect.objectContaining({ 
        sourceAgentId: 'agent-123',
        targetAgentId: carolId,
        relationship: expect.objectContaining({
          type: 'mentor',
          strength: 0.8
        })
      })
    );
    
    // Update an existing relationship
    await agentManager.updateAgentRelationship('agent-123', 'agent-456', {
      strength: 0.9,
      notes: 'Growing friendship'
    });
    
    // Verify relationship was updated
    expect(alice.relationships['agent-456'].strength).toBe(0.9);
    expect(alice.relationships['agent-456'].type).toBe('friend'); // Unchanged
  });
  
  test('should send messages between agents', async () => {
    // Mock the AI response for this test
    const groqClient = require('groq-sdk')();
    groqClient.chat.completions.create.mockResolvedValueOnce({
      choices: [{ 
        message: { 
          content: 'Hello Bob, I found an interesting book you might like.' 
        } 
      }]
    });
    
    // Send a message from Alice to Bob
    const messageContext = {
      intent: 'share book recommendation',
      mood: 'excited'
    };
    
    const response = await agentManager.sendMessage('agent-123', 'agent-456', messageContext);
    
    // Verify the message response
    expect(response).toBe('Hello Bob, I found an interesting book you might like.');
    
    // Verify Groq API was called with appropriate prompt
    expect(groqClient.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('Alice')
          })
        ])
      })
    );
    
    // Verify memory was created for the interaction
    const memoryManager = require('../../src/memory/memoryManager.js');
    expect(memoryManager.addMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('book'),
        agentId: 'agent-123',
        metadata: expect.objectContaining({
          recipient: 'agent-456'
        })
      })
    );
    
    // Verify the event was emitted
    const eventEmitter = agentManager.getEventEmitter();
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'messageSent',
      expect.objectContaining({ 
        fromAgentId: 'agent-123',
        toAgentId: 'agent-456',
        message: expect.stringContaining('book')
      })
    );
  });
  
  test('should track agent locations', async () => {
    // Update agent location
    await agentManager.moveAgent('agent-123', 'cafeteria');
    
    // Verify location was updated
    const alice = agentManager.getAgent('agent-123');
    expect(alice.state.location).toBe('cafeteria');
    
    // Verify the event was emitted
    const eventEmitter = agentManager.getEventEmitter();
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'agentMoved',
      expect.objectContaining({ 
        agentId: 'agent-123',
        from: 'library',
        to: 'cafeteria'
      })
    );
    
    // Verify memory was created for the move
    const memoryManager = require('../../src/memory/memoryManager.js');
    expect(memoryManager.addMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('moved'),
        agentId: 'agent-123',
        metadata: expect.objectContaining({
          from: 'library',
          to: 'cafeteria'
        })
      })
    );
  });
  
  test('should get agents by location', async () => {
    // First move both agents to the same location
    await agentManager.moveAgent('agent-123', 'cafeteria');
    await agentManager.moveAgent('agent-456', 'cafeteria');
    
    // Get agents at location
    const agentsAtCafeteria = agentManager.getAgentsByLocation('cafeteria');
    
    // Verify we get both agents
    expect(agentsAtCafeteria).toHaveLength(2);
    expect(agentsAtCafeteria[0].id).toBe('agent-123');
    expect(agentsAtCafeteria[1].id).toBe('agent-456');
    
    // Get agents at a different location
    const agentsAtLibrary = agentManager.getAgentsByLocation('library');
    expect(agentsAtLibrary).toHaveLength(0);
  });
  
  test('should manage agent inventory', async () => {
    // Add item to inventory
    await agentManager.addItemToInventory('agent-123', 'coffee cup');
    
    // Verify item was added
    const alice = agentManager.getAgent('agent-123');
    expect(alice.state.inventory).toContain('coffee cup');
    
    // Remove item from inventory
    await agentManager.removeItemFromInventory('agent-123', 'pen');
    
    // Verify item was removed
    expect(alice.state.inventory).not.toContain('pen');
    
    // Verify events were emitted
    const eventEmitter = agentManager.getEventEmitter();
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'inventoryChanged',
      expect.objectContaining({ 
        agentId: 'agent-123',
        action: 'added',
        item: 'coffee cup'
      })
    );
    
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'inventoryChanged',
      expect.objectContaining({ 
        agentId: 'agent-123',
        action: 'removed',
        item: 'pen'
      })
    );
  });
  
  test('should delete an agent', async () => {
    // Delete an agent
    await agentManager.deleteAgent('agent-456');
    
    // Verify agent was removed
    const agents = agentManager.getAllAgents();
    expect(agents).toHaveLength(1);
    expect(agentManager.getAgent('agent-456')).toBeUndefined();
    
    // Verify the event was emitted
    const eventEmitter = agentManager.getEventEmitter();
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'agentDeleted',
      expect.objectContaining({ 
        id: 'agent-456',
        name: 'Bob'
      })
    );
    
    // Verify relationships to this agent were updated
    const alice = agentManager.getAgent('agent-123');
    expect(alice.relationships['agent-456']).toBeUndefined();
  });
});

