import { Groq } from 'groq-sdk';
import config from '../config.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Class representing a context message
 */
class ContextMessage {
  /**
   * Create a context message
   * @param {Object} params - Message parameters
   * @param {string} params.id - Unique identifier
   * @param {string} params.content - Message content
   * @param {string} params.role - Message role (user, assistant, system, or an agentId)
   * @param {Date} params.timestamp - Message timestamp
   * @param {string} [params.userId] - ID of the user who sent the message (if applicable)
   * @param {string} [params.agentId] - ID of the agent who sent the message (if applicable)
   * @param {Object} [params.metadata] - Additional metadata
   */
  constructor({
    id = uuidv4(),
    content,
    role,
    timestamp = new Date(),
    userId = null,
    agentId = null,
    metadata = {}
  }) {
    this.id = id;
    this.content = content;
    this.role = role;
    this.timestamp = timestamp;
    this.userId = userId;
    this.agentId = agentId;
    this.metadata = metadata;
  }

  /**
   * Convert message to JSON
   * @returns {Object} JSON representation of message
   */
  toJSON() {
    return {
      id: this.id,
      content: this.content,
      role: this.role,
      timestamp: this.timestamp.toISOString(),
      userId: this.userId,
      agentId: this.agentId,
      metadata: this.metadata
    };
  }

  /**
   * Create message from JSON
   * @param {Object} json - JSON representation of message
   * @returns {ContextMessage} Message instance
   */
  static fromJSON(json) {
    return new ContextMessage({
      id: json.id,
      content: json.content,
      role: json.role,
      timestamp: new Date(json.timestamp),
      userId: json.userId,
      agentId: json.agentId,
      metadata: json.metadata
    });
  }

  /**
   * Convert to format suitable for AI models
   * @returns {Object} Message in AI model format
   */
  toModelFormat() {
    return {
      role: this.role,
      content: this.content
    };
  }
}

/**
 * Class representing a context summary
 */
class ContextSummary {
  /**
   * Create a context summary
   * @param {Object} params - Summary parameters
   * @param {string} params.id - Unique identifier
   * @param {string} params.content - Summary content
   * @param {Date} params.timestamp - Summary timestamp
   * @param {string[]} params.replaces - IDs of messages this summary replaces
   * @param {Object} [params.metadata] - Additional metadata
   */
  constructor({
    id = uuidv4(),
    content,
    timestamp = new Date(),
    replaces = [],
    metadata = {}
  }) {
    this.id = id;
    this.content = content;
    this.timestamp = timestamp;
    this.replaces = replaces;
    this.metadata = metadata;
  }

  /**
   * Convert summary to JSON
   * @returns {Object} JSON representation of summary
   */
  toJSON() {
    return {
      id: this.id,
      content: this.content,
      timestamp: this.timestamp.toISOString(),
      replaces: this.replaces,
      metadata: this.metadata
    };
  }

  /**
   * Create summary from JSON
   * @param {Object} json - JSON representation of summary
   * @returns {ContextSummary} Summary instance
   */
  static fromJSON(json) {
    return new ContextSummary({
      id: json.id,
      content: json.content,
      timestamp: new Date(json.timestamp),
      replaces: json.replaces,
      metadata: json.metadata
    });
  }

  /**
   * Convert to a context message for inclusion in context
   * @returns {ContextMessage} Message instance
   */
  toContextMessage() {
    return new ContextMessage({
      id: this.id,
      content: this.content,
      role: 'system',
      timestamp: this.timestamp,
      metadata: {
        ...this.metadata,
        isSummary: true,
        replaces: this.replaces
      }
    });
  }
}

/**
 * Class for managing conversation context
 */
class ContextManager {
  /**
   * Create a context manager
   */
  constructor() {
    this.maxContextMessages = config.context.maxContextMessages;
    this.summarizationThreshold = config.context.summarizationThreshold;
    this.maxSummaryLength = config.context.maxSummaryLength;
    this.cacheTimeout = config.context.cacheTimeout;
    
    this.messages = []; // All current context messages
    this.summaries = []; // Summaries generated
    
    this.groq = new Groq({ apiKey: config.api.groq.apiKey });
    
    this.summarizationQueue = [];
    this.isSummarizing = false;
    this.summaryCache = new Map(); // Cache for summaries
    this.initialized = false;
  }

  /**
   * Initialize the context manager
   */
  async initialize() {
    try {
      // // Add initial system message if needed
      // this.addContextMessage({
      //   content: "The conversation begins. This is a multi-agent AI system with memory and context management.",
      //   role: 'system'
      // });
      
      this.initialized = true;
      console.log("Context Manager initialized");
      
      // Set up cache cleanup interval
      setInterval(() => this._cleanupCache(), this.cacheTimeout);
    } catch (error) {
      console.error("Failed to initialize Context Manager:", error);
      throw error;
    }
  }

  /**
   * Add a message to the context
   * @param {Object} messageData - Message data
   * @param {string} messageData.content - Message content
   * @param {string} messageData.role - Message role (user, assistant, system, or an agentId)
   * @param {Date} [messageData.timestamp] - Message timestamp
   * @param {string} [messageData.userId] - ID of the user who sent the message
   * @param {string} [messageData.agentId] - ID of the agent who sent the message
   * @param {Object} [messageData.metadata] - Additional metadata
   * @returns {ContextMessage} The added message
   */
  addContextMessage({
    content,
    role,
    timestamp = new Date(),
    userId = null,
    agentId = null,
    metadata = {}
  }) {
    try {
      if (!this.initialized) {
        this.initialize();
      }

      if (!content || !role) {
        throw new Error('Message content and role are required');
      }

      // Create message instance
      const message = new ContextMessage({
        content,
        role,
        timestamp,
        userId,
        agentId,
        metadata
      });

      // Add message to context
      this.messages.push(message);
      
      // Check if we need to trigger summarization
      if (this._shouldSummarize()) {
        this._queueSummarization();
      }
      
      // If we exceed the maximum context size, we need to remove old messages
      this._enforceContextSize();

      console.log(`Context message added with ID: ${message.id}`);
      return message;
    } catch (error) {
      console.error('Failed to add context message:', error);
      throw error;
    }
  }

  /**
   * Get the current context summary
   * @returns {Promise<string>} Summary of the current context
   */
  async getCurrentContextSummary() {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      // If there are no messages, return empty summary
      if (this.messages.length === 0) {
        return "No conversation context available.";
      }

      // Check if we have a cached summary
      const cacheKey = this._getCacheKey();
      if (this.summaryCache.has(cacheKey)) {
        const { summary, timestamp } = this.summaryCache.get(cacheKey);
        
        // If the cache is recent enough, use it
        if (Date.now() - timestamp < this.cacheTimeout) {
          return summary;
        }
      }

      // Generate a new summary
      const summary = await this._generateSummary(this.messages);
      
      // Cache the summary
      this.summaryCache.set(cacheKey, {
        summary,
        timestamp: Date.now()
      });

      return summary;
    } catch (error) {
      console.error('Failed to get context summary:', error);
      return "Failed to generate context summary due to an error.";
    }
  }

  /**
   * Get the full context as an array of messages
   * @param {boolean} [formatted=false] - Whether to return messages in AI model format
   * @returns {Array} Array of context messages
   */
  getFullContext(formatted = false) {
    try {
      // Return the context in the requested format
      if (formatted) {
        return this.messages.map(msg => msg.toModelFormat());
      }
      return [...this.messages];
    } catch (error) {
      console.error('Failed to get full context:', error);
      throw error;
    }
  }

  /**
   * Clear the context
   * @param {boolean} [keepSystemMessages=true] - Whether to keep system messages
   * @returns {boolean} Success indicator
   */
  clearContext(keepSystemMessages = true) {
    try {
      if (keepSystemMessages) {
        // Only keep system messages
        this.messages = this.messages.filter(msg => msg.role === 'system');
      } else {
        // Clear all messages
        this.messages = [];
      }
      
      // Clear summaries and cache
      this.summaries = [];
      this.summaryCache.clear();
      this.summarizationQueue = [];
      
      console.log(`Context cleared, kept system messages: ${keepSystemMessages}`);
      return true;
    } catch (error) {
      console.error('Failed to clear context:', error);
      throw error;
    }
  }

  /**
   * Generate a summary of messages using Groq API
   * @param {ContextMessage[]} messages - Messages to summarize
   * @returns {Promise<string>} Generated summary
   * @private
   */
  async _generateSummary(messages) {
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Format messages for the AI model
    const formattedMessages = [
      {
        role: 'system',
        content: `You are a context summarizer. Your task is to summarize the following conversation in a concise way, highlighting key points, decisions, and information. Keep your summary under ${this.maxSummaryLength} characters.`
      },
      ...messages.map(msg => msg.toModelFormat()),
      {
        role: 'user',
        content: 'Please provide a concise summary of this conversation that captures the essential information and context.'
      }
    ];

    try {
      // Call Groq API
      const response = await this.groq.chat.completions.create({
        messages: formattedMessages,
        model: config.api.groq.summaryModel,
        temperature: 0.3, // Lower temperature for more consistent summaries
        max_tokens: this.maxSummaryLength / 4, // Conservative estimate of tokens needed
      });

      // Extract and return the summary
      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('Failed to generate summary with Groq API:', error);
      // Fallback to a basic summary
      return `Conversation with ${messages.length} messages over time period ${messages[0].timestamp.toISOString()} to ${messages[messages.length - 1].timestamp.toISOString()}.`;
    }
  }

  /**
   * Check if we need to summarize the context
   * @returns {boolean} Whether summarization should be triggered
   * @private
   */
  _shouldSummarize() {
    // If we have more messages than the threshold, trigger summarization
    return this.messages.length >= this.summarizationThreshold;
  }

  /**
   * Queue a summarization task
   * @private
   */
  _queueSummarization() {
    // Add the current messages to the summarization queue
    this.summarizationQueue.push([...this.messages]);
    
    // If we're not already summarizing, start the process
    if (!this.isSummarizing) {
      this._processSummarizationQueue();
    }
  }

  /**
   * Process the summarization queue
   * @private
   */
  async _processSummarizationQueue() {
    // If there's nothing to summarize, return
    if (this.summarizationQueue.length === 0) {
      this.isSummarizing = false;
      return;
    }
    
    this.isSummarizing = true;
    
    try {
      // Get the next batch of messages to summarize
      const messagesToSummarize = this.summarizationQueue.shift();
      
      // Generate a summary
      const summaryContent = await this._generateSummary(messagesToSummarize);
      
      // Create a summary object
      const summary = new ContextSummary({
        content: summaryContent,
        timestamp: new Date(),
        replaces: messagesToSummarize.map(msg => msg.id)
      });
      
      // Add the summary to our list
      this.summaries.push(summary);
      
      console.log(`Generated summary: ${summary.id}`);
      
      // Continue processing the queue
      this._processSummarizationQueue();
    } catch (error) {
      console.error('Error processing summarization queue:', error);
      this.isSummarizing = false;
    }
  }

  /**
   * Enforce the maximum context size by removing old messages
   * @private
   */
  _enforceContextSize() {
    // If we're under the limit, nothing to do
    if (this.messages.length <= this.maxContextMessages) {
      return;
    }
    
    // Calculate how many messages to remove
    const excessMessages = this.messages.length - this.maxContextMessages;
    
    // If we have summaries, use them to replace older messages
    if (this.summaries.length > 0) {
      // Find summaries that replace messages still in our context
      const applicableSummaries = this.summaries.filter(summary => {
        return summary.replaces.some(id => 
          this.messages.some(msg => msg.id === id)
        );
      });
      
      if (applicableSummaries.length > 0) {
        // Sort summaries by timestamp (oldest first)
        applicableSummaries.sort((a, b) => a.timestamp - b.timestamp);
        
        // Use the oldest applicable summary
        const summaryToUse = applicableSummaries[0];
        
        // Get the IDs of messages to replace
        const idsToReplace = summaryToUse.replaces;
        
        // Filter out the messages being replaced
        this.messages = this.messages.filter(msg => !idsToReplace.includes(msg.id));
        
        // Add the summary as a system message
        this.messages.unshift(summaryToUse.toContextMessage());
        
        console.log(`Replaced ${idsToReplace.length} messages with summary ${summaryToUse.id}`);
        return;
      }
    }
    
    // If we don't have applicable summaries, just remove the oldest messages
    this.messages.splice(0, excessMessages);
    console.log(`Removed ${excessMessages} oldest messages from context`);
  }

  /**
   * Generate a cache key for the current context
   * @returns {string} Cache key
   * @private
   */
  _getCacheKey() {
    // Use the IDs of all messages to create a unique key
    return this.messages.map(msg => msg.id).join('|');
  }

  /**
   * Clean up old entries from the cache
   * @private
   */
  _cleanupCache() {
    const now = Date.now();
    for (const [key, value] of this.summaryCache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.summaryCache.delete(key);
      }
    }
  }

  /**
   * Cleanup the cache when the context manager is destroyed
   */
  cleanup() {
    // Clear the cache
    this._cleanupCache();

    // Clear the context
    this.clearContext();

    // Reset initialized flag
    this.initialized = false;
    return true;
  }
}

// Create and export a singleton instance
const contextManager = new ContextManager();
export default contextManager;

// Also export the classes for direct use
export { ContextMessage, ContextSummary };

