/**
 * Context Manager Tests
 * 
 * Tests for core Context Manager functionality:
 * - Adding context messages
 * - Getting context summaries
 * - Managing context windows
 * - Context summarization
 * - Cache management
 */

import { jest } from '@jest/globals';
import contextManager from '../../src/context/contextManager.js';

// Mock the Groq API
jest.mock('groq-sdk', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: 'This is a mocked summary of the conversation context.'
              }
            }
          ]
        })
      }
    }
  }));
});

// Mock the Memory Manager
jest.mock('../../src/memory/memoryManager.js', () => ({
  addMemory: jest.fn().mockResolvedValue('mem-123456'),
  getRelevantMemories: jest.fn().mockResolvedValue([
    {
      id: 'mem-123456',
      content: 'Alice likes to read books about astronomy',
      agentId: 'agent-123',
      timestamp: new Date().toISOString(),
      importance: 0.75,
      source: 'conversation',
      keywords: ['Alice', 'books', 'astronomy', 'reading'],
      metadata: { location: 'library', mood: 'curious' },
      relevance: 0.85
    }
  ]),
  initialize: jest.fn().mockResolvedValue(true),
  cleanup: jest.fn().mockResolvedValue(true),
}));

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

describe('Context Manager', () => {
  // Sample data for testing
  const conversationId = 'conv-123';
  const userId = 'user-456';
  const agentId = 'agent-123';
  
  const sampleMessage = {
    content: 'What books do you recommend about astronomy?',
    role: 'user',
    userId: userId,
    timestamp: new Date().toISOString()
  };
  
  const agentResponse = {
    content: 'I recommend "A Brief History of Time" by Stephen Hawking and "Cosmos" by Carl Sagan.',
    role: 'assistant',
    agentId: agentId,
    timestamp: new Date().toISOString()
  };
  
  // Setup and teardown
  beforeEach(async () => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Initialize context manager with test config
    const testConfig = {
      maxContextMessages: 20,
      summarizationThreshold: 10,
      maxSummaryLength: 500,
      cacheTimeout: 5 * 60 * 1000 // 5 minutes
    };
    
    await contextManager.initialize(testConfig);
  });
  
  afterEach(async () => {
    // Cleanup after each test
    await contextManager.cleanup();
  });
  
  // Tests
  
  test('should initialize successfully', () => {
    expect(contextManager).toBeDefined();
    expect(contextManager.initialize).toBeDefined();
    expect(contextManager.addMessage).toBeDefined();
    expect(contextManager.getContext).toBeDefined();
    expect(contextManager.summarizeContext).toBeDefined();
    expect(contextManager.clearContext).toBeDefined();
  });
  
  test('should add a message to context', async () => {
    const result = await contextManager.addMessage(conversationId, sampleMessage);
    
    expect(result).toBe(true);
    
    // Verify context was updated
    const context = await contextManager.getContext(conversationId);
    expect(context.messages).toHaveLength(1);
    expect(context.messages[0].content).toBe(sampleMessage.content);
    expect(context.messages[0].role).toBe('user');
  });
  
  test('should add multiple messages and maintain order', async () => {
    // Add user message
    await contextManager.addMessage(conversationId, sampleMessage);
    
    // Add agent response
    await contextManager.addMessage(conversationId, agentResponse);
    
    // Verify context contains both messages in the correct order
    const context = await contextManager.getContext(conversationId);
    expect(context.messages).toHaveLength(2);
    expect(context.messages[0].content).toBe(sampleMessage.content);
    expect(context.messages[0].role).toBe('user');
    expect(context.messages[1].content).toBe(agentResponse.content);
    expect(context.messages[1].role).toBe('assistant');
  });
  
  test('should enforce maximum context window size', async () => {
    // Add more messages than the max context size
    const maxMessages = 25; // More than our configured max of 20
    
    for (let i = 0; i < maxMessages; i++) {
      await contextManager.addMessage(conversationId, {
        content: `Message ${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        userId: i % 2 === 0 ? userId : undefined,
        agentId: i % 2 === 0 ? undefined : agentId,
        timestamp: new Date().toISOString()
      });
    }
    
    // Verify context enforces the maximum size
    const context = await contextManager.getContext(conversationId);
    expect(context.messages.length).toBeLessThanOrEqual(contextManager.config.maxContextMessages);
    
    // Verify the oldest messages were removed
    expect(context.messages[0].content).not.toBe('Message 0');
    expect(context.messages[0].content).toBe(`Message ${maxMessages - contextManager.config.maxContextMessages}`);
  });
  
  test('should generate a summary when message count exceeds threshold', async () => {
    // Mock the Groq API response for this test
    const mockSummary = 'User asked about astronomy book recommendations. Agent suggested books by Hawking and Sagan.';
    const groqClient = require('groq-sdk')();
    groqClient.chat.completions.create.mockResolvedValueOnce({
      choices: [{ message: { content: mockSummary } }]
    });
    
    // Add enough messages to trigger summarization
    const thresholdMessages = contextManager.config.summarizationThreshold + 1;
    
    for (let i = 0; i < thresholdMessages; i++) {
      await contextManager.addMessage(conversationId, {
        content: `Message ${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        userId: i % 2 === 0 ? userId : undefined,
        agentId: i % 2 === 0 ? undefined : agentId,
        timestamp: new Date().toISOString()
      });
    }
    
    // Force summarization
    await contextManager.summarizeContext(conversationId);
    
    // Verify the Groq API was called
    expect(groqClient.chat.completions.create).toHaveBeenCalled();
    
    // Get the context and verify it has a summary
    const context = await contextManager.getContext(conversationId);
    expect(context.summary).toBe(mockSummary);
  });
  
  test('should return empty context for non-existent conversation', async () => {
    const context = await contextManager.getContext('non-existent-id');
    
    expect(context).toEqual({
      messages: [],
      summary: '',
      lastUpdated: expect.any(String)
    });
  });
  
  test('should clear context for a conversation', async () => {
    // Add some messages
    await contextManager.addMessage(conversationId, sampleMessage);
    await contextManager.addMessage(conversationId, agentResponse);
    
    // Verify context has messages
    let context = await contextManager.getContext(conversationId);
    expect(context.messages).toHaveLength(2);
    
    // Clear the context
    await contextManager.clearContext(conversationId);
    
    // Verify context is empty
    context = await contextManager.getContext(conversationId);
    expect(context.messages).toHaveLength(0);
    expect(context.summary).toBe('');
  });
  
  test('should cache context and return cached version', async () => {
    // Add a message
    await contextManager.addMessage(conversationId, sampleMessage);
    
    // Get the context (this should cache it)
    await contextManager.getContext(conversationId);
    
    // Add another message
    await contextManager.addMessage(conversationId, agentResponse);
    
    // Mock implementation to track cache hits
    const originalGetContext = contextManager.getContextFromCache;
    let cacheHit = false;
    
    contextManager.getContextFromCache = jest.fn().mockImplementation((id) => {
      const result = originalGetContext.call(contextManager, id);
      if (result) cacheHit = true;
      return result;
    });
    
    // Verify cache is used when timeout hasn't expired
    await contextManager.getContext(conversationId, true); // forceRefresh = true
    expect(cacheHit).toBe(false);
    
    await contextManager.getContext(conversationId); // Use cache
    expect(cacheHit).toBe(true);
    
    // Restore original method
    contextManager.getContextFromCache = originalGetContext;
  });
  
  test('should integrate with memory manager for context enrichment', async () => {
    // Setup memory manager mock for this test
    const memoryManager = require('../../src/memory/memoryManager.js');
    
    // Add a message and retrieve context with memory enrichment
    await contextManager.addMessage(conversationId, sampleMessage);
    
    const enrichedContext = await contextManager.getEnrichedContext(conversationId, {
      query: 'astronomy books',
      limit: 3
    });
    
    // Verify memory manager was called
    expect(memoryManager.getRelevantMemories).toHaveBeenCalled();
    
    // Verify context contains both messages and relevant memories
    expect(enrichedContext.messages).toHaveLength(1);
    expect(enrichedContext.relevantMemories).toHaveLength(1);
    expect(enrichedContext.relevantMemories[0].content).toContain('astronomy');
  });
});

