/**
 * User Manager
 * 
 * Manages user profiles, characteristics, and properties
 * Supports both real users and AI-created users
 * Integrates with other managers for a comprehensive user experience
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

// Import managers (will be injected during initialization)
let memoryManager;
let contextManager;
let placeManager;
let itemManager;
let agentManager;

class UserManager {
  constructor() {
    this.users = new Map();
    this.eventEmitter = new EventEmitter();
    this.initialized = false;
    this.config = {
      usersPath: './data/users',
      defaultUsersFile: 'users.json',
      maxMadeUpUsers: 100
    };
  }

  /**
   * Initialize the User Manager
   * @param {Object} config Configuration options
   * @param {Object} dependencies Injected manager dependencies
   * @returns {Promise<boolean>} Initialization success
   */
  async initialize(config = {}, dependencies = {}) {
    if (this.initialized) return true;

    // Merge config with defaults
    this.config = { ...this.config, ...config };

    // Set up dependencies
    memoryManager = dependencies.memoryManager;
    contextManager = dependencies.contextManager;
    placeManager = dependencies.placeManager;
    itemManager = dependencies.itemManager;
    agentManager = dependencies.agentManager;

    // Create users directory if it doesn't exist
    try {
      await fs.mkdir(this.config.usersPath, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        console.error('Error creating users directory:', error);
        throw error;
      }
    }

    // Load users from file
    try {
      const usersFilePath = path.join(this.config.usersPath, this.config.defaultUsersFile);
      try {
        await fs.access(usersFilePath);
        const data = await fs.readFile(usersFilePath, 'utf8');
        const userData = JSON.parse(data);

        // Initialize users map
        for (const user of userData) {
          this.users.set(user.id, user);
        }

        console.log(`Loaded ${this.users.size} users`);
      } catch (error) {
        if (error.code === 'ENOENT') {
          // File doesn't exist, create a new one
          await this.saveUsers();
          console.log('Created new users file');
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('Error loading users:', error);
      throw error;
    }

    this.initialized = true;
    this.eventEmitter.emit('initialized');
    return true;
  }

  /**
   * Save users to file
   * @returns {Promise<boolean>} Save success
   */
  async saveUsers() {
    try {
      const usersFilePath = path.join(this.config.usersPath, this.config.defaultUsersFile);
      const usersArray = Array.from(this.users.values());
      await fs.writeFile(usersFilePath, JSON.stringify(usersArray, null, 2), 'utf8');
      return true;
    } catch (error) {
      console.error('Error saving users:', error);
      throw error;
    }
  }

  /**
   * Cleanup resources
   * @returns {Promise<boolean>} Cleanup success
   */
  async cleanup() {
    // Save any unsaved changes
    await this.saveUsers();
    
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
   * Create a new user
   * @param {Object} userData User data
   * @param {boolean} isMadeUp Whether this is an AI-created user
   * @returns {Promise<string>} The user ID
   */
  async createUser(userData, isMadeUp = false) {
    if (!this.initialized) {
      throw new Error('User Manager not initialized');
    }

    // Check if we've reached the limit for made-up users
    if (isMadeUp) {
      const madeUpCount = Array.from(this.users.values()).filter(user => user.isMadeUp).length;
      if (madeUpCount >= this.config.maxMadeUpUsers) {
        throw new Error(`Maximum number of made-up users (${this.config.maxMadeUpUsers}) reached`);
      }
    }

    // Generate a unique ID
    const userId = userData.id || `user-${uuidv4()}`;

    // Create user object with defaults
    const user = {
      id: userId,
      name: userData.name || 'Anonymous',
      discordId: userData.discordId,
      isMadeUp: isMadeUp,
      created: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      characteristics: userData.characteristics || {
        appearance: {},
        personality: {},
        background: {}
      },
      properties: userData.properties || {
        clothing: [],
        inventory: [],
        homes: [],
        businesses: []
      },
      relationships: userData.relationships || {},
      currentLocation: userData.currentLocation || null,
      ...userData
    };

    // Save to map
    this.users.set(userId, user);

    // Save to file
    await this.saveUsers();

    // Create a memory for real users
    if (!isMadeUp && memoryManager) {
      await memoryManager.addMemory({
        content: `User ${user.name} (${userId}) was created`,
        source: 'system',
        importance: 0.7,
        keywords: ['user', 'created', user.name],
        metadata: {
          type: 'userCreated',
          userId: userId
        }
      });
    }

    // Emit event
    this.eventEmitter.emit('userCreated', {
      userId: userId,
      name: user.name,
      isMadeUp: isMadeUp
    });

    return userId;
  }

  /**
   * Get a user by ID
   * @param {string} userId User ID
   * @returns {Object|null} The user object or null if not found
   */
  getUser(userId) {
    if (!this.initialized) {
      throw new Error('User Manager not initialized');
    }

    return this.users.get(userId) || null;
  }

  /**
   * Get a user by Discord ID
   * @param {string} discordId Discord user ID
   * @returns {Object|null} The user object or null if not found
   */
  getUserByDiscordId(discordId) {
    if (!this.initialized) {
      throw new Error('User Manager not initialized');
    }

    return Array.from(this.users.values()).find(user => user.discordId === discordId) || null;
  }

  /**
   * Update a user
   * @param {string} userId User ID
   * @param {Object} updates Updates to apply
   * @returns {Promise<boolean>} Update success
   */
  async updateUser(userId, updates) {
    if (!this.initialized) {
      throw new Error('User Manager not initialized');
    }

    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // Apply updates
    const updatedUser = {
      ...user,
      ...updates,
      lastActive: new Date().toISOString()
    };

    // Handle nested updates
    if (updates.characteristics) {
      updatedUser.characteristics = {
        ...user.characteristics,
        ...updates.characteristics
      };
    }

    if (updates.properties) {
      updatedUser.properties = {
        ...user.properties,
        ...updates.properties
      };

      // Handle array properties specially
      ['clothing', 'inventory', 'homes', 'businesses'].forEach(prop => {
        if (updates.properties[prop]) {
          if (Array.isArray(updates.properties[prop])) {
            updatedUser.properties[prop] = updates.properties[prop];
          } else {
            console.warn(`Invalid ${prop} format, expecting array`);
          }
        }
      });
    }

    // Save to map
    this.users.set(userId, updatedUser);

    // Save to file
    await this.saveUsers();

    // Emit event
    this.eventEmitter.emit('userUpdated', {
      userId: userId,
      name: updatedUser.name,
      updates: Object.keys(updates)
    });

    return true;
  }

  /**
   * Delete a user
   * @param {string} userId User ID
   * @returns {Promise<boolean>} Deletion success
   */
  async deleteUser(userId) {
    if (!this.initialized) {
      throw new Error('User Manager not initialized');
    }

    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // Delete from map
    this.users.delete(userId);

    // Save to file
    await this.saveUsers();

    // Emit event
    this.eventEmitter.emit('userDeleted', {
      userId: userId,
      name: user.name,
      isMadeUp: user.isMadeUp
    });

    return true;
  }

  /**
   * Get all users
   * @param {Object} filters Filters to apply
   * @returns {Array} Array of user objects
   */
  getAllUsers(filters = {}) {
    if (!this.initialized) {
      throw new Error('User Manager not initialized');
    }

    let users = Array.from(this.users.values());

    // Apply filters
    if (filters.isMadeUp !== undefined) {
      users = users.filter(user => user.isMadeUp === filters.isMadeUp);
    }

    if (filters.location) {
      users = users.filter(user => user.currentLocation === filters.location);
    }

    return users;
  }

  /**
   * Update user appearance
   * @param {string} userId User ID
   * @param {Object} appearance Appearance attributes
   * @returns {Promise<boolean>} Update success
   */
  async updateUserAppearance(userId, appearance) {
    if (!this.initialized) {
      throw new Error('User Manager not initialized');
    }

    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // Update appearance
    const updatedCharacteristics = {
      ...user.characteristics,
      appearance: {
        ...user.characteristics.appearance,
        ...appearance
      }
    };

    return this.updateUser(userId, { characteristics: updatedCharacteristics });
  }

  /**
   * Update user personality
   * @param {string} userId User ID
   * @param {Object} personality Personality attributes
   * @returns {Promise<boolean>} Update success
   */
  async updateUserPersonality(userId, personality) {
    if (!this.initialized) {
      throw new Error('User Manager not initialized');
    }

    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // Update personality
    const updatedCharacteristics = {
      ...user.characteristics,
      personality: {
        ...user.characteristics.personality,
        ...personality
      }
    };

    return this.updateUser(userId, { characteristics: updatedCharacteristics });
  }

  /**
   * Add item to user's inventory
   * @param {string} userId User ID
   * @param {string} itemId Item ID
   * @returns {Promise<boolean>} Success
   */
  async addItemToInventory(userId, itemId) {
    if (!this.initialized) {
      throw new Error('User Manager not initialized');
    }

    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // Check if item exists
    if (itemManager) {
      const item = itemManager.getItem(itemId);
      if (!item) {
        throw new Error(`Item ${itemId} not found`);
      }
    }

    // Add to inventory if not already there
    if (!user.properties.inventory.includes(itemId)) {
      const updatedProperties = {
        ...user.properties,
        inventory: [...user.properties.inventory, itemId]
      };

      await this.updateUser(userId, { properties: updatedProperties });

      // Emit event
      this.eventEmitter.emit('inventoryChanged', {
        userId: userId,
        itemId: itemId,
        action: 'added'
      });

      return true;
    }

    return false;
  }

  /**
   * Remove item from user's inventory
   * @param {string} userId User ID
   * @param {string} itemId Item ID
   * @returns {Promise<boolean>} Success
   */
  async removeItemFromInventory(userId, itemId) {
    if (!this.initialized) {
      throw new Error('User Manager not initialized');
    }

    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // Remove from inventory
    const inventory = user.properties.inventory.filter(id => id !== itemId);
    const updatedProperties = {
      ...user.properties,
      inventory: inventory
    };

    await this.updateUser(userId, { properties: updatedProperties });

    // Emit event
    this.eventEmitter.emit('inventoryChanged', {
      userId: userId,
      itemId: itemId,
      action: 'removed'
    });

    return true;
  }

  /**
   * Add clothing to user
   * @param {string} userId User ID
   * @param {Object} clothing Clothing item
   * @returns {Promise<boolean>} Success
   */
  async addClothing(userId, clothing) {
    if (!this.initialized) {
      throw new Error('User Manager not initialized');
    }

    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // Ensure clothing has an ID
    if (!clothing.id) {
      clothing.id = `clothing-${uuidv4()}`;
    }

    // Add to clothing list
    const updatedProperties = {
      ...user.properties,
      clothing: [...user.properties.clothing, clothing]
    };

    await this.updateUser(userId, { properties: updatedProperties });

    // Emit event
    this.eventEmitter.emit('clothingAdded', {
      userId: userId,
      clothingId: clothing.id,
      name: clothing.name
    });

    return true;
  }

  /**
   * Add home to user
   * @param {string} userId User ID
   * @param {Object} home Home details
   * @returns {Promise<string>} Home ID
   */
  async addHome(userId, home) {
    if (!this.initialized) {
      throw new Error('User Manager not initialized');
    }

    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // Ensure home has an ID
    if (!home.id) {
      home.id = `home-${uuidv4()}`;
    }

    // Add to homes list
    const updatedProperties = {
      ...user.properties,
      homes: [...user.properties.homes, home]
    };

    await this.updateUser(userId, { properties: updatedProperties });

    // Create a place if placeManager exists
    if (placeManager) {
      try {
        await placeManager.createPlace({
          name: home.name,
          description: home.description,
          type: 'residence',
          ownerId: userId,
          properties: {
            ...home.properties,
            isHome: true
          }
        });
      } catch (error) {
        console.error(`Error creating place for home ${home.id}:`, error);
      }
    }

    // Emit event
    this.eventEmitter.emit('homeAdded', {
      userId: userId,
      homeId: home.id,
      name: home.name
    });

    return home.id;
  }

  /**
   * Add business to user
   * @param {string} userId User ID
   * @param {Object} business Business details
   * @returns {Promise<string>} Business ID
   */
  async addBusiness(userId, business) {
    if (!this.initialized) {
      throw new Error('User Manager not initialized');
    }

    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // Ensure business has an ID
    if (!business.id) {
      business.id = `business-${uuidv4()}`;
    }

    // Add to businesses list
    const updatedProperties = {
      ...user.properties,
      businesses: [...user.properties.businesses, business]
    };

    await this.updateUser(userId, { properties: updatedProperties });

    // Create a place if placeManager exists
    if (placeManager) {
      try {
        await placeManager.createPlace({
          name: business.name,
          description: business.description,
          type: 'business',
          ownerId: userId,
          properties: {
            ...business.properties,
            isBusiness: true
          }
        });
      } catch (error) {
        console.error(`Error creating place for business ${business.id}:`, error);
      }
    }

    // Emit event
    this.eventEmitter.emit('businessAdded', {
      userId: userId,
      businessId: business.id,
      name: business.name
    });

    return business.id;
  }

  /**
   * Update user location
   * @param {string} userId User ID
   * @param {string} locationId Location ID
   * @returns {Promise<boolean>} Success
   */
  async updateUserLocation(userId, locationId) {
    if (!this.initialized) {
      throw new Error('User Manager not initialized');
    }

    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // Check if location exists
    if (placeManager && locationId) {
      const place = placeManager.getPlace(locationId);
      if (!place) {
        throw new Error(`Place ${locationId} not found`);
      }
    }

    const previousLocation = user.currentLocation;
    await this.updateUser(userId, { currentLocation: locationId });

    // Emit event
    this.eventEmitter.emit('userLocationChanged', {
      userId: userId,
      name: user.name,
      from: previousLocation,
      to: locationId
    });

    // Create memory if appropriate
    if (memoryManager && !user.isMadeUp) {
      await memoryManager.addMemory({
        content: `User ${user.name} moved from ${previousLocation || 'nowhere'} to ${locationId || 'nowhere'}`,
        source: 'system',
        importance: 0.6,
        keywords: ['user', 'moved', 'location', user.name],
        metadata: {
          type: 'userMoved',
          userId: userId,
          from: previousLocation,
          to: locationId
        }
      });
    }

    return true;
  }

  /**
   * Get users at a location
   * @param {string} locationId Location ID
   * @returns {Array} Users at the location
   */
  getUsersAtLocation(locationId) {
    if (!this.initialized) {
      throw new Error('User Manager not initialized');
    }

    return Array.from(this.users.values()).filter(user => user.currentLocation === locationId);
  }

  /**
   * Create relationship between users
   * @param {string} userId1 First user ID
   * @param {string} userId2 Second user ID
   * @param {Object} relationship Relationship details
   * @returns {Promise<boolean>} Success
   */
  async createRelationship(userId1, userId2, relationship) {
    if (!this.initialized) {
      throw new Error('User Manager not initialized');
    }

    const user1 = this.users.get(userId1);
    if (!user1) {
      throw new Error(`User ${userId1} not found`);
    }

    const user2 = this.users.get(userId2);
    if (!user2) {
      throw new Error(`User ${userId2} not found`);
    }

    // Update user1's relationships
    const user1Relationships = {
      ...user1.relationships,
      [userId2]: {
        type: relationship.type,
        strength: relationship.strength || 0.5,
        notes: relationship.notes || '',
        started: new Date().toISOString()
      }
    };

    await this.updateUser(userId1, { relationships: user1Relationships });

    // Update user2's relationships if bidirectional
    if (relationship.bidirectional) {
      const user2Relationships = {
        ...user2.relationships,
        [userId1]: {
          type: relationship.type,
          strength: relationship.strength || 0.5,
          notes: relationship.notes || '',
          started: new Date().toISOString()
        }
      };

      await this.updateUser(userId2, { relationships: user2Relationships });
    }

    // Emit event
    this.eventEmitter.emit('relationshipCreated', {
      userIds: [userId1, userId2],
      type: relationship.type,
      bidirectional: relationship.bidirectional
    });

    return true;
  }

  /**
   * Create a made-up user with AI assistance
   * @param {Object} userData Base user data
   * @param {Object} characterInfo Additional character information
   * @returns {Promise<string>} User ID
   */
  async createMadeUpUser(userData, characterInfo = {}) {
    if (!this.initialized) {
      throw new Error('User Manager not initialized');
    }

    // Check if we've reached the limit for made-up users
    const madeUpCount = Array.from(this.users.values()).filter(user => user.isMadeUp).length;
    if (madeUpCount >= this.config.maxMadeUpUsers) {
      throw new Error(`Maximum number of made-up users (${this.config.maxMadeUpUsers}) reached`);
    }

    // If we have agentManager, use it to generate character details
    let enrichedCharacterInfo = { ...characterInfo };
    if (agentManager) {
      try {
        const prompt = `Create a detailed character profile for a fictional character named ${userData.name}.
        Include physical appearance, personality traits, background story, and any unique characteristics.
        The character should be coherent and realistic with the following information: ${JSON.stringify(characterInfo)}`;

        const agentResponse = await agentManager.sendMessage('agent-123', 'system', { 
          prompt, 
          format: 'json'
        });

        // Parse the response if it's valid JSON
        try {
          const parsedResponse = JSON.parse(agentResponse);
          enrichedCharacterInfo = {
            ...characterInfo,
            ...parsedResponse
          };
        } catch (error) {
          console.warn('Failed to parse AI-generated character info:', error);
        }
      } catch (error) {
        console.warn('Failed to generate character details with AI:', error);
      }
    }

    // Create the made-up user
    const userId = await this.createUser({
      ...userData,
      characteristics: {
        appearance: enrichedCharacterInfo.appearance || {},
        personality: enrichedCharacterInfo.personality || {},
        background: enrichedCharacterInfo.background || {}
      }
    }, true);

    // Add memory for this made-up character
    if (memoryManager) {
      await memoryManager.addMemory({
        content: `Made-up character ${userData.name} (${userId}) was created`,
        source: 'system',
        importance: 0.7,
        keywords: ['character', 'created', userData.name],
        metadata: {
          type: 'characterCreated',
          userId: userId
        }
      });
    }

    return userId;
  }

  /**
   * Generate a message from a made-up user
   * @param {string} userId Made-up user ID
   * @param {string} context Conversation context
   * @returns {Promise<string>} Generated message
   */
  async generateMadeUpUserMessage(userId, context) {
    if (!this.initialized) {
      throw new Error('User Manager not initialized');
    }

    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    if (!user.isMadeUp) {
      throw new Error(`User ${userId} is not a made-up user`);
    }

    // Use agent manager to generate response if available
    if (agentManager) {
      try {
        const prompt = `You are roleplaying as ${user.name}. 
        Here are your characteristics:
        
        Appearance: ${JSON.stringify(user.characteristics.appearance)}
        Personality: ${JSON.stringify(user.characteristics.personality)}
        Background: ${JSON.stringify(user.characteristics.background)}
        
        Current context: ${context}
        
        Respond in character as ${user.name} would respond in this situation.`;

        return await agentManager.sendMessage('agent-123', 'system', { prompt });
      } catch (error) {
        console.error(`Error generating message for made-up user ${userId}:`, error);
        return `*${user.name} is unable to respond at the moment.*`;
      }
    } else {
      return `*${user.name} is unable to respond at the moment.*`;
    }
  }
}

// Create and export singleton instance
const userManager = new UserManager();
export default userManager;

