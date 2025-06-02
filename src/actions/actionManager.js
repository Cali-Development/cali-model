/**
 * Action Manager
 * 
 * Manages agent actions and their execution
 * Handles action registration, validation, execution, and monitoring
 * Provides core actions for memory, context, places, items, and characters
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { Config, Dependencies } from './Definitions.js';

// Import managers (will be injected during initialization)
/** @type {import('../memory/memoryManager').default} */
let memoryManager;

/** @type {import('../context/contextManager').default} */
let contextManager;

/** @type {import('../scenario/scenarioManager').default} */
let scenarioManager;

/** @type {import('../time/timeManager').default} */
let timeManager;

/** @type {import('../agents/agentManager').default} */
let agentManager;

/** @type {import('../places/placeManager').default} */
let placeManager;

/** @type {import('../items/itemManager').default} */
let itemManager;

/** @type {import('../users/userManager').default} */
let userManager;

/** @type {import('../formatter/formatManager').default} */
let formatManager;

class ActionManager {
  constructor() {
    this.actions = new Map();
    this.eventEmitter = new EventEmitter();
    this.initialized = false;
    this.config = {
      enableMonitoring: true,
      actionTimeout: 30000, // 30 seconds
      maxConcurrentActions: 10
    };
    this.runningActions = new Map();
  }

  /**
   * Initialize the Action Manager
   * @param {Config} config Configuration options
   * @param {Dependencies} dependencies Injected manager dependencies
   * @returns {Promise<boolean>} Initialization success
   */
  async initialize(config = {}, dependencies = {}) {
    if (this.initialized) return true;

    // Merge config with defaults
    this.config = { ...this.config, ...config };

    // Set up dependencies
    memoryManager = dependencies.memoryManager;
    contextManager = dependencies.contextManager;
    scenarioManager = dependencies.scenarioManager;
    timeManager = dependencies.timeManager;
    agentManager = dependencies.agentManager;
    placeManager = dependencies.placeManager;
    itemManager = dependencies.itemManager;
    userManager = dependencies.userManager;
    formatManager = dependencies.formatManager;

    this.initialized = true; // Mark as initialized

    // Register core actions
    this.registerCoreActions();

    this.eventEmitter.emit('initialized');
    return true;
  }

  /**
   * Cleanup resources
   * @returns {Promise<boolean>} Cleanup success
   */
  async cleanup() {
    // Cancel any running actions
    for (const [actionId, actionPromise] of this.runningActions.entries()) {
      try {
        if (actionPromise.cancel) {
          await actionPromise.cancel();
        }
      } catch (error) {
        console.error(`Error cancelling action ${actionId}:`, error);
      }
    }
    
    // Clear action map
    this.runningActions.clear();
    
    // Clean up event listeners
    this.eventEmitter.removeAllListeners();
    
    this.initialized = false;
    return true;
  }

  /**
   * Get the event emitter
   * @returns {EventEmitter} The event emitter
   */
  getEventEmitter() {
    return this.eventEmitter;
  }

  /**
   * Register a new action
   * @param {string} actionName Action name
   * @param {Object} actionConfig Action configuration
   * @returns {boolean} Registration success
   */
  registerAction(actionName, actionConfig) {
    if (!this.initialized) {
      throw new Error('Action Manager not initialized');
    }

    if (this.actions.has(actionName)) {
      throw new Error(`Action ${actionName} already registered`);
    }

    // Validate action config
    if (!actionConfig.execute || typeof actionConfig.execute !== 'function') {
      throw new Error(`Action ${actionName} must have an execute function`);
    }

    if (!actionConfig.validate || typeof actionConfig.validate !== 'function') {
      throw new Error(`Action ${actionName} must have a validate function`);
    }

    // Create action object
    const action = {
      name: actionName,
      description: actionConfig.description || '',
      requiredParams: actionConfig.requiredParams || [],
      optionalParams: actionConfig.optionalParams || [],
      category: actionConfig.category || 'misc',
      execute: actionConfig.execute,
      validate: actionConfig.validate,
      monitor: actionConfig.monitor || null,
      timeout: actionConfig.timeout || this.config.actionTimeout,
      createdAt: new Date().toISOString()
    };

    // Save to map
    this.actions.set(actionName, action);

    // Emit event
    this.eventEmitter.emit('actionRegistered', {
      name: actionName,
      category: action.category
    });

    return true;
  }

  /**
   * Get an action by name
   * @param {string} actionName Action name
   * @returns {Object|null} The action object or null if not found
   */
  getAction(actionName) {
    if (!this.initialized) {
      throw new Error('Action Manager not initialized');
    }

    return this.actions.get(actionName) || null;
  }

  /**
   * Execute an action
   * @param {string} actionName Action name
   * @param {Object} params Action parameters
   * @param {Object} context Execution context
   * @returns {Promise<Object>} Action result
   */
  async executeAction(actionName, params = {}, context = {}) {
    if (!this.initialized) {
      throw new Error('Action Manager not initialized');
    }

    const action = this.actions.get(actionName);
    if (!action) {
      throw new Error(`Action ${actionName} not found`);
    }

    // Validate parameters
    const validationResult = await action.validate(params, context);
    if (!validationResult.valid) {
      throw new Error(`Invalid parameters for action ${actionName}: ${validationResult.error}`);
    }

    // Generate unique action ID
    const actionId = `action-${uuidv4()}`;

    // Create execution context
    const executionContext = {
      ...context,
      actionId,
      startTime: new Date().toISOString(),
      actionName
    };

    // Check if we've reached max concurrent actions
    if (this.runningActions.size >= this.config.maxConcurrentActions) {
      throw new Error(`Too many concurrent actions. Maximum is ${this.config.maxConcurrentActions}`);
    }

    // Create action promise with timeout
    const actionPromise = Promise.race([
      action.execute(params, executionContext),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Action ${actionName} timed out after ${action.timeout}ms`)), action.timeout)
      )
    ]);

    // Add cancel method if possible
    if (action.cancel) {
      actionPromise.cancel = () => action.cancel(actionId, executionContext);
    }

    // Store in running actions
    this.runningActions.set(actionId, actionPromise);

    // Emit event
    this.eventEmitter.emit('actionStarted', {
      actionId,
      name: actionName,
      params: { ...params }, // Clone params
      context: { ...executionContext }
    });

    try {
      // Execute action
      const result = await actionPromise;

      // Monitor result if enabled
      if (this.config.enableMonitoring && action.monitor) {
        try {
          const monitorResult = await action.monitor(result, params, executionContext);
          if (!monitorResult.valid) {
            console.warn(`Action ${actionName} monitor warning: ${monitorResult.warning}`);
            
            // Emit monitoring warning
            this.eventEmitter.emit('actionMonitorWarning', {
              actionId,
              name: actionName,
              warning: monitorResult.warning
            });
          }
        } catch (monitorError) {
          console.error(`Error monitoring action ${actionName}:`, monitorError);
        }
      }

      // Remove from running actions
      this.runningActions.delete(actionId);

      // Emit event
      this.eventEmitter.emit('actionCompleted', {
        actionId,
        name: actionName,
        result,
        duration: new Date() - new Date(executionContext.startTime)
      });

      return result;
    } catch (error) {
      // Remove from running actions
      this.runningActions.delete(actionId);

      // Emit event
      this.eventEmitter.emit('actionFailed', {
        actionId,
        name: actionName,
        error: error.message,
        duration: new Date() - new Date(executionContext.startTime)
      });

      throw error;
    }
  }

  /**
   * Get all actions
   * @param {string} category Optional category filter
   * @returns {Array} Array of action objects
   */
  getAllActions(category = null) {
    if (!this.initialized) {
      throw new Error('Action Manager not initialized');
    }

    let actions = Array.from(this.actions.values());

    // Apply category filter
    if (category) {
      actions = actions.filter(action => action.category === category);
    }

    return actions;
  }

  /**
   * Register core actions
   * @private
   */
  registerCoreActions() {
    // Register memory actions
    this.registerMemoryActions();

    // Register context actions
    this.registerContextActions();

    // Register place actions
    this.registerPlaceActions();

    // Register item actions
    this.registerItemActions();

    // Register character actions
    this.registerCharacterActions();

    // Register utility actions
    this.registerUtilityActions();
  }

  /**
   * Register memory actions
   * @private
   */
  registerMemoryActions() {
    // Add Memory action
    this.registerAction('addMemory', {
      description: 'Add a new memory',
      category: 'memory',
      requiredParams: ['content'],
      optionalParams: ['importance', 'agentId', 'keywords', 'metadata'],
      validate: async (params, context) => {
        if (!params.content || typeof params.content !== 'string') {
          return { valid: false, error: 'Memory content is required and must be a string' };
        }
        if (params.importance && (typeof params.importance !== 'number' || params.importance < 0 || params.importance > 1)) {
          return { valid: false, error: 'Importance must be a number between 0 and 1' };
        }
        if (params.keywords && !Array.isArray(params.keywords)) {
          return { valid: false, error: 'Keywords must be an array' };
        }
        return { valid: true };
      },
      execute: async (params, context) => {
        if (!memoryManager) {
          throw new Error('Memory Manager not available');
        }

        // Create memory object
        const memory = {
          content: params.content,
          agentId: params.agentId || context.agentId,
          importance: params.importance || 0.5,
          keywords: params.keywords || [],
          metadata: params.metadata || {},
          source: 'action'
        };

        // Add memory
        const memoryId = memoryManager.addMemory(memory);

        return {
          success: true,
          memoryId,
          message: 'Memory added successfully'
        };
      }
    });

    // Get Relevant Memories action
    this.registerAction('getRelevantMemories', {
      description: 'Get memories relevant to a query',
      category: 'memory',
      requiredParams: ['query'],
      optionalParams: ['agentId', 'limit', 'threshold'],
      validate: async (params, context) => {
        if (!params.query || typeof params.query !== 'string') {
          return { valid: false, error: 'Query is required and must be a string' };
        }
        if (params.limit && (typeof params.limit !== 'number' || params.limit <= 0)) {
          return { valid: false, error: 'Limit must be a positive number' };
        }
        if (params.threshold && (typeof params.threshold !== 'number' || params.threshold < 0 || params.threshold > 1)) {
          return { valid: false, error: 'Threshold must be a number between 0 and 1' };
        }
        return { valid: true };
      },
      execute: async (params, context) => {
        if (!memoryManager) {
          throw new Error('Memory Manager not available');
        }

        // Get relevant memories
        const memories = await memoryManager.getRelevantMemories({
          query: params.query,
          agentId: params.agentId || context.agentId,
          limit: params.limit || 10,
          threshold: params.threshold || 0.5
        });

        return {
          success: true,
          memories,
          count: memories.length,
          query: params.query
        };
      }
    });

    // Search Memories action
    this.registerAction('searchMemories', {
      description: 'Search memories by keywords',
      category: 'memory',
      requiredParams: ['keywords'],
      optionalParams: ['agentId', 'limit'],
      validate: async (params, context) => {
        if (!params.keywords || !Array.isArray(params.keywords) || params.keywords.length === 0) {
          return { valid: false, error: 'Keywords are required and must be a non-empty array' };
        }
        if (params.limit && (typeof params.limit !== 'number' || params.limit <= 0)) {
          return { valid: false, error: 'Limit must be a positive number' };
        }
        return { valid: true };
      },
      execute: async (params, context) => {
        if (!memoryManager) {
          throw new Error('Memory Manager not available');
        }

        // Search memories
        const memories = await memoryManager.searchMemories({
          keywords: params.keywords,
          agentId: params.agentId || context.agentId,
          limit: params.limit || 10
        });

        return {
          success: true,
          memories,
          count: memories.length,
          keywords: params.keywords
        };
      }
    });

    // Get All Memories action
    this.registerAction('getAllMemories', {
      description: 'Get all memories for an agent',
      category: 'memory',
      requiredParams: [],
      optionalParams: ['agentId', 'limit', 'offset'],
      validate: async (params, context) => {
        if (params.limit && (typeof params.limit !== 'number' || params.limit <= 0)) {
          return { valid: false, error: 'Limit must be a positive number' };
        }
        if (params.offset && (typeof params.offset !== 'number' || params.offset < 0)) {
          return { valid: false, error: 'Offset must be a non-negative number' };
        }
        return { valid: true };
      },
      execute: async (params, context) => {
        if (!memoryManager) {
          throw new Error('Memory Manager not available');
        }

        // Get all memories
        const memories = await memoryManager.getAgentMemories(
          params.agentId || context.agentId,
          params.limit || 100,
          params.offset || 0
        );

        return {
          success: true,
          memories,
          count: memories.length
        };
      }
    });
  }

  /**
   * Register context actions
   * @private
   */
  registerContextActions() {
    // Get Context action
    this.registerAction('getContext', {
      description: 'Get conversation context',
      category: 'context',
      requiredParams: ['conversationId'],
      optionalParams: [],
      validate: async (params, context) => {
        if (!params.conversationId || typeof params.conversationId !== 'string') {
          return { valid: false, error: 'Conversation ID is required and must be a string' };
        }
        return { valid: true };
      },
      execute: async (params, context) => {
        if (!contextManager) {
          throw new Error('Context Manager not available');
        }

        // Get context
        const contextData = await contextManager.getContext(params.conversationId);

        return {
          success: true,
          context: contextData
        };
      }
    });

    // Get Enriched Context action
    this.registerAction('getEnrichedContext', {
      description: 'Get enriched conversation context with relevant memories',
      category: 'context',
      requiredParams: ['conversationId'],
      optionalParams: ['query', 'limit'],
      validate: async (params, context) => {
        if (!params.conversationId || typeof params.conversationId !== 'string') {
          return { valid: false, error: 'Conversation ID is required and must be a string' };
        }
        if (params.limit && (typeof params.limit !== 'number' || params.limit <= 0)) {
          return { valid: false, error: 'Limit must be a positive number' };
        }
        return { valid: true };
      },
      execute: async (params, context) => {
        if (!contextManager) {
          throw new Error('Context Manager not available');
        }

        // Get enriched context
        const enrichedContext = await contextManager.getEnrichedContext(
          params.conversationId,
          {
            query: params.query || '',
            limit: params.limit || 5
          }
        );

        return {
          success: true,
          context: enrichedContext
        };
      }
    });

    // Add Context Message action
    this.registerAction('addContextMessage', {
      description: 'Add a message to conversation context',
      category: 'context',
      requiredParams: ['conversationId', 'content', 'role'],
      optionalParams: ['userId', 'agentId'],
      validate: async (params, context) => {
        if (!params.conversationId || typeof params.conversationId !== 'string') {
          return { valid: false, error: 'Conversation ID is required and must be a string' };
        }
        if (!params.content || typeof params.content !== 'string') {
          return { valid: false, error: 'Content is required and must be a string' };
        }
        if (!params.role || !['user', 'assistant', 'system'].includes(params.role)) {
          return { valid: false, error: 'Role is required and must be one of: user, assistant, system' };
        }
        if (params.role === 'user' && !params.userId && !context.userId) {
          return { valid: false, error: 'User ID is required for user messages' };
        }
        if (params.role === 'assistant' && !params.agentId && !context.agentId) {
          return { valid: false, error: 'Agent ID is required for assistant messages' };
        }
        return { valid: true };
      },
      execute: async (params, context) => {
        if (!contextManager) {
          throw new Error('Context Manager not available');
        }

        // Create message object
        const message = {
          content: params.content,
          role: params.role,
          timestamp: new Date().toISOString()
        };

        // Add role-specific fields
        if (params.role === 'user') {
          message.userId = params.userId || context.userId;
        } else if (params.role === 'assistant') {
          message.agentId = params.agentId || context.agentId;
        }

        // Add message to context
        await contextManager.addMessage(params.conversationId, message);

        return {
          success: true,
          message: 'Context message added successfully'
        };
      }
    });

    // Summarize Context action
    this.registerAction('summarizeContext', {
      description: 'Generate a summary of the conversation context',
      category: 'context',
      requiredParams: ['conversationId'],
      optionalParams: [],
      validate: async (params, context) => {
        if (!params.conversationId || typeof params.conversationId !== 'string') {
          return { valid: false, error: 'Conversation ID is required and must be a string' };
        }
        return { valid: true };
      },
      execute: async (params, context) => {
        if (!contextManager) {
          throw new Error('Context Manager not available');
        }

        // Summarize context
        const summary = await contextManager.summarizeContext(params.conversationId);

        return {
          success: true,
          summary
        };
      }
    });
  }

  /**
   * Register place actions
   * @private
   */
  registerPlaceActions() {
    // Create Place action
    this.registerAction('createPlace', {
      description: 'Create a new place',
      category: 'place',
      requiredParams: ['name', 'description'],
      optionalParams: ['type', 'coordinates', 'properties', 'parentId'],
      validate: async (params, context) => {
        if (!params.name || typeof params.name !== 'string') {
          return { valid: false, error: 'Place name is required and must be a string' };
        }
        if (!params.description || typeof params.description !== 'string') {
          return { valid: false, error: 'Place description is required and must be a string' };
        }
        if (params.parentId && typeof params.parentId !== 'string') {
          return { valid: false, error: 'Parent ID must be a string' };
        }
        return { valid: true };
      },
      execute: async (params, context) => {
        if (!placeManager) {
          throw new Error('Place Manager not available');
        }

        // Create place object
        const place = {
          name: params.name,
          description: params.description,
          type: params.type || 'location',
          coordinates: params.coordinates || { x: 0, y: 0 },
          properties: params.properties || {},
          parentId: params.parentId || null
        };

        // Create place
        const placeId = await placeManager.addPlace(place);

        return {
          success: true,
          placeId,
          message: `Place "${params.name}" created successfully`
        };
      },
      monitor: async (result, params, context) => {
        // Ensure place was created with a valid ID
        if (!result.placeId) {
          return { valid: false, warning: 'Place was created but no ID was returned' };
        }

        // Check if the place name is realistic and appropriate
        if (params.name.length < 3) {
          return { valid: false, warning: 'Place name is unusually short' };
        }

        if (params.name.length > 100) {
          return { valid: false, warning: 'Place name is unusually long' };
        }

        return { valid: true };
      }
    });

    // Connect Places action
    this.registerAction('connectPlaces', {
      description: 'Create a connection between two places',
      category: 'place',
      requiredParams: ['source', 'target', 'type'],
      optionalParams: ['bidirectional', 'properties'],
      validate: async (params, context) => {
        if (!params.source || typeof params.source !== 'string') {
          return { valid: false, error: 'Source place ID is required and must be a string' };
        }
        if (!params.target || typeof params.target !== 'string') {
          return { valid: false, error: 'Target place ID is required and must be a string' };
        }
        if (!params.type || typeof params.type !== 'string') {
          return { valid: false, error: 'Connection type is required and must be a string' };
        }
        return { valid: true };
      },
      execute: async (params, context) => {
        if (!placeManager) {
          throw new Error('Place Manager not available');
        }

        // Create connection object
        const connection = {
          source: params.source,
          target: params.target,
          type: params.type,
          bidirectional: params.bidirectional !== false, // Default to true
          properties: params.properties || {}
        };

        // Create connection
        const connectionId = await placeManager.createConnection(connection);

        return {
          success: true,
          connectionId,
          message: `Connection between ${params.source} and ${params.target} created successfully`
        };
      }
    });

    // Find Path action
    this.registerAction('findPath', {
      description: 'Find a path between two places',
      category: 'place',
      requiredParams: ['from', 'to'],
      optionalParams: [],
      validate: async (params, context) => {
        if (!params.from || typeof params.from !== 'string') {
          return { valid: false, error: 'Source place ID is required and must be a string' };
        }
        if (!params.to || typeof params.to !== 'string') {
          return { valid: false, error: 'Destination place ID is required and must be a string' };
        }
        return { valid: true };
      },
      execute: async (params, context) => {
        if (!placeManager) {
          throw new Error('Place Manager not available');
        }

        // Find path
        const path = placeManager.findPath(params.from, params.to);

        if (!path) {
          return {
            success: false,
            message: `No path found between ${params.from} and ${params.to}`
          };
        }

        return {
          success: true,
          path,
          message: `Path found with ${path.places.length} places and total distance ${path.totalDistance}`
        };
      }
    });

    // Move Agent To Place action
    this.registerAction('moveAgentToPlace', {
      description: 'Move an agent to a place',
      category: 'place',
      requiredParams: ['agentId', 'placeId'],
      optionalParams: ['requirePath'],
      validate: async (params, context) => {
        if (!params.agentId || typeof params.agentId !== 'string') {
          return { valid: false, error: 'Agent ID is required and must be a string' };
        }
        if (!params.placeId || typeof params.placeId !== 'string') {
          return { valid: false, error: 'Place ID is required and must be a string' };
        }
        return { valid: true };
      },
      execute: async (params, context) => {
        if (!placeManager) {
          throw new Error('Place Manager not available');
        }

        // Move agent to place
        await placeManager.moveAgentToPlace(
          params.agentId,
          params.placeId,
          { requirePath: params.requirePath === true }
        );

        return {
          success: true,
          message: `Agent ${params.agentId} moved to place ${params.placeId} successfully`
        };
      },
      monitor: async (result, params, context) => {
        // If time manager is available, check time-based constraints
        if (timeManager) {
          const agent = agentManager?.getAgent(params.agentId);
          const place = placeManager?.getPlace(params.placeId);
          
          if (agent && place) {
            // Check if the agent has moved too many times in a short period
            const recentMoves = await memoryManager?.searchMemories({
              keywords: ['moved', 'location', agent.name],
              agentId: params.agentId,
              limit: 10
            });
            
            if (recentMoves && recentMoves.length > 0) {
              const lastMoveTime = new Date(recentMoves[0].timestamp);
              const currentTime = new Date(timeManager.getInUniverseTime());
              const timeDiff = (currentTime - lastMoveTime) / 1000; // in seconds
              
              // If the agent moved less than 5 minutes ago (in universe time)
              if (timeDiff < 300) {
                return { 
                  valid: false, 
                  warning: `Agent ${agent.name} is moving too frequently (${timeDiff.toFixed(1)} seconds since last move)`
                };
              }
            }
          }
        }
        
        return { valid: true };
      }
    });

    // Get Adjacent Places action
    this.registerAction('getAdjacentPlaces', {
      description: 'Get places adjacent to a given place',
      category: 'place',
      requiredParams: ['placeId'],
      optionalParams: [],
      validate: async (params, context) => {
        if (!params.placeId || typeof params.placeId !== 'string') {
          return { valid: false, error: 'Place ID is required and must be a string' };
        }
        return { valid: true };
      },
      execute: async (params, context) => {
        if (!placeManager) {
          throw new Error('Place Manager not available');
        }

        // Get adjacent places
        const places = placeManager.getAdjacentPlaces(params.placeId);

        return {
          success: true,
          places,
          count: places.length
        };
      }
    });
  }

  /**
   * Register item actions
   * @private
   */
  registerItemActions() {
    // Create Item action
    this.registerAction('createItem', {
      description: 'Create a new item',
      category: 'item',
      requiredParams: ['name', 'description'],
      optionalParams: ['blueprintId', 'ownerId', 'locationId', 'properties'],
      validate: async (params, context) => {
        if (!params.name || typeof params.name !== 'string') {
          return { valid: false, error: 'Item name is required and must be a string' };
        }
        if (!params.description || typeof params.description !== 'string') {
          return { valid: false, error: 'Item description is required and must be a string' };
        }
        if (params.ownerId && params.locationId) {
          return { valid: false, error: 'Item cannot have both owner and location simultaneously' };
        }
        return { valid: true };
      },
      execute: async (params, context) => {
        if (!itemManager) {
          throw new Error('Item Manager not available');
        }

        // Create item object
        const item = {
          name: params.name,
          description: params.description,
          blueprintId: params.blueprintId,
          ownerId: params.ownerId || context.agentId,
          locationId: params.locationId,
          properties: params.properties || {}
        };

        // Validate item with AI if available
        if (params.validate !== false) {
          try {
            const validationResult = await itemManager.validateItemWithAI(item);
            if (!validationResult.valid) {
              return {
                success: false,
                message: `Item validation failed: ${validationResult.feedback}`,
                suggestedProperties: validationResult.suggestedProperties
              };
            }
            
            // Apply suggested properties if any
            if (validationResult.suggestedProperties) {
              item.properties = {
                ...item.properties,
                ...validationResult.suggestedProperties
              };
            }
          } catch (error) {
            console.warn('Item AI validation failed, proceeding anyway:', error);
          }
        }

        // Create item
        const itemId = await itemManager.createItem(item);

        return {
          success: true,
          itemId,
          message: `Item "${params.name}" created successfully`
        };
      },
      monitor: async (result, params, context) => {
        // Ensure item was created with a valid ID
        if (!result.itemId) {
          return { valid: false, warning: 'Item was created but no ID was returned' };
        }

        // Perform some basic checks on the item properties
        if (params.name.length < 2) {
          return { valid: false, warning: 'Item name is unusually short' };
        }

        if (params.name.length > 100) {
          return { valid: false, warning: 'Item name is unusually long' };
        }

        return { valid: true };
      }
    });

    // Use Item action
    this.registerAction('useItem', {
      description: 'Use an item',
      category: 'item',
      requiredParams: ['itemId', 'useType'],
      optionalParams: ['userId', 'targetId'],
      validate: async (params, context) => {
        if (!params.itemId || typeof params.itemId !== 'string') {
          return { valid: false, error: 'Item ID is required and must be a string' };
        }
        if (!params.useType || typeof params.useType !== 'string') {
          return { valid: false, error: 'Use type is required and must be a string' };
        }
        return { valid: true };
      },
      execute: async (params, context) => {
        if (!itemManager) {
          throw new Error('Item Manager not available');
        }

        // Use item
        const result = await itemManager.useItem(params.itemId, {
          useType: params.useType,
          userId: params.userId || context.agentId,
          targetId: params.targetId
        });

        return {
          success: true,
          effect: result.effect,
          message: `Item ${params.itemId} used successfully with type ${params.useType}`
        };
      },
      monitor: async (result, params, context) => {
        // Check if the use type is valid for the item
        if (!result.effect) {
          return { valid: false, warning: 'Item use did not produce any effect' };
        }

        return { valid: true };
      }
    });

    // Transfer Item action
    this.registerAction('transferItem', {
      description: 'Transfer an item from one owner/location to another',
      category: 'item',
      requiredParams: ['itemId', 'toId'],
      optionalParams: ['fromId'],
      validate: async (params, context) => {
        if (!params.itemId || typeof params.itemId !== 'string') {
          return { valid: false, error: 'Item ID is required and must be a string' };
        }
        if (!params.toId || typeof params.toId !== 'string') {
          return { valid: false, error: 'Destination ID is required and must be a string' };
        }
        return { valid: true };
      },
      execute: async (params, context) => {
        if (!itemManager) {
          throw new Error('Item Manager not available');
        }

        // Get the item to determine its current owner/location
        const item = await itemManager.getItem(params.itemId);
        if (!item) {
          throw new Error(`Item ${params.itemId} not found`);
        }

        // Transfer item
        await itemManager.transferItem(params.itemId, {
          fromId: params.fromId || item.ownerId || item.locationId,
          toId: params.toId
        });

        return {
          success: true,
          message: `Item ${params.itemId} transferred to ${params.toId} successfully`
        };
      },
      monitor: async (result, params, context) => {
        // For transfers, check if source and destination are in the same location
        if (agentManager && placeManager) {
          try {
            // Check if we're transferring between agents
            const fromAgent = agentManager.getAgent(params.fromId);
            const toAgent = agentManager.getAgent(params.toId);
            
            if (fromAgent && toAgent && 
                fromAgent.state?.location && 
                toAgent.state?.location && 
                fromAgent.state.location !== toAgent.state.location) {
              
              // Check if there's a path between them
              const path = placeManager.findPath(fromAgent.state.location, toAgent.state.location);
              if (!path) {
                return { 
                  valid: false, 
                  warning: 'Transfer occurred between agents that are not in the same location or connected locations' 
                };
              }
            }
          } catch (error) {
            console.warn('Error in transfer monitoring:', error);
          }
        }

        return { valid: true };
      }
    });

    // Update Item action
    this.registerAction('updateItem', {
      description: 'Update an item\'s properties',
      category: 'item',
      requiredParams: ['itemId'],
      optionalParams: ['name', 'description', 'properties', 'condition'],
      validate: async (params, context) => {
        if (!params.itemId || typeof params.itemId !== 'string') {
          return { valid: false, error: 'Item ID is required and must be a string' };
        }
        if (Object.keys(params).length <= 1) {
          return { valid: false, error: 'At least one update parameter is required' };
        }
        if (params.condition !== undefined && (typeof params.condition !== 'number' || params.condition < 0 || params.condition > 1)) {
          return { valid: false, error: 'Condition must be a number between 0 and 1' };
        }
        return { valid: true };
      },
      execute: async (params, context) => {
        if (!itemManager) {
          throw new Error('Item Manager not available');
        }

        // Create update object
        const updates = {};
        if (params.name) updates.name = params.name;
        if (params.description) updates.description = params.description;
        if (params.properties) updates.properties = params.properties;
        if (params.condition !== undefined) updates.condition = params.condition;

        // Update item
        await itemManager.updateItem(params.itemId, updates);

        return {
          success: true,
          message: `Item ${params.itemId} updated successfully`
        };
      }
    });

    // Delete Item action
    this.registerAction('deleteItem', {
      description: 'Delete an item',
      category: 'item',
      requiredParams: ['itemId'],
      optionalParams: [],
      validate: async (params, context) => {
        if (!params.itemId || typeof params.itemId !== 'string') {
          return { valid: false, error: 'Item ID is required and must be a string' };
        }
        return { valid: true };
      },
      execute: async (params, context) => {
        if (!itemManager) {
          throw new Error('Item Manager not available');
        }

        // Delete item
        await itemManager.deleteItem(params.itemId);

        return {
          success: true,
          message: `Item ${params.itemId} deleted successfully`
        };
      }
    });

    // Create Blueprint action
    this.registerAction('createBlueprint', {
      description: 'Create a new item blueprint',
      category: 'item',
      requiredParams: ['name', 'description', 'category'],
      optionalParams: ['properties', 'uses', 'isContainer'],
      validate: async (params, context) => {
        if (!params.name || typeof params.name !== 'string') {
          return { valid: false, error: 'Blueprint name is required and must be a string' };
        }
        if (!params.description || typeof params.description !== 'string') {
          return { valid: false, error: 'Blueprint description is required and must be a string' };
        }
        if (!params.category || typeof params.category !== 'string') {
          return { valid: false, error: 'Blueprint category is required and must be a string' };
        }
        if (params.uses && !Array.isArray(params.uses)) {
          return { valid: false, error: 'Uses must be an array' };
        }
        return { valid: true };
      },
      execute: async (params, context) => {
        if (!itemManager) {
          throw new Error('Item Manager not available');
        }

        // Create blueprint object
        const blueprint = {
          name: params.name,
          description: params.description,
          category: params.category,
          properties: params.properties || {},
          uses: params.uses || [],
          isContainer: params.isContainer || false
        };

        // Create blueprint
        const blueprintId = await itemManager.createBlueprint(blueprint);

        return {
          success: true,
          blueprintId,
          message: `Blueprint "${params.name}" created successfully`
        };
      }
    });
  }

  /**
   * Register character actions
   * @private
   */
  registerCharacterActions() {
    // Create Character action
    this.registerAction('createCharacter', {
      description: 'Create a new AI-controlled character',
      category: 'character',
      requiredParams: ['name'],
      optionalParams: ['characteristics', 'properties', 'location'],
      validate: async (params, context) => {
        if (!params.name || typeof params.name !== 'string') {
          return { valid: false, error: 'Character name is required and must be a string' };
        }
        return { valid: true };
      },
      execute: async (params, context) => {
        if (!userManager) {
          throw new Error('User Manager not available');
        }

        // Create basic user data
        const userData = {
          name: params.name,
          characteristics: params.characteristics || {
            appearance: {},
            personality: {},
            background: {}
          },
          properties: params.properties || {},
          currentLocation: params.location
        };

        // Create character (made-up user)
        const userId = await userManager.createMadeUpUser(userData);

        return {
          success: true,
          userId,
          message: `Character "${params.name}" created successfully`
        };
      },
      monitor: async (result, params, context) => {
        // Ensure character was created with a valid ID
        if (!result.userId) {
          return { valid: false, warning: 'Character was created but no ID was returned' };
        }

        // Perform some basic checks
        if (params.name.length < 2) {
          return { valid: false, warning: 'Character name is unusually short' };
        }

        if (params.name.length > 50) {
          return { valid: false, warning: 'Character name is unusually long' };
        }

        return { valid: true };
      }
    });

    // Update Character action
    this.registerAction('updateCharacter', {
      description: 'Update an AI-controlled character',
      category: 'character',
      requiredParams: ['userId'],
      optionalParams: ['name', 'appearance', 'personality', 'background', 'location'],
      validate: async (params, context) => {
        if (!params.userId || typeof params.userId !== 'string') {
          return { valid: false, error: 'User ID is required and must be a string' };
        }
        if (Object.keys(params).length <= 1) {
          return { valid: false, error: 'At least one update parameter is required' };
        }
        return { valid: true };
      },
      execute: async (params, context) => {
        if (!userManager) {
          throw new Error('User Manager not available');
        }

        // Get the user to ensure it exists and is a made-up character
        const user = userManager.getUser(params.userId);
        if (!user) {
          throw new Error(`User ${params.userId} not found`);
        }

        if (!user.isMadeUp) {
          throw new Error(`User ${params.userId} is not an AI-controlled character`);
        }

        // Prepare updates
        const updates = {};
        if (params.name) updates.name = params.name;
        
        // Handle nested characteristics updates
        if (params.appearance || params.personality || params.background) {
          updates.characteristics = { ...user.characteristics };
          if (params.appearance) updates.characteristics.appearance = {
            ...updates.characteristics.appearance,
            ...params.appearance
          };
          if (params.personality) updates.characteristics.personality = {
            ...updates.characteristics.personality,
            ...params.personality
          };
          if (params.background) updates.characteristics.background = {
            ...updates.characteristics.background,
            ...params.background
          };
        }

        // Handle location update
        if (params.location) {
          // Check if location exists if placeManager is available
          if (placeManager) {
            const place = placeManager.getPlace(params.location);
            if (!place) {
              throw new Error(`Place ${params.location} not found`);
            }
          }
          
          await userManager.updateUserLocation(params.userId, params.location);
        }

        // Update user
        await userManager.updateUser(params.userId, updates);

        return {
          success: true,
          message: `Character ${params.userId} updated successfully`
        };
      }
    });

    // Interact With Character action
    this.registerAction('interactWithCharacter', {
      description: 'Interact with an AI-controlled character',
      category: 'character',
      requiredParams: ['agentId', 'yourName', 'message'],
      optionalParams: ['context'],
      validate: async (params, context) => {
        if (!params.agentId || typeof params.agentId !== 'string') {
          return { valid: false, error: 'User ID is required and must be a string' };
        }
        if (!params.message || typeof params.message !== 'string') {
          return { valid: false, error: 'Message is required and must be a string' };
        }
        return { valid: true };
      },
      execute: async (params, context) => {
        if (!userManager) {
          throw new Error('User Manager not available');
        }

        // Get the user to ensure it exists and is a made-up character
        const user = userManager.getUser(params.agentId);
        if (!user) {
          throw new Error(`User ${params.agentId} not found`);
        }

        if (!user.isMadeUp) {
          throw new Error(`User ${params.agentId} is not an AI-controlled character`);
        }

        // Generate interaction context
        const interactionContext = params.context || '';

        // Generate character response
        const response = await agentManager.generateResponse(
          params.agentId,
          {
            role: 'user',
            name: params.yourName,
            message: `${interactionContext}\n\nYou received a message: "${params.message}"`
          }
        );

        return {
          success: true,
          message: response,
          character: {
            name: user.name,
            id: user.id
          }
        };
      }
    });

    // Create Relationship action
    this.registerAction('createRelationship', {
      description: 'Create a relationship between characters or users',
      category: 'character',
      requiredParams: ['userId1', 'userId2', 'type'],
      optionalParams: ['strength', 'notes', 'bidirectional'],
      validate: async (params, context) => {
        if (!params.userId1 || typeof params.userId1 !== 'string') {
          return { valid: false, error: 'First user ID is required and must be a string' };
        }
        if (!params.userId2 || typeof params.userId2 !== 'string') {
          return { valid: false, error: 'Second user ID is required and must be a string' };
        }
        if (!params.type || typeof params.type !== 'string') {
          return { valid: false, error: 'Relationship type is required and must be a string' };
        }
        if (params.strength !== undefined && (typeof params.strength !== 'number' || params.strength < 0 || params.strength > 1)) {
          return { valid: false, error: 'Relationship strength must be a number between 0 and 1' };
        }
        return { valid: true };
      },
      execute: async (params, context) => {
        if (!userManager) {
          throw new Error('User Manager not available');
        }

        // Create relationship
        await userManager.createRelationship(params.userId1, params.userId2, {
          type: params.type,
          strength: params.strength || 0.5,
          notes: params.notes || '',
          bidirectional: params.bidirectional !== false
        });

        return {
          success: true,
          message: `Relationship of type "${params.type}" created between ${params.userId1} and ${params.userId2}`
        };
      }
    });
  }

  /**
   * Register utility actions
   * @private
   */
  registerUtilityActions() {
    // Format Message action
    this.registerAction('formatMessage', {
      description: 'Format a message using a specific template',
      category: 'utility',
      requiredParams: ['content'],
      optionalParams: ['agentId', 'formatId', 'variables'],
      validate: async (params, context) => {
        if (!params.content || typeof params.content !== 'string') {
          return { valid: false, error: 'Content is required and must be a string' };
        }
        return { valid: true };
      },
      execute: async (params, context) => {
        if (!formatManager) {
          throw new Error('Format Manager not available');
        }

        const agentId = params.agentId || context.agentId;
        const variables = params.variables || {};

        let formattedMessage;
        
        if (params.formatId) {
          // Use specific format
          const format = formatManager.getFormat(params.formatId);
          if (!format) {
            throw new Error(`Format ${params.formatId} not found`);
          }
          
          formattedMessage = formatManager.applyFormat(format.template, {
            content: params.content,
            ...variables
          });
        } else if (agentId) {
          // Use agent's format
          formattedMessage = formatManager.formatMessage(agentId, params.content, variables);
        } else {
          // Use default format
          const defaultFormat = formatManager.getDefaultFormat();
          formattedMessage = formatManager.applyFormat(defaultFormat.template, {
            content: params.content,
            ...variables
          });
        }

        return {
          success: true,
          formattedMessage
        };
      }
    });

    // Evaluate Scenario action
    this.registerAction('evaluateScenario', {
      description: 'Evaluate the current scenario state',
      category: 'utility',
      requiredParams: [],
      optionalParams: ['detail'],
      validate: async (params, context) => {
        if (params.detail && !['low', 'medium', 'high'].includes(params.detail)) {
          return { valid: false, error: 'Detail level must be one of: low, medium, high' };
        }
        return { valid: true };
      },
      execute: async (params, context) => {
        if (!scenarioManager) {
          throw new Error('Scenario Manager not available');
        }

        // Get current scenario
        const scenario = scenarioManager.getCurrentScenario();
        
        // Determine response detail level
        const detail = params.detail || 'medium';
        
        let result;
        if (detail === 'low') {
          // Just basic info
          result = {
            name: scenario.name,
            worldState: {
              time: scenario.worldState.time,
              location: scenario.worldState.location
            },
            activePlots: scenario.plots.filter(p => p.status === 'active').length
          };
        } else if (detail === 'medium') {
          // More comprehensive info
          result = {
            name: scenario.name,
            description: scenario.description,
            worldState: scenario.worldState,
            plots: scenario.plots.map(p => ({
              id: p.id,
              title: p.title,
              status: p.status
            }))
          };
        } else {
          // Full detail
          result = scenario;
        }

        return {
          success: true,
          scenario: result
        };
      }
    });

    // Get Time Status action
    this.registerAction('getTimeStatus', {
      description: 'Get information about the current time',
      category: 'utility',
      requiredParams: [],
      optionalParams: ['format'],
      validate: async (params, context) => {
        return { valid: true };
      },
      execute: async (params, context) => {
        if (!timeManager) {
          throw new Error('Time Manager not available');
        }

        // Get current times
        const realTime = timeManager.getRealTime();
        const inUniverseTime = timeManager.getInUniverseTime();
        
        // Format times if needed
        const formattedInUniverseTime = timeManager.formatTime(inUniverseTime, params.format);
        
        // Get current time scale
        const timeScale = timeManager.getTimeScale();
        
        // Get current hour, day, etc.
        const hour = timeManager.getCurrentHour();
        const day = timeManager.getCurrentDay();
        const timeOfDay = hour < 6 ? 'night' : 
                        hour < 12 ? 'morning' : 
                        hour < 18 ? 'afternoon' : 'evening';

        return {
          success: true,
          realTime,
          inUniverseTime,
          formattedTime: formattedInUniverseTime,
          timeScale,
          hour,
          day,
          timeOfDay
        };
      }
    });

    // Wait Time action
    this.registerAction('waitTime', {
      description: 'Fast forward time by a specified amount',
      category: 'utility',
      requiredParams: [],
      optionalParams: ['seconds', 'minutes', 'hours', 'days'],
      validate: async (params, context) => {
        const timeValues = [params.seconds, params.minutes, params.hours, params.days];
        if (timeValues.every(v => v === undefined)) {
          return { valid: false, error: 'At least one time unit (seconds, minutes, hours, days) must be specified' };
        }
        
        timeValues.forEach(value => {
          if (value !== undefined && (typeof value !== 'number' || value < 0)) {
            return { valid: false, error: 'Time values must be non-negative numbers' };
          }
        });
        
        return { valid: true };
      },
      execute: async (params, context) => {
        if (!timeManager) {
          throw new Error('Time Manager not available');
        }

        // Prepare time units
        const timeUnits = {};
        if (params.seconds) timeUnits.seconds = params.seconds;
        if (params.minutes) timeUnits.minutes = params.minutes;
        if (params.hours) timeUnits.hours = params.hours;
        if (params.days) timeUnits.days = params.days;
        
        // Fast forward time
        const result = await timeManager.fastForward(timeUnits);

        return {
          success: true,
          from: result.from,
          to: result.to,
          message: `Time advanced from ${timeManager.formatTime(result.from)} to ${timeManager.formatTime(result.to)}`
        };
      },
      monitor: async (result, params, context) => {
        // Check for very large time jumps
        const seconds = params.seconds || 0;
        const minutes = params.minutes || 0;
        const hours = params.hours || 0;
        const days = params.days || 0;
        
        const totalSeconds = seconds + (minutes * 60) + (hours * 3600) + (days * 86400);
        
        if (totalSeconds > 86400 * 30) { // More than 30 days
          return { 
            valid: false, 
            warning: 'Very large time jump detected. Consider breaking large time jumps into smaller segments with narrative transitions.' 
          };
        }
        
        return { valid: true };
      }
    });
  }
}

// Create and export singleton instance
const actionManager = new ActionManager();
export default actionManager;

