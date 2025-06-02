/**
 * Memory Manager Tests
 * 
 * Tests for core Memory Manager functionality:
 * - Initialization
 * - Adding memories
 * - Retrieving memories
 * - Searching by keywords
 * - Getting relevant memories
 * - Memory pruning
 */

import { jest } from '@jest/globals';
import memoryManager from '../../src/memory/memoryManager.js';

// Mock the database connection
jest.mock('better-sqlite3', () => {
  const mockDb = {
    prepare: jest.fn().mockReturnThis(),
    run: jest.fn().mockReturnThis(),
    get: jest.fn(),
    all: jest.fn(),
    close: jest.fn(),
    exec: jest.fn(),
    transaction: jest.fn(fn => fn),
  };
  
  return jest.fn(() => mockDb);
});

// Mock the event emitter
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

describe('Memory Manager', () => {
  // Sample memory data for testing
  const sampleMemory = {
    content: 'Alice likes to read books about astronomy',
    agentId: 'agent-123',
    timestamp: new Date().toISOString(),
    importance: 0.75,
    source: 'conversation',
    keywords: ['Alice', 'books', 'astronomy', 'reading'],
    metadata: { location: 'library', mood: 'curious' }
  };
  
  const secondMemory = {
    content: 'Bob enjoys playing chess with Alice',
    agentId: 'agent-123',
    timestamp: new Date().toISOString(),
    importance: 0.6,
    source: 'observation',
    keywords: ['Bob', 'Alice', 'chess', 'playing'],
    metadata: { location: 'park', mood: 'competitive' }
  };
  
  // Setup and teardown
  beforeEach(async () => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Initialize memory manager with test config
    const testConfig = {
      maxMemoriesPerAgent: 100,
      maxGlobalMemories: 1000,
      relevanceThreshold: 0.5,
      defaultMemoryRetention: 30 * 24 * 60 * 60 * 1000, // 30 days
      pruneInterval: 24 * 60 * 60 * 1000 // 24 hours
    };
    
    await memoryManager.initialize(testConfig);
  });
  
  afterEach(async () => {
    // Cleanup after each test
    await memoryManager.cleanup();
  });
  
  // Tests
  
  test('should initialize successfully', () => {
    expect(memoryManager).toBeDefined();
    expect(memoryManager.initialize).toBeDefined();
    expect(memoryManager.addMemory).toBeDefined();
    expect(memoryManager.getMemory).toBeDefined();
    expect(memoryManager.searchMemories).toBeDefined();
    expect(memoryManager.getRelevantMemories).toBeDefined();
    expect(memoryManager.pruneMemories).toBeDefined();
  });
  
  test('should add a memory and return a valid ID', async () => {
    // Mock the database response for adding a memory
    const mockMemoryId = 'mem-123456';
    const db = require('better-sqlite3')();
    db.run.mockReturnValueOnce({ lastInsertRowid: 123456 });
    
    const result = await memoryManager.addMemory(sampleMemory);
    
    expect(result).toBe(mockMemoryId);
    expect(db.prepare).toHaveBeenCalled();
    expect(db.run).toHaveBeenCalled();
  });
  
  test('should retrieve a memory by ID', async () => {
    // Mock the database response for retrieving a memory
    const mockMemoryId = 'mem-123456';
    const mockStoredMemory = {
      id: mockMemoryId,
      ...sampleMemory,
      keywords: JSON.stringify(sampleMemory.keywords),
      metadata: JSON.stringify(sampleMemory.metadata)
    };
    
    const db = require('better-sqlite3')();
    db.get.mockReturnValueOnce(mockStoredMemory);
    
    const result = await memoryManager.getMemory(mockMemoryId);
    
    expect(result).toEqual({
      id: mockMemoryId,
      ...sampleMemory,
      // Keywords and metadata should be parsed back to objects
      keywords: sampleMemory.keywords,
      metadata: sampleMemory.metadata
    });
    expect(db.prepare).toHaveBeenCalled();
    expect(db.get).toHaveBeenCalled();
  });
  
  test('should return null when retrieving non-existent memory', async () => {
    const db = require('better-sqlite3')();
    db.get.mockReturnValueOnce(null);
    
    const result = await memoryManager.getMemory('non-existent-id');
    
    expect(result).toBeNull();
    expect(db.prepare).toHaveBeenCalled();
    expect(db.get).toHaveBeenCalled();
  });
  
  test('should search memories by keywords', async () => {
    // Mock the database response for searching memories
    const mockMemories = [
      {
        id: 'mem-123456',
        ...sampleMemory,
        keywords: JSON.stringify(sampleMemory.keywords),
        metadata: JSON.stringify(sampleMemory.metadata)
      },
      {
        id: 'mem-789012',
        ...secondMemory,
        keywords: JSON.stringify(secondMemory.keywords),
        metadata: JSON.stringify(secondMemory.metadata)
      }
    ];
    
    const db = require('better-sqlite3')();
    db.all.mockReturnValueOnce(mockMemories);
    
    const result = await memoryManager.searchMemories({
      keywords: ['Alice', 'books'],
      agentId: 'agent-123',
      limit: 10
    });
    
    expect(result).toHaveLength(2);
    expect(result[0].content).toBe(sampleMemory.content);
    expect(result[1].content).toBe(secondMemory.content);
    expect(db.prepare).toHaveBeenCalled();
    expect(db.all).toHaveBeenCalled();
  });
  
  test('should get relevant memories based on query', async () => {
    // Mock the embeddings calculation and database response
    memoryManager.calculateRelevance = jest.fn().mockImplementation((query, memories) => {
      // Simple mock implementation that assigns relevance scores
      return memories.map((memory, index) => ({
        ...memory,
        relevance: index === 0 ? 0.9 : 0.6 // First memory more relevant
      }));
    });
    
    const mockMemories = [
      {
        id: 'mem-123456',
        ...sampleMemory,
        keywords: JSON.stringify(sampleMemory.keywords),
        metadata: JSON.stringify(sampleMemory.metadata)
      },
      {
        id: 'mem-789012',
        ...secondMemory,
        keywords: JSON.stringify(secondMemory.keywords),
        metadata: JSON.stringify(secondMemory.metadata)
      }
    ];
    
    const db = require('better-sqlite3')();
    db.all.mockReturnValueOnce(mockMemories);
    
    const result = await memoryManager.getRelevantMemories({
      query: 'What does Alice like to read?',
      agentId: 'agent-123',
      threshold: 0.5,
      limit: 5
    });
    
    // Should return both memories as they're above the threshold
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('mem-123456');
    expect(result[0].relevance).toBe(0.9);
    expect(result[1].id).toBe('mem-789012');
    expect(result[1].relevance).toBe(0.6);
    expect(db.prepare).toHaveBeenCalled();
    expect(db.all).toHaveBeenCalled();
  });
  
  test('should prune old memories', async () => {
    // Create an old timestamp outside retention period
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 60); // 60 days old
    
    const db = require('better-sqlite3')();
    db.run.mockReturnValueOnce({ changes: 5 }); // 5 memories deleted
    
    const result = await memoryManager.pruneMemories();
    
    expect(result).toBe(5); // Should return number of deleted memories
    expect(db.prepare).toHaveBeenCalled();
    expect(db.run).toHaveBeenCalled();
    
    // The query should include a timestamp check
    const prepareCall = db.prepare.mock.calls[0][0];
    expect(prepareCall).toContain('DELETE FROM memories');
    expect(prepareCall).toContain('timestamp < ?');
  });
  
  test('should update an existing memory', async () => {
    const memoryId = 'mem-123456';
    const updatedContent = 'Alice now prefers history books over astronomy';
    const updatedImportance = 0.85;
    
    const db = require('better-sqlite3')();
    db.run.mockReturnValueOnce({ changes: 1 }); // 1 row updated
    
    const result = await memoryManager.updateMemory(memoryId, {
      content: updatedContent,
      importance: updatedImportance
    });
    
    expect(result).toBe(true); // Should return true for successful update
    expect(db.prepare).toHaveBeenCalled();
    expect(db.run).toHaveBeenCalled();
    
    // The query should be an UPDATE query
    const prepareCall = db.prepare.mock.calls[0][0];
    expect(prepareCall).toContain('UPDATE memories');
  });
  
  test('should delete a memory', async () => {
    const memoryId = 'mem-123456';
    
    const db = require('better-sqlite3')();
    db.run.mockReturnValueOnce({ changes: 1 }); // 1 row deleted
    
    const result = await memoryManager.deleteMemory(memoryId);
    
    expect(result).toBe(true); // Should return true for successful deletion
    expect(db.prepare).toHaveBeenCalled();
    expect(db.run).toHaveBeenCalled();
    
    // The query should be a DELETE query
    const prepareCall = db.prepare.mock.calls[0][0];
    expect(prepareCall).toContain('DELETE FROM memories');
    expect(prepareCall).toContain('id = ?');
  });
});

