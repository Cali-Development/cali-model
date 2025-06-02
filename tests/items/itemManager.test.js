/**
 * Item Manager Tests
 * 
 * Tests for core Item Manager functionality:
 * - Item creation and updates
 * - Blueprint management
 * - Item ownership and transfers
 * - Item conditions and uses
 * - Container items
 * - Item validation with AI
 */

import { jest } from '@jest/globals';
import itemManager from '../../src/items/itemManager.js';

// Mock the Groq API for item validation
jest.mock('groq-sdk', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  valid: true,
                  feedback: "This item is valid within the game world context.",
                  suggestedProperties: {}
                })
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
    if (path.includes('items.json')) {
      return Promise.resolve(JSON.stringify({
        blueprints: [
          {
            id: 'blueprint-1',
            name: 'Book',
            description: 'A readable item containing information',
            category: 'literature',
            properties: {
              weight: 1,
              size: 'small',
              readable: true,
              value: 5
            },
            uses: [
              {
                name: 'read',
                effect: 'knowledge',
                targetType: 'agent'
              }
            ]
          },
          {
            id: 'blueprint-2',
            name: 'Bag',
            description: 'A container that can hold other items',
            category: 'container',
            properties: {
              weight: 2,
              size: 'medium',
              capacity: 10,
              value: 10
            },
            isContainer: true
          }
        ],
        items: [
          {
            id: 'item-1',
            blueprintId: 'blueprint-1',
            name: 'Mystery Novel',
            description: 'An exciting detective story',
            ownerId: 'agent-123',
            locationId: null,
            condition: 1.0,
            properties: {
              author: 'Agatha Christie',
              genre: 'mystery',
              pageCount: 320
            },
            containerId: null
          },
          {
            id: 'item-2',
            blueprintId: 'blueprint-1',
            name: 'Textbook',
            description: 'A comprehensive academic reference',
            ownerId: 'agent-456',
            locationId: null,
            condition: 0.8,
            properties: {
              author: 'Dr. Smith',
              genre: 'academic',
              pageCount: 500,
              subject: 'physics'
            },
            containerId: null
          },
          {
            id: 'item-3',
            blueprintId: 'blueprint-2',
            name: 'Backpack',
            description: 'A sturdy bag for carrying items',
            ownerId: 'agent-123',
            locationId: null,
            condition: 0.9,
            properties: {
              color: 'blue',
              pockets: 4,
              brand: 'TravelPro'
            },
            containerId: null,
            contents: []
          }
        ]
      }));
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

// Mock Agent Manager
jest.mock('../../src/agents/agentManager.js', () => ({
  getAgent: jest.fn().mockImplementation((agentId) => {
    if (agentId === 'agent-123') {
      return {
        id: 'agent-123',
        name: 'Alice',
        state: {
          location: 'place-1',
          inventory: ['item-1', 'item-3']
        }
      };
    } else if (agentId === 'agent-456') {
      return {
        id: 'agent-456',
        name: 'Bob',
        state: {
          location: 'place-2',
          inventory: ['item-2']
        }
      };
    }
    return null;
  }),
  addItemToInventory: jest.fn().mockResolvedValue(true),
  removeItemFromInventory: jest.fn().mockResolvedValue(true),
  initialize: jest.fn().mockResolvedValue(true),
  cleanup: jest.fn().mockResolvedValue(true),
}));

// Mock Place Manager
jest.mock('../../src/places/placeManager.js', () => ({
  getPlace: jest.fn().mockImplementation((placeId) => {
    if (placeId === 'place-1') {
      return {
        id: 'place-1',
        name: 'Library',
        properties: {
          resources: ['books', 'computers']
        }
      };
    } else if (placeId === 'place-2') {
      return {
        id: 'place-2',
        name: 'Cafeteria',
        properties: {
          resources: ['food', 'drinks']
        }
      };
    }
    return null;
  }),
  initialize: jest.fn().mockResolvedValue(true),
  cleanup: jest.fn().mockResolvedValue(true),
}));

// Mock Memory Manager
jest.mock('../../src/memory/memoryManager.js', () => ({
  addMemory: jest.fn().mockResolvedValue('mem-123456'),
  initialize: jest.fn().mockResolvedValue(true),
  cleanup: jest.fn().mockResolvedValue(true),
}));

// Mock Context Manager
jest.mock('../../src/context/contextManager.js', () => ({
  addMessage: jest.fn().mockResolvedValue(true),
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

describe('Item Manager', () => {
  // Setup and teardown
  beforeEach(async () => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Initialize item manager with test config
    const testConfig = {
      itemsPath: '/test/items',
      defaultItemsFile: 'items.json'
    };
    
    await itemManager.initialize(testConfig);
  });
  
  afterEach(async () => {
    // Cleanup after each test
    await itemManager.cleanup();
  });
  
  // Tests
  
  test('should initialize successfully and load blueprints and items', async () => {
    // Verify the item manager is defined with expected methods
    expect(itemManager).toBeDefined();
    expect(itemManager.initialize).toBeDefined();
    expect(itemManager.getBlueprint).toBeDefined();
    expect(itemManager.getItem).toBeDefined();
    expect(itemManager.createItem).toBeDefined();
    expect(itemManager.updateItem).toBeDefined();
    expect(itemManager.transferItem).toBeDefined();
    expect(itemManager.useItem).toBeDefined();
    
    // Verify blueprints were loaded
    const blueprints = itemManager.getAllBlueprints();
    expect(blueprints).toHaveLength(2);
    
    const bookBlueprint = itemManager.getBlueprint('blueprint-1');
    expect(bookBlueprint).toBeDefined();
    expect(bookBlueprint.name).toBe('Book');
    expect(bookBlueprint.properties.readable).toBe(true);
    
    // Verify items were loaded
    const items = itemManager.getAllItems();
    expect(items).toHaveLength(3);
    
    const novel = itemManager.getItem('item-1');
    expect(novel).toBeDefined();
    expect(novel.name).toBe('Mystery Novel');
    expect(novel.ownerId).toBe('agent-123');
    expect(novel.properties.author).toBe('Agatha Christie');
  });
  
  test('should create a new blueprint', async () => {
    // Create a new blueprint
    const newBlueprint = {
      name: 'Sword',
      description: 'A sharp weapon for combat',
      category: 'weapon',
      properties: {
        weight: 5,
        size: 'medium',
        damage: 10,
        value: 50
      },
      uses: [
        {
          name: 'attack',
          effect: 'damage',
          targetType: 'agent'
        }
      ]
    };
    
    const blueprintId = await itemManager.createBlueprint(newBlueprint);
    
    // Verify the blueprint was created with an ID
    expect(blueprintId).toBeDefined();
    
    const sword = itemManager.getBlueprint(blueprintId);
    expect(sword).toBeDefined();
    expect(sword.name).toBe('Sword');
    expect(sword.properties.damage).toBe(10);
    
    // Verify the event was emitted
    const eventEmitter = itemManager.getEventEmitter();
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'blueprintCreated',
      expect.objectContaining({ 
        id: blueprintId,
        name: 'Sword'
      })
    );
    
    // Verify the blueprint was saved
    const fs = require('fs/promises');
    expect(fs.writeFile).toHaveBeenCalled();
  });
  
  test('should create a new item from a blueprint', async () => {
    // Create a new item
    const newItem = {
      blueprintId: 'blueprint-1',
      name: 'Fantasy Novel',
      description: 'An epic tale of adventure',
      ownerId: 'agent-123',
      properties: {
        author: 'J.R.R. Tolkien',
        genre: 'fantasy',
        pageCount: 400
      }
    };
    
    const itemId = await itemManager.createItem(newItem);
    
    // Verify the item was created with an ID
    expect(itemId).toBeDefined();
    
    const fantasyNovel = itemManager.getItem(itemId);
    expect(fantasyNovel).toBeDefined();
    expect(fantasyNovel.name).toBe('Fantasy Novel');
    expect(fantasyNovel.ownerId).toBe('agent-123');
    expect(fantasyNovel.properties.author).toBe('J.R.R. Tolkien');
    
    // Verify inherited properties from blueprint
    expect(fantasyNovel.properties.weight).toBe(1);
    expect(fantasyNovel.properties.readable).toBe(true);
    
    // Verify the event was emitted
    const eventEmitter = itemManager.getEventEmitter();
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'itemCreated',
      expect.objectContaining({ 
        id: itemId,
        name: 'Fantasy Novel'
      })
    );
    
    // Verify the agent's inventory was updated
    const agentManager = require('../../src/agents/agentManager.js');
    expect(agentManager.addItemToInventory).toHaveBeenCalledWith(
      'agent-123',
      itemId
    );
    
    // Verify memory was created
    const memoryManager = require('../../src/memory/memoryManager.js');
    expect(memoryManager.addMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('Fantasy Novel'),
        agentId: 'agent-123'
      })
    );
  });
  
  test('should update an existing item', async () => {
    // Update an existing item
    const updates = {
      description: 'A thrilling detective novel by a master of the genre',
      condition: 0.9,
      properties: {
        pageCount: 350,
        notes: 'Signed first edition'
      }
    };
    
    await itemManager.updateItem('item-1', updates);
    
    // Verify the item was updated
    const novel = itemManager.getItem('item-1');
    expect(novel.description).toBe('A thrilling detective novel by a master of the genre');
    expect(novel.condition).toBe(0.9);
    expect(novel.properties.pageCount).toBe(350);
    expect(novel.properties.notes).toBe('Signed first edition');
    expect(novel.properties.author).toBe('Agatha Christie'); // Unchanged
    
    // Verify the event was emitted
    const eventEmitter = itemManager.getEventEmitter();
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'itemUpdated',
      expect.objectContaining({ 
        id: 'item-1',
        name: 'Mystery Novel'
      })
    );
  });
  
  test('should validate an item with AI', async () => {
    // Mock the AI response for this test
    const groqClient = require('groq-sdk')();
    groqClient.chat.completions.create.mockResolvedValueOnce({
      choices: [{ 
        message: { 
          content: JSON.stringify({
            valid: true,
            feedback: "This item fits well in the world context and has balanced properties.",
            suggestedProperties: {
              value: 8
            }
          })
        } 
      }]
    });
    
    // Create a new item to validate
    const newItem = {
      blueprintId: 'blueprint-1',
      name: 'Magical Tome',
      description: 'A book that glows with mysterious energy',
      properties: {
        author: 'Unknown',
        genre: 'arcane',
        pageCount: 1000,
        magical: true,
        spellPower: 100
      }
    };
    
    const result = await itemManager.validateItemWithAI(newItem);
    
    // Verify the validation result
    expect(result.valid).toBe(true);
    expect(result.feedback).toContain("balanced properties");
    expect(result.suggestedProperties.value).toBe(8);
    
    // Verify Groq API was called with appropriate prompt
    expect(groqClient.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('validate an item')
          })
        ])
      })
    );
  });
  
  test('should transfer an item between agents', async () => {
    // Transfer a book from Alice to Bob
    await itemManager.transferItem('item-1', {
      fromId: 'agent-123',
      toId: 'agent-456'
    });
    
    // Verify the item owner was updated
    const novel = itemManager.getItem('item-1');
    expect(novel.ownerId).toBe('agent-456');
    
    // Verify agent inventories were updated
    const agentManager = require('../../src/agents/agentManager.js');
    expect(agentManager.removeItemFromInventory).toHaveBeenCalledWith(
      'agent-123',
      'item-1'
    );
    expect(agentManager.addItemToInventory).toHaveBeenCalledWith(
      'agent-456',
      'item-1'
    );
    
    // Verify the event was emitted
    const eventEmitter = itemManager.getEventEmitter();
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'itemTransferred',
      expect.objectContaining({ 
        itemId: 'item-1',
        fromId: 'agent-123',
        toId: 'agent-456'
      })
    );
    
    // Verify memories were created for both agents
    const memoryManager = require('../../src/memory/memoryManager.js');
    expect(memoryManager.addMemory).toHaveBeenCalledTimes(2);
  });
  
  test('should transfer an item to a location', async () => {
    // Transfer an item from agent to location
    await itemManager.transferItem('item-1', {
      fromId: 'agent-123',
      toId: 'place-1'
    });
    
    // Verify the item location was updated
    const novel = itemManager.getItem('item-1');
    expect(novel.ownerId).toBeNull();
    expect(novel.locationId).toBe('place-1');
    
    // Verify agent inventory was updated
    const agentManager = require('../../src/agents/agentManager.js');
    expect(agentManager.removeItemFromInventory).toHaveBeenCalledWith(
      'agent-123',
      'item-1'
    );
    
    // Verify the event was emitted
    const eventEmitter = itemManager.getEventEmitter();
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'itemTransferred',
      expect.objectContaining({ 
        itemId: 'item-1',
        fromId: 'agent-123',
        toId: 'place-1'
      })
    );
  });
  
  test('should use an item', async () => {
    // Use the book to read
    const useResult = await itemManager.useItem('item-1', {
      useType: 'read',
      userId: 'agent-123',
      targetId: 'agent-123'
    });
    
    // Verify the use result
    expect(useResult.success).toBe(true);
    expect(useResult.effect).toBe('knowledge');
    
    // Verify the item condition was affected
    const novel = itemManager.getItem('item-1');
    expect(novel.condition).toBeLessThan(1.0);
    
    // Verify the event was emitted
    const eventEmitter = itemManager.getEventEmitter();
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'itemUsed',
      expect.objectContaining({ 
        itemId: 'item-1',
        useType: 'read',
        userId: 'agent-123'
      })
    );
    
    // Verify memory was created
    const memoryManager = require('../../src/memory/memoryManager.js');
    expect(memoryManager.addMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('read'),
        agentId: 'agent-123'
      })
    );
  });
  
  test('should handle item containers', async () => {
    // Put an item into a container
    await itemManager.addItemToContainer('item-1', 'item-3');
    
    // Verify the item's containerId was updated
    const novel = itemManager.getItem('item-1');
    expect(novel.containerId).toBe('item-3');
    expect(novel.locationId).toBeNull();
    
    // Verify the container's contents were updated
    const backpack = itemManager.getItem('item-3');
    expect(backpack.contents).toContain('item-1');
    
    // Verify the event was emitted
    const eventEmitter = itemManager.getEventEmitter();
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'itemAddedToContainer',
      expect.objectContaining({ 
        itemId: 'item-1',
        containerId: 'item-3'
      })
    );
    
    // Now remove the item from the container
    await itemManager.removeItemFromContainer('item-1');
    
    // Verify the item's containerId was reset
    const updatedNovel = itemManager.getItem('item-1');
    expect(updatedNovel.containerId).toBeNull();
    
    // Verify the container's contents were updated
    const updatedBackpack = itemManager.getItem('item-3');
    expect(updatedBackpack.contents).not.toContain('item-1');
    
    // Verify the event was emitted
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'itemRemovedFromContainer',
      expect.objectContaining({ 
        itemId: 'item-1',
        containerId: 'item-3'
      })
    );
  });
  
  test('should handle item condition and repair', async () => {
    // Damage an item
    await itemManager.updateItemCondition('item-1', -0.3);
    
    // Verify the condition was reduced
    let novel = itemManager.getItem('item-1');
    expect(novel.condition).toBe(0.7);
    
    // Verify the event was emitted
    const eventEmitter = itemManager.getEventEmitter();
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'itemConditionChanged',
      expect.objectContaining({ 
        itemId: 'item-1',
        change: -0.3,
        newCondition: 0.7
      })
    );
    
    // Repair the item
    await itemManager.updateItemCondition('item-1', 0.2);
    
    // Verify the condition was increased
    novel = itemManager.getItem('item-1');
    expect(novel.condition).toBe(0.9);
  });
  
  test('should delete an item', async () => {
    // Delete an item
    await itemManager.deleteItem('item-2');
    
    // Verify the item was removed
    expect(itemManager.getItem('item-2')).toBeUndefined();
    
    // Verify the event was emitted
    const eventEmitter = itemManager.getEventEmitter();
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'itemDeleted',
      expect.objectContaining({ 
        id: 'item-2',
        name: 'Textbook'
      })
    );
    
    // Verify agent inventory was updated
    const agentManager = require('../../src/agents/agentManager.js');
    expect(agentManager.removeItemFromInventory).toHaveBeenCalledWith(
      'agent-456',
      'item-2'
    );
  });
  
  test('should update a blueprint', async () => {
    // Update an existing blueprint
    const updates = {
      description: 'A written work containing information or stories',
      properties: {
        weight: 0.8,
        durability: 'medium'
      },
      uses: [
        {
          name: 'read',
          effect: 'knowledge',
          targetType: 'agent'
        },
        {
          name: 'flip through',
          effect: 'entertainment',
          targetType: 'agent'
        }
      ]
    };
    
    await itemManager.updateBlueprint('blueprint-1', updates);
    
    // Verify the blueprint was updated
    const bookBlueprint = itemManager.getBlueprint('blueprint-1');
    expect(bookBlueprint.description).toBe('A written work containing information or stories');
    expect(bookBlueprint.properties.weight).toBe(0.8);
    expect(bookBlueprint.properties.durability).toBe('medium');
    expect(bookBlueprint.properties.readable).toBe(true); // Unchanged
    expect(bookBlueprint.uses).toHaveLength(2);
    
    // Verify the event was emitted
    const eventEmitter = itemManager.getEventEmitter();
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'blueprintUpdated',
      expect.objectContaining({ 
        id: 'blueprint-1',
        name: 'Book'
      })
    );
  });
  
  test('should get items by owner', () => {
    // Get items owned by Alice
    const aliceItems = itemManager.getItemsByOwner('agent-123');
    
    // Should include Mystery Novel and Backpack
    expect(aliceItems).toHaveLength(2);
    expect(aliceItems.map(item => item.id)).toContain('item-1');
    expect(aliceItems.map(item => item.id)).toContain('item-3');
    
    // Get items owned by Bob
    const bobItems = itemManager.getItemsByOwner('agent-456');
    
    // Should include Textbook
    expect(bobItems).toHaveLength(1);
    expect(bobItems[0].id).toBe('item-2');
  });
  
  test('should get items by location', async () => {
    // First place an item at a location
    await itemManager.transferItem('item-1', {
      fromId: 'agent-123',
      toId: 'place-1'
    });
    
    // Get items at the library
    const itemsAtLibrary = itemManager.getItemsByLocation('place-1');
    
    // Should include Mystery Novel
    expect(itemsAtLibrary).toHaveLength(1);
    expect(itemsAtLibrary[0].id).toBe('item-1');
  });
  
  test('should get items by blueprint', () => {
    // Get all books
    const books = itemManager.getItemsByBlueprint('blueprint-1');
    
    // Should include Mystery Novel and Textbook
    expect(books).toHaveLength(2);
    expect(books.map(item => item.id)).toContain('item-1');
    expect(books.map(item => item.id)).toContain('item-2');
  });
  
  test('should check container capacity', async () => {
    // Create several items to fill the backpack
    const items = [];
    for (let i = 0; i < 10; i++) {
      const itemId = await itemManager.createItem({
        blueprintId: 'blueprint-1',
        name: `Small Book ${i}`,
        ownerId: 'agent-123'
      });
      items.push(itemId);
    }
    
    // Add items to container until full
    for (let i = 0; i < 10; i++) {
      await itemManager.addItemToContainer(items[i], 'item-3');
    }
    
    // Try to add one more item - should fail due to capacity
    await expect(
      itemManager.addItemToContainer('item-2', 'item-3')
    ).rejects.toThrow(/capacity/);
    
    // Verify the backpack has 10 items
    const backpack = itemManager.getItem('item-3');
    expect(backpack.contents).toHaveLength(10);
  });
});

