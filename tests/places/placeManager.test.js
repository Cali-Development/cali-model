/**
 * Place Manager Tests
 * 
 * Tests for core Place Manager functionality:
 * - Place creation and updates
 * - Place connections
 * - Pathfinding between places
 * - Agent movement tracking
 * - Place searches and queries
 * - Place hierarchies (parent/child relationships)
 */

import { jest } from '@jest/globals';
import placeManager from '../../src/places/placeManager.js';

// Mock file system operations
jest.mock('fs/promises', () => ({
  readFile: jest.fn().mockImplementation((path) => {
    if (path.includes('places.json')) {
      return Promise.resolve(JSON.stringify({
        places: [
          {
            id: 'place-1',
            name: 'Library',
            description: 'A quiet place with many books',
            type: 'building',
            coordinates: { x: 10, y: 10 },
            properties: {
              capacity: 100,
              noiseLevel: 'low',
              resources: ['books', 'computers']
            },
            parentId: null
          },
          {
            id: 'place-2',
            name: 'Cafeteria',
            description: 'A place to eat and socialize',
            type: 'building',
            coordinates: { x: 20, y: 10 },
            properties: {
              capacity: 200,
              noiseLevel: 'high',
              resources: ['food', 'drinks']
            },
            parentId: null
          },
          {
            id: 'place-3',
            name: 'Reading Room',
            description: 'A section in the library for quiet reading',
            type: 'room',
            coordinates: { x: 12, y: 10 },
            properties: {
              capacity: 30,
              noiseLevel: 'very low',
              resources: ['comfortable chairs', 'reading lamps']
            },
            parentId: 'place-1'
          }
        ],
        connections: [
          {
            id: 'conn-1',
            source: 'place-1',
            target: 'place-2',
            type: 'path',
            bidirectional: true,
            properties: {
              distance: 100,
              travelTime: 2
            }
          },
          {
            id: 'conn-2',
            source: 'place-1',
            target: 'place-3',
            type: 'door',
            bidirectional: true,
            properties: {
              distance: 10,
              travelTime: 0.5
            }
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
          location: 'place-1'
        }
      };
    } else if (agentId === 'agent-456') {
      return {
        id: 'agent-456',
        name: 'Bob',
        state: {
          location: 'place-2'
        }
      };
    }
    return null;
  }),
  moveAgent: jest.fn().mockResolvedValue(true),
  getAllAgents: jest.fn().mockReturnValue([
    {
      id: 'agent-123',
      name: 'Alice',
      state: { location: 'place-1' }
    },
    {
      id: 'agent-456',
      name: 'Bob',
      state: { location: 'place-2' }
    }
  ]),
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

describe('Place Manager', () => {
  // Setup and teardown
  beforeEach(async () => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Initialize place manager with test config
    const testConfig = {
      placesPath: '/test/places',
      defaultPlacesFile: 'places.json'
    };
    
    await placeManager.initialize(testConfig);
  });
  
  afterEach(async () => {
    // Cleanup after each test
    await placeManager.cleanup();
  });
  
  // Tests
  
  test('should initialize successfully and load places', async () => {
    // Verify the place manager is defined with expected methods
    expect(placeManager).toBeDefined();
    expect(placeManager.initialize).toBeDefined();
    expect(placeManager.getPlace).toBeDefined();
    expect(placeManager.createPlace).toBeDefined();
    expect(placeManager.updatePlace).toBeDefined();
    expect(placeManager.createConnection).toBeDefined();
    expect(placeManager.findPath).toBeDefined();
    
    // Verify places were loaded
    const places = placeManager.getAllPlaces();
    expect(places).toHaveLength(3);
    
    const library = placeManager.getPlace('place-1');
    expect(library).toBeDefined();
    expect(library.name).toBe('Library');
    expect(library.properties.noiseLevel).toBe('low');
    
    // Verify connections were loaded
    const connections = placeManager.getAllConnections();
    expect(connections).toHaveLength(2);
    
    const connection = placeManager.getConnection('conn-1');
    expect(connection).toBeDefined();
    expect(connection.source).toBe('place-1');
    expect(connection.target).toBe('place-2');
    expect(connection.bidirectional).toBe(true);
  });
  
  test('should create a new place', async () => {
    // Create a new place
    const newPlace = {
      name: 'Computer Lab',
      description: 'A room with computers for research',
      type: 'room',
      coordinates: { x: 15, y: 15 },
      properties: {
        capacity: 50,
        noiseLevel: 'medium',
        resources: ['computers', 'printers']
      },
      parentId: 'place-1'
    };
    
    const placeId = await placeManager.createPlace(newPlace);
    
    // Verify the place was created with an ID
    expect(placeId).toBeDefined();
    
    const computerLab = placeManager.getPlace(placeId);
    expect(computerLab).toBeDefined();
    expect(computerLab.name).toBe('Computer Lab');
    expect(computerLab.parentId).toBe('place-1');
    
    // Verify the event was emitted
    const eventEmitter = placeManager.getEventEmitter();
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'placeCreated',
      expect.objectContaining({ 
        id: placeId,
        name: 'Computer Lab'
      })
    );
    
    // Verify the place was saved
    const fs = require('fs/promises');
    expect(fs.writeFile).toHaveBeenCalled();
  });
  
  test('should update an existing place', async () => {
    // Update an existing place
    const updates = {
      description: 'A modern library with digital and print resources',
      properties: {
        capacity: 150,
        resources: ['books', 'computers', 'study rooms']
      }
    };
    
    await placeManager.updatePlace('place-1', updates);
    
    // Verify the place was updated
    const library = placeManager.getPlace('place-1');
    expect(library.description).toBe('A modern library with digital and print resources');
    expect(library.properties.capacity).toBe(150);
    expect(library.properties.resources).toContain('study rooms');
    expect(library.properties.noiseLevel).toBe('low'); // Unchanged
    
    // Verify the event was emitted
    const eventEmitter = placeManager.getEventEmitter();
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'placeUpdated',
      expect.objectContaining({ 
        id: 'place-1',
        name: 'Library'
      })
    );
  });
  
  test('should create a connection between places', async () => {
    // Create a new place first
    const officeId = await placeManager.createPlace({
      name: 'Office',
      description: 'Administrative office',
      type: 'room',
      coordinates: { x: 25, y: 15 }
    });
    
    // Create a connection between library and office
    const connection = {
      source: 'place-1',
      target: officeId,
      type: 'hallway',
      bidirectional: true,
      properties: {
        distance: 50,
        travelTime: 1
      }
    };
    
    const connectionId = await placeManager.createConnection(connection);
    
    // Verify the connection was created with an ID
    expect(connectionId).toBeDefined();
    
    const newConnection = placeManager.getConnection(connectionId);
    expect(newConnection).toBeDefined();
    expect(newConnection.source).toBe('place-1');
    expect(newConnection.target).toBe(officeId);
    expect(newConnection.type).toBe('hallway');
    
    // Verify the event was emitted
    const eventEmitter = placeManager.getEventEmitter();
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'connectionCreated',
      expect.objectContaining({ 
        id: connectionId,
        source: 'place-1',
        target: officeId
      })
    );
    
    // Verify connection was saved
    const fs = require('fs/promises');
    expect(fs.writeFile).toHaveBeenCalled();
  });
  
  test('should get adjacent places', () => {
    // Get places adjacent to the library
    const adjacentToLibrary = placeManager.getAdjacentPlaces('place-1');
    
    // Should include cafeteria and reading room
    expect(adjacentToLibrary).toHaveLength(2);
    expect(adjacentToLibrary.map(p => p.id)).toContain('place-2'); // Cafeteria
    expect(adjacentToLibrary.map(p => p.id)).toContain('place-3'); // Reading Room
    
    // Get places adjacent to reading room
    const adjacentToReadingRoom = placeManager.getAdjacentPlaces('place-3');
    
    // Should only include library
    expect(adjacentToReadingRoom).toHaveLength(1);
    expect(adjacentToReadingRoom[0].id).toBe('place-1'); // Library
  });
  
  test('should find a path between places', () => {
    // Find path from Reading Room to Cafeteria
    const path = placeManager.findPath('place-3', 'place-2');
    
    // Path should exist and go through the library
    expect(path).toBeDefined();
    expect(path.places).toHaveLength(3);
    expect(path.places[0].id).toBe('place-3'); // Reading Room
    expect(path.places[1].id).toBe('place-1'); // Library
    expect(path.places[2].id).toBe('place-2'); // Cafeteria
    
    // Check total distance
    expect(path.totalDistance).toBe(110); // 10 (room to library) + 100 (library to cafeteria)
  });
  
  test('should handle no path exists scenario', () => {
    // Create an isolated place with no connections
    placeManager.createPlace({
      id: 'place-isolated',
      name: 'Isolated Place',
      coordinates: { x: 100, y: 100 }
    });
    
    // Try to find a path to the isolated place
    const path = placeManager.findPath('place-1', 'place-isolated');
    
    // Should return null or indicate no path exists
    expect(path).toBeNull();
  });
  
  test('should move agents between places', async () => {
    // Mock the agent manager
    const agentManager = require('../../src/agents/agentManager.js');
    
    // Move agent from library to cafeteria
    await placeManager.moveAgentToPlace('agent-123', 'place-2');
    
    // Verify agent manager was called to update agent location
    expect(agentManager.moveAgent).toHaveBeenCalledWith(
      'agent-123',
      'place-2'
    );
    
    // Verify event was emitted
    const eventEmitter = placeManager.getEventEmitter();
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'agentMovedToPlace',
      expect.objectContaining({ 
        agentId: 'agent-123',
        fromPlaceId: 'place-1',
        toPlaceId: 'place-2'
      })
    );
    
    // Verify memory was created
    const memoryManager = require('../../src/memory/memoryManager.js');
    expect(memoryManager.addMemory).toHaveBeenCalled();
  });
  
  test('should prevent moving to disconnected places', async () => {
    // Create an isolated place with no connections
    const isolatedId = await placeManager.createPlace({
      name: 'Isolated Place',
      coordinates: { x: 100, y: 100 }
    });
    
    // Try to move agent to the isolated place
    await expect(
      placeManager.moveAgentToPlace('agent-123', isolatedId, { requirePath: true })
    ).rejects.toThrow();
  });
  
  test('should get agents at a place', () => {
    // Get agents at the library
    const agentsAtLibrary = placeManager.getAgentsAtPlace('place-1');
    
    // Should include Alice
    expect(agentsAtLibrary).toHaveLength(1);
    expect(agentsAtLibrary[0].id).toBe('agent-123');
    expect(agentsAtLibrary[0].name).toBe('Alice');
    
    // Get agents at the cafeteria
    const agentsAtCafeteria = placeManager.getAgentsAtPlace('place-2');
    
    // Should include Bob
    expect(agentsAtCafeteria).toHaveLength(1);
    expect(agentsAtCafeteria[0].id).toBe('agent-456');
  });
  
  test('should handle place hierarchies correctly', () => {
    // Verify parent-child relationship between Library and Reading Room
    const readingRoom = placeManager.getPlace('place-3');
    expect(readingRoom.parentId).toBe('place-1');
    
    // Get child places of the library
    const libraryChildren = placeManager.getChildPlaces('place-1');
    expect(libraryChildren).toHaveLength(1);
    expect(libraryChildren[0].id).toBe('place-3');
    
    // Get the parent of the reading room
    const parent = placeManager.getParentPlace('place-3');
    expect(parent).toBeDefined();
    expect(parent.id).toBe('place-1');
    expect(parent.name).toBe('Library');
  });
  
  test('should search places by properties', () => {
    // Search for places with low noise level
    const quietPlaces = placeManager.searchPlaces({
      'properties.noiseLevel': 'low'
    });
    
    expect(quietPlaces).toHaveLength(1);
    expect(quietPlaces[0].id).toBe('place-1'); // Library
    
    // Search for places with books
    const placesWithBooks = placeManager.searchPlaces({
      'properties.resources': 'books'
    });
    
    expect(placesWithBooks).toHaveLength(1);
    expect(placesWithBooks[0].id).toBe('place-1'); // Library
  });
  
  test('should calculate distance between places', () => {
    // Calculate distance between Library and Cafeteria based on coordinates
    const distance = placeManager.getDistanceBetweenPlaces('place-1', 'place-2');
    
    // Using Euclidean distance formula: sqrt((x2-x1)² + (y2-y1)²)
    // Library (10,10) to Cafeteria (20,10) = sqrt((20-10)² + (10-10)²) = 10
    expect(distance).toBe(10);
  });
  
  test('should delete a place and its connections', async () => {
    // Delete the reading room
    await placeManager.deletePlace('place-3');
    
    // Verify place was removed
    expect(placeManager.getPlace('place-3')).toBeUndefined();
    
    // Verify connection was also removed
    expect(placeManager.getConnection('conn-2')).toBeUndefined();
    
    // Verify event was emitted
    const eventEmitter = placeManager.getEventEmitter();
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'placeDeleted',
      expect.objectContaining({ 
        id: 'place-3',
        name: 'Reading Room'
      })
    );
    
    // Verify connections were also removed
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'connectionDeleted',
      expect.objectContaining({ 
        id: 'conn-2'
      })
    );
  });
  
  test('should update a connection', async () => {
    // Update the connection between Library and Cafeteria
    const updates = {
      properties: {
        distance: 120,
        travelTime: 3,
        condition: 'under construction'
      }
    };
    
    await placeManager.updateConnection('conn-1', updates);
    
    // Verify connection was updated
    const connection = placeManager.getConnection('conn-1');
    expect(connection.properties.distance).toBe(120);
    expect(connection.properties.travelTime).toBe(3);
    expect(connection.properties.condition).toBe('under construction');
    
    // Verify event was emitted
    const eventEmitter = placeManager.getEventEmitter();
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'connectionUpdated',
      expect.objectContaining({ 
        id: 'conn-1',
        source: 'place-1',
        target: 'place-2'
      })
    );
  });
});

