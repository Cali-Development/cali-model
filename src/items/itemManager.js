import fs from 'fs/promises';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { Groq } from 'groq-sdk';
import config from '../config.js';
import memoryManager from '../memory/memoryManager.js';
import contextManager from '../context/contextManager.js';
import scenarioManager from '../scenario/scenarioManager.js';
import agentManager from '../agents/agentManager.js';
import placeManager from '../places/placeManager.js';

// Get the directory name
const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Event types for item events
 */
export const ItemEventType = {
  ITEM_CREATED: 'item_created',
  ITEM_UPDATED: 'item_updated',
  ITEM_DELETED: 'item_deleted',
  ITEM_TRANSFERRED: 'item_transferred',
  ITEM_USED: 'item_used',
  BLUEPRINT_CREATED: 'blueprint_created',
  BLUEPRINT_UPDATED: 'blueprint_updated',
  BLUEPRINT_DELETED: 'blueprint_deleted'
};

/**
 * Item types
 */
export const ItemType = {
  WEAPON: 'weapon',
  ARMOR: 'armor',
  CLOTHING: 'clothing',
  TOOL: 'tool',
  FOOD: 'food',
  DRINK: 'drink',
  CONTAINER: 'container',
  KEY: 'key',
  TECHNOLOGY: 'technology',
  BOOK: 'book',
  POTION: 'potion',
  MATERIAL: 'material',
  MISCELLANEOUS: 'miscellaneous'
};

/**
 * Item condition states
 */
export const ItemCondition = {
  PRISTINE: 'pristine',
  EXCELLENT: 'excellent',
  GOOD: 'good',
  FAIR: 'fair',
  POOR: 'poor',
  DAMAGED: 'damaged',
  BROKEN: 'broken'
};

/**
 * Class representing a blueprint for creating items
 */
class Blueprint {
  /**
   * Create a blueprint
   * @param {Object} params - Blueprint parameters
   */
  constructor({
    id = uuidv4(),
    name,
    description,
    itemType = ItemType.MISCELLANEOUS,
    materials = [],
    craftingSteps = [],
    properties = {},
    effects = [],
    requiredSkills = {},
    creatorId = null,
    createdAt = new Date(),
    updatedAt = new Date(),
    metadata = {}
  }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.itemType = itemType;
    this.materials = materials;
    this.craftingSteps = craftingSteps;
    this.properties = properties;
    this.effects = effects;
    this.requiredSkills = requiredSkills;
    this.creatorId = creatorId;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.metadata = metadata;
  }

  /**
   * Convert blueprint to JSON
   * @returns {Object} JSON representation of blueprint
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      itemType: this.itemType,
      materials: this.materials,
      craftingSteps: this.craftingSteps,
      properties: this.properties,
      effects: this.effects,
      requiredSkills: this.requiredSkills,
      creatorId: this.creatorId,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      metadata: this.metadata
    };
  }

  /**
   * Create blueprint from JSON
   * @param {Object} json - JSON representation of blueprint
   * @returns {Blueprint} Blueprint instance
   */
  static fromJSON(json) {
    return new Blueprint({
      id: json.id,
      name: json.name,
      description: json.description,
      itemType: json.itemType || ItemType.MISCELLANEOUS,
      materials: json.materials || [],
      craftingSteps: json.craftingSteps || [],
      properties: json.properties || {},
      effects: json.effects || [],
      requiredSkills: json.requiredSkills || {},
      creatorId: json.creatorId,
      createdAt: new Date(json.createdAt),
      updatedAt: new Date(json.updatedAt),
      metadata: json.metadata || {}
    });
  }
}

/**
 * Class representing an item
 */
class Item {
  /**
   * Create an item
   * @param {Object} params - Item parameters
   */
  constructor({
    id = uuidv4(),
    name,
    description,
    type = ItemType.MISCELLANEOUS,
    ownerId = null,
    locationId = null,
    condition = ItemCondition.GOOD,
    properties = {},
    effects = [],
    uses = -1, // -1 means unlimited
    usesLeft = -1,
    blueprintId = null,
    tags = [],
    equippable = false,
    equipped = false,
    equippedBy = null,
    containedItems = [],
    containerItemId = null,
    createdAt = new Date(),
    updatedAt = new Date(),
    metadata = {}
  }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.type = type;
    this.ownerId = ownerId;
    this.locationId = locationId;
    this.condition = condition;
    this.properties = properties;
    this.effects = effects;
    this.uses = uses;
    this.usesLeft = usesLeft === -1 ? uses : usesLeft;
    this.blueprintId = blueprintId;
    this.tags = tags;
    this.equippable = equippable;
    this.equipped = equipped;
    this.equippedBy = equippedBy;
    this.containedItems = containedItems;
    this.containerItemId = containerItemId;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.metadata = metadata;
  }

  /**
   * Convert item to JSON
   * @returns {Object} JSON representation of item
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      type: this.type,
      ownerId: this.ownerId,
      locationId: this.locationId,
      condition: this.condition,
      properties: this.properties,
      effects: this.effects,
      uses: this.uses,
      usesLeft: this.usesLeft,
      blueprintId: this.blueprintId,
      tags: this.tags,
      equippable: this.equippable,
      equipped: this.equipped,
      equippedBy: this.equippedBy,
      containedItems: this.containedItems,
      containerItemId: this.containerItemId,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      metadata: this.metadata
    };
  }

  /**
   * Create item from JSON
   * @param {Object} json - JSON representation of item
   * @returns {Item} Item instance
   */
  static fromJSON(json) {
    return new Item({
      id: json.id,
      name: json.name,
      description: json.description,
      type: json.type || ItemType.MISCELLANEOUS,
      ownerId: json.ownerId,
      locationId: json.locationId,
      condition: json.condition || ItemCondition.GOOD,
      properties: json.properties || {},
      effects: json.effects || [],
      uses: json.uses || -1,
      usesLeft: json.usesLeft === undefined ? json.uses : json.usesLeft,
      blueprintId: json.blueprintId,
      tags: json.tags || [],
      equippable: json.equippable || false,
      equipped: json.equipped || false,
      equippedBy: json.equippedBy,
      containedItems: json.containedItems || [],
      containerItemId: json.containerItemId,
      createdAt: new Date(json.createdAt),
      updatedAt: new Date(json.updatedAt),
      metadata: json.metadata || {}
    });
  }

  /**
   * Check if the item is usable
   * @returns {boolean} Whether the item is usable
   */
  isUsable() {
    if (this.condition === ItemCondition.BROKEN) {
      return false;
    }
    
    if (this.usesLeft === 0) {
      return false;
    }
    
    return true;
  }

  /**
   * Use the item once
   * @returns {boolean} Whether the item was used successfully
   */
  use() {
    if (!this.isUsable()) {
      return false;
    }
    
    // If item has limited uses
    if (this.usesLeft > 0) {
      this.usesLeft--;
      this.updatedAt = new Date();
      
      // Check if item should degrade
      if (this.usesLeft === 0) {
        this.condition = ItemCondition.BROKEN;
      } else if (this.usesLeft < this.uses * 0.2) {
        this._degradeCondition();
      }
    }
    
    return true;
  }

  /**
   * Degrade the item's condition by one level
   * @private
   */
  _degradeCondition() {
    const conditions = Object.values(ItemCondition);
    const currentIndex = conditions.indexOf(this.condition);
    
    // Already at worst condition
    if (currentIndex === conditions.length - 1) {
      return;
    }
    
    // Degrade to next worse condition
    this.condition = conditions[currentIndex + 1];
    this.updatedAt = new Date();
  }

  /**
   * Repair the item's condition by one level
   * @returns {boolean} Whether the repair was successful
   */
  repair() {
    const conditions = Object.values(ItemCondition);
    const currentIndex = conditions.indexOf(this.condition);
    
    // Already at best condition
    if (currentIndex === 0) {
      return false;
    }
    
    // Improve to next better condition
    this.condition = conditions[currentIndex - 1];
    this.updatedAt = new Date();
    return true;
  }

  /**
   * Add an item to this container
   * @param {string} itemId - Item ID to add
   * @returns {boolean} Success indicator
   */
  addToContainer(itemId) {
    if (this.type !== ItemType.CONTAINER) {
      return false;
    }
    
    if (this.containedItems.includes(itemId)) {
      return true; // Already in container
    }
    
    this.containedItems.push(itemId);
    this.updatedAt = new Date();
    return true;
  }

  /**
   * Remove an item from this container
   * @param {string} itemId - Item ID to remove
   * @returns {boolean} Success indicator
   */
  removeFromContainer(itemId) {
    if (this.type !== ItemType.CONTAINER) {
      return false;
    }
    
    const index = this.containedItems.indexOf(itemId);
    if (index === -1) {
      return false; // Not in container
    }
    
    this.containedItems.splice(index, 1);
    this.updatedAt = new Date();
    return true;
  }
}

/**
 * Class for managing items
 */
class ItemManager {
  /**
   * Create an item manager
   */
  constructor() {
    this.itemsPath = path.join(config.system.dataDir, 'items');
    this.blueprintsPath = path.join(config.system.dataDir, 'blueprints');
    this.items = new Map(); // Map of item ID to item object
    this.blueprints = new Map(); // Map of blueprint ID to blueprint object
    
    this.groq = new Groq({ apiKey: config.api.groq.apiKey });
    
    // Event listeners
    this.eventListeners = {};
    
    // Initialization flag
    this.initialized = false;
  }

  /**
   * Initialize the item manager
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      // Create directories if they don't exist
      await fs.mkdir(this.itemsPath, { recursive: true });
      await fs.mkdir(this.blueprintsPath, { recursive: true });
      
      // Load all existing items
      const itemFiles = await fs.readdir(this.itemsPath);
      for (const file of itemFiles) {
        if (file.endsWith('.json')) {
          try {
            const itemData = await fs.readFile(path.join(this.itemsPath, file), 'utf-8');
            const item = Item.fromJSON(JSON.parse(itemData));
            this.items.set(item.id, item);
          } catch (error) {
            console.error(`Failed to load item from ${file}:`, error);
          }
        }
      }
      
      // Load all existing blueprints
      const blueprintFiles = await fs.readdir(this.blueprintsPath);
      for (const file of blueprintFiles) {
        if (file.endsWith('.json')) {
          try {
            const blueprintData = await fs.readFile(path.join(this.blueprintsPath, file), 'utf-8');
            const blueprint = Blueprint.fromJSON(JSON.parse(blueprintData));
            this.blueprints.set(blueprint.id, blueprint);
          } catch (error) {
            console.error(`Failed to load blueprint from ${file}:`, error);
          }
        }
      }
      
      this.initialized = true;
      console.log(`Item Manager initialized with ${this.items.size} items and ${this.blueprints.size} blueprints`);
    } catch (error) {
      console.error('Failed to initialize Item Manager:', error);
      throw error;
    }
  }

  /**
   * Create a new item
   * @param {Object} itemData - Item data
   * @returns {Promise<Item>} Created item
   */
  async createItem(itemData) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Validate required fields
      if (!itemData.name) {
        throw new Error('Item name is required');
      }
      
      // If a blueprint is provided, validate and use it
      let blueprintData = null;
      if (itemData.blueprintId) {
        blueprintData = this.blueprints.get(itemData.blueprintId);
        if (!blueprintData) {
          throw new Error(`Blueprint with ID ${itemData.blueprintId} not found`);
        }
        
        // Merge blueprint properties with item data
        itemData = {
          ...itemData,
          type: itemData.type || blueprintData.itemType,
          properties: {
            ...blueprintData.properties,
            ...(itemData.properties || {})
          },
          effects: [...(blueprintData.effects || []), ...(itemData.effects || [])],
          description: itemData.description || blueprintData.description
        };
      }
      
      // If AI validation is enabled, validate item
      if (config.system.enableAIMonitoring) {
        const isValid = await this._validateItemWithAI(itemData);
        if (!isValid) {
          throw new Error('Item creation rejected by AI validation');
        }
      }
      
      // Create item instance
      const item = new Item({
        ...itemData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Add to items map
      this.items.set(item.id, item);
      
      // If item is in a container, update the container
      if (item.containerItemId && this.items.has(item.containerItemId)) {
        const container = this.items.get(item.containerItemId);
        container.addToContainer(item.id);
        await this._saveItem(container);
      }
      
      // Save item to file
      await this._saveItem(item);
      
      // Add to context
      await contextManager.addContextMessage({
        content: `New item created: ${item.name} (${item.type})`,
        role: 'system',
        metadata: { source: 'ItemManager' }
      });
      
      // Add to memory
      if (item.ownerId) {
        await memoryManager.addMemory({
          content: `You acquired ${item.name}. ${item.description}`,
          agentId: item.ownerId,
          tags: ['item', 'acquisition'],
          keywords: ['item', item.name, item.type],
          metadata: { source: 'ItemManager', itemId: item.id }
        });
      }
      
      // Update scenario state
      await scenarioManager.updateWorldState({
        lastItemCreated: item.name,
        itemCount: this.items.size
      });
      
      // Emit event
      this._emitEvent(ItemEventType.ITEM_CREATED, { item: item.toJSON() });
      
      console.log(`Item created: ${item.name} (${item.id})`);
      return item;
    } catch (error) {
      console.error('Failed to create item:', error);
      throw error;
    }
  }

  /**
   * Create a new blueprint
   * @param {Object} blueprintData - Blueprint data
   * @returns {Promise<Blueprint>} Created blueprint
   */
  async createBlueprint(blueprintData) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Validate required fields
      if (!blueprintData.name) {
        throw new Error('Blueprint name is required');
      }
      
      // If AI validation is enabled, validate blueprint
      if (config.system.enableAIMonitoring) {
        const isValid = await this._validateBlueprintWithAI(blueprintData);
        if (!isValid) {
          throw new Error('Blueprint creation rejected by AI validation');
        }
      }
      
      // Create blueprint instance
      const blueprint = new Blueprint({
        ...blueprintData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Add to blueprints map
      this.blueprints.set(blueprint.id, blueprint);
      
      // Save blueprint to file
      await this._saveBlueprint(blueprint);
      
      // Add to context
      await contextManager.addContextMessage({
        content: `New blueprint created: ${blueprint.name} (${blueprint.itemType})`,
        role: 'system',
        metadata: { source: 'ItemManager' }
      });
      
      // Add to memory
      if (blueprint.creatorId) {
        await memoryManager.addMemory({
          content: `You created a blueprint for ${blueprint.name}. ${blueprint.description}`,
          agentId: blueprint.creatorId,
          tags: ['blueprint', 'creation'],
          keywords: ['blueprint', blueprint.name, blueprint.itemType],
          metadata: { source: 'ItemManager', blueprintId: blueprint.id }
        });
      }
      
      // Emit event
      this._emitEvent(ItemEventType.BLUEPRINT_CREATED, { blueprint: blueprint.toJSON() });
      
      console.log(`Blueprint created: ${blueprint.name} (${blueprint.id})`);
      return blueprint;
    } catch (error) {
      console.error('Failed to create blueprint:', error);
      throw error;
    }
  }

  /**
   * Get an item by ID
   * @param {string} id - Item ID
   * @returns {Item|null} Item instance or null if not found
   */
  async getItem(id) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      return this.items.get(id) || null;
    } catch (error) {
      console.error(`Failed to get item with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get a blueprint by ID
   * @param {string} id - Blueprint ID
   * @returns {Blueprint|null} Blueprint instance or null if not found
   */
  async getBlueprint(id) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      return this.blueprints.get(id) || null;
    } catch (error) {
      console.error(`Failed to get blueprint with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get detailed information about an item
   * @param {string} id - Item ID
   * @returns {Promise<Object>} Item details
   */
  async getItemDetails(id) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      const item = this.items.get(id);
      if (!item) {
        throw new Error(`Item with ID ${id} not found`);
      }
      
      // Get blueprint if available
      let blueprint = null;
      if (item.blueprintId) {
        blueprint = this.blueprints.get(item.blueprintId);
      }
      
      // Get owner if available
      let owner = null;
      if (item.ownerId) {
        owner = await agentManager.getAgent(item.ownerId);
      }
      
      // Get location if available
      let location = null;
      if (item.locationId) {
        location = await placeManager.getPlace(item.locationId);
      }
      
      // Get contained items
      const containedItems = [];
      for (const containedId of item.containedItems) {
        const containedItem = this.items.get(containedId);
        if (containedItem) {
          containedItems.push({
            id: containedItem.id,
            name: containedItem.name,
            type: containedItem.type,
            condition: containedItem.condition
          });
        }
      }
      
      // Get container item
      let containerItem = null;
      if (item.containerItemId) {
        const container = this.items.get(item.containerItemId);
        if (container) {
          containerItem = {
            id: container.id,
            name: container.name,
            type: container.type
          };
        }
      }
      
      return {
        item: item.toJSON(),
        blueprint: blueprint ? blueprint.toJSON() : null,
        owner: owner ? {
          id: owner.id,
          name: owner.name
        } : null,
        location: location ? {
          id: location.id,
          name: location.name,
          type: location.type
        } : null,
        containedItems,
        containerItem,
        isUsable: item.isUsable()
      };
    } catch (error) {
      console.error(`Failed to get item details for ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update an item
   * @param {string} id - Item ID
   * @param {Object} updates - Updates to apply to the item
   * @returns {Promise<Item|null>} Updated item or null if not found
   */
  async updateItem(id, updates) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Find item
      const item = this.items.get(id);
      if (!item) {
        console.log(`Item with ID ${id} not found`);
        return null;
      }
      
      // Get previous item state for events
      const previousItem = { ...item.toJSON() };
      
      // If AI validation is enabled, validate updates
      if (config.system.enableAIMonitoring) {
        const isValid = await this._validateItemUpdateWithAI(item, updates);
        if (!isValid) {
          throw new Error('Item update rejected by AI validation');
        }
      }
      
      // Apply updates
      if (updates.name !== undefined) item.name = updates.name;
      if (updates.description !== undefined) item.description = updates.description;
      if (updates.type !== undefined) item.type = updates.type;
      if (updates.condition !== undefined) item.condition = updates.condition;
      if (updates.properties !== undefined) {
        item.properties = { ...item.properties, ...updates.properties };
      }
      if (updates.effects !== undefined) item.effects = updates.effects;
      if (updates.uses !== undefined) item.uses = updates.uses;
      if (updates.usesLeft !== undefined) item.usesLeft = updates.usesLeft;
      if (updates.tags !== undefined) item.tags = updates.tags;
      if (updates.equippable !== undefined) item.equippable = updates.equippable;
      
      // Handle ownership changes
      if (updates.ownerId !== undefined && updates.ownerId !== item.ownerId) {
        const previousOwner = item.ownerId;
        item.ownerId = updates.ownerId;
        
        // Add to memory for previous and new owner
        if (previousOwner) {
          await memoryManager.addMemory({
            content: `You no longer own ${item.name}.`,
            agentId: previousOwner,
            tags: ['item', 'loss'],
            keywords: ['item', item.name, 'lost'],
            metadata: { source: 'ItemManager', itemId: item.id }
          });
        }
        
        if (item.ownerId) {
          await memoryManager.addMemory({
            content: `You acquired ${item.name}. ${item.description}`,
            agentId: item.ownerId,
            tags: ['item', 'acquisition'],
            keywords: ['item', item.name, 'acquired'],
            metadata: { source: 'ItemManager', itemId: item.id }
          });
        }
      }
      
      // Handle location changes
      if (updates.locationId !== undefined && updates.locationId !== item.locationId) {
        item.locationId = updates.locationId;
      }
      
      // Handle equipped state changes
      if (updates.equipped !== undefined) {
        if (updates.equipped && !item.equippable) {
          throw new Error('Cannot equip an item that is not equippable');
        }
        item.equipped = updates.equipped;
      }
      
      if (updates.equippedBy !== undefined) {
        if (updates.equippedBy && !item.equippable) {
          throw new Error('Cannot equip an item that is not equippable');
        }
        item.equippedBy = updates.equippedBy;
      }
      
      // Handle container changes
      if (updates.containerItemId !== undefined && updates.containerItemId !== item.containerItemId) {
        // Remove from old container
        if (item.containerItemId && this.items.has(item.containerItemId)) {
          const oldContainer = this.items.get(item.containerItemId);
          oldContainer.removeFromContainer(item.id);
          await this._saveItem(oldContainer);
        }
        
        // Add to new container
        item.containerItemId = updates.containerItemId;
        if (item.containerItemId && this.items.has(item.containerItemId)) {
          const newContainer = this.items.get(item.containerItemId);
          newContainer.addToContainer(item.id);
          await this._saveItem(newContainer);
        }
      }
      
      if (updates.metadata !== undefined) {
        item.metadata = { ...item.metadata, ...updates.metadata };
      }
      
      // Update timestamp
      item.updatedAt = new Date();
      
      // Save item to file
      await this._saveItem(item);
      
      // Add to context
      await contextManager.addContextMessage({
        content: `Item updated: ${item.name}`,
        role: 'system',
        metadata: { source: 'ItemManager' }
      });
      
      // Emit event
      this._emitEvent(ItemEventType.ITEM_UPDATED, { 
        previous: previousItem,
        current: item.toJSON()
      });
      
      console.log(`Item updated: ${item.name} (${item.id})`);
      return item;
    } catch (error) {
      console.error(`Failed to update item ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update a blueprint
   * @param {string} id - Blueprint ID
   * @param {Object} updates - Updates to apply to the blueprint
   * @returns {Promise<Blueprint|null>} Updated blueprint or null if not found
   */
  async updateBlueprint(id, updates) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Find blueprint
      const blueprint = this.blueprints.get(id);
      if (!blueprint) {
        console.log(`Blueprint with ID ${id} not found`);
        return null;
      }
      
      // Get previous blueprint state for events
      const previousBlueprint = { ...blueprint.toJSON() };
      
      // If AI validation is enabled, validate updates
      if (config.system.enableAIMonitoring) {
        const isValid = await this._validateBlueprintUpdateWithAI(blueprint, updates);
        if (!isValid) {
          throw new Error('Blueprint update rejected by AI validation');
        }
      }
      
      // Apply updates
      if (updates.name !== undefined) blueprint.name = updates.name;
      if (updates.description !== undefined) blueprint.description = updates.description;
      if (updates.itemType !== undefined) blueprint.itemType = updates.itemType;
      if (updates.materials !== undefined) blueprint.materials = updates.materials;
      if (updates.craftingSteps !== undefined) blueprint.craftingSteps = updates.craftingSteps;
      if (updates.properties !== undefined) {
        blueprint.properties = { ...blueprint.properties, ...updates.properties };
      }
      if (updates.effects !== undefined) blueprint.effects = updates.effects;
      if (updates.requiredSkills !== undefined) {
        blueprint.requiredSkills = { ...blueprint.requiredSkills, ...updates.requiredSkills };
      }
      if (updates.metadata !== undefined) {
        blueprint.metadata = { ...blueprint.metadata, ...updates.metadata };
      }
      
      // Update timestamp
      blueprint.updatedAt = new Date();
      
      // Save blueprint to file
      await this._saveBlueprint(blueprint);
      
      // Add to context
      await contextManager.addContextMessage({
        content: `Blueprint updated: ${blueprint.name}`,
        role: 'system',
        metadata: { source: 'ItemManager' }
      });
      
      // Emit event
      this._emitEvent(ItemEventType.BLUEPRINT_UPDATED, {
        previous: previousBlueprint,
        current: blueprint.toJSON()
      });
      
      console.log(`Blueprint updated: ${blueprint.name} (${blueprint.id})`);
      return blueprint;
    } catch (error) {
      console.error(`Failed to update blueprint ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete an item
   * @param {string} id - Item ID
   * @returns {Promise<boolean>} Success indicator
   */
  async deleteItem(id) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Find item
      const item = this.items.get(id);
      if (!item) {
        console.log(`Item with ID ${id} not found`);
        return false;
      }
      
      // Get item info before removal
      const itemInfo = item.toJSON();
      
      // Check if the item is in a container
      if (item.containerItemId) {
        const container = this.items.get(item.containerItemId);
        if (container) {
          container.removeFromContainer(id);
          await this._saveItem(container);
        }
      }
      
      // Check if the item is a container with items
      if (item.containedItems.length > 0) {
        // Remove container reference from all contained items
        for (const containedId of item.containedItems) {
          const containedItem = this.items.get(containedId);
          if (containedItem) {
            containedItem.containerItemId = null;
            await this._saveItem(containedItem);
          }
        }
      }
      
      // Remove item from map
      this.items.delete(id);
      
      // Delete item file
      await fs.unlink(path.join(this.itemsPath, `${id}.json`));
      
      // Add to context
      await contextManager.addContextMessage({
        content: `Item deleted: ${item.name}`,
        role: 'system',
        metadata: { source: 'ItemManager' }
      });
      
      // Add to memory for owner
      if (item.ownerId) {
        await memoryManager.addMemory({
          content: `You no longer have ${item.name}.`,
          agentId: item.ownerId,
          tags: ['item', 'loss'],
          keywords: ['item', item.name, 'deleted'],
          metadata: { source: 'ItemManager', itemId: item.id }
        });
      }
      
      // Emit event
      this._emitEvent(ItemEventType.ITEM_DELETED, { item: itemInfo });
      
      console.log(`Item deleted: ${item.name} (${item.id})`);
      return true;
    } catch (error) {
      console.error(`Failed to delete item ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a blueprint
   * @param {string} id - Blueprint ID
   * @returns {Promise<boolean>} Success indicator
   */
  async deleteBlueprint(id) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Find blueprint
      const blueprint = this.blueprints.get(id);
      if (!blueprint) {
        console.log(`Blueprint with ID ${id} not found`);
        return false;
      }
      
      // Get blueprint info before removal
      const blueprintInfo = blueprint.toJSON();
      
      // Check if any items are using this blueprint
      const itemsUsingBlueprint = Array.from(this.items.values())
        .filter(item => item.blueprintId === id);
      
      if (itemsUsingBlueprint.length > 0) {
        throw new Error(`Cannot delete blueprint ${id} because it is used by ${itemsUsingBlueprint.length} items`);
      }
      
      // Remove blueprint from map
      this.blueprints.delete(id);
      
      // Delete blueprint file
      await fs.unlink(path.join(this.blueprintsPath, `${id}.json`));
      
      // Add to context
      await contextManager.addContextMessage({
        content: `Blueprint deleted: ${blueprint.name}`,
        role: 'system',
        metadata: { source: 'ItemManager' }
      });
      
      // Add to memory for creator
      if (blueprint.creatorId) {
        await memoryManager.addMemory({
          content: `Your blueprint for ${blueprint.name} was deleted.`,
          agentId: blueprint.creatorId,
          tags: ['blueprint', 'deletion'],
          keywords: ['blueprint', blueprint.name, 'deleted'],
          metadata: { source: 'ItemManager', blueprintId: blueprint.id }
        });
      }
      
      // Emit event
      this._emitEvent(ItemEventType.BLUEPRINT_DELETED, { blueprint: blueprintInfo });
      
      console.log(`Blueprint deleted: ${blueprint.name} (${blueprint.id})`);
      return true;
    } catch (error) {
      console.error(`Failed to delete blueprint ${id}:`, error);
      throw error;
    }
  }

  /**
   * Transfer an item between agents or locations
   * @param {string} itemId - Item ID
   * @param {Object} options - Transfer options
   * @param {string} [options.toAgentId] - Recipient agent ID
   * @param {string} [options.toLocationId] - Destination location ID
   * @param {string} [options.toContainerId] - Destination container ID
   * @returns {Promise<Item>} Updated item
   */
  async transferItem(itemId, options) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Find item
      const item = this.items.get(itemId);
      if (!item) {
        throw new Error(`Item with ID ${itemId} not found`);
      }
      
      // Get previous state
      const previousState = { ...item.toJSON() };
      const previousOwnerId = item.ownerId;
      const previousLocationId = item.locationId;
      const previousContainerId = item.containerItemId;
      
      // Handle agent transfer
      if (options.toAgentId !== undefined) {
        // Check if agent exists
        const agent = await agentManager.getAgent(options.toAgentId);
        if (!agent) {
          throw new Error(`Agent with ID ${options.toAgentId} not found`);
        }
        
        item.ownerId = options.toAgentId;
        
        // If transferring to an agent, update location to agent's location
        if (agent.locationId) {
          item.locationId = agent.locationId;
        }
      }
      
      // Handle location transfer
      if (options.toLocationId !== undefined) {
        // Check if location exists
        const location = await placeManager.getPlace(options.toLocationId);
        if (!location) {
          throw new Error(`Location with ID ${options.toLocationId} not found`);
        }
        
        item.locationId = options.toLocationId;
      }
      
      // Handle container transfer
      if (options.toContainerId !== undefined) {
        // Remove from current container if any
        if (item.containerItemId && this.items.has(item.containerItemId)) {
          const oldContainer = this.items.get(item.containerItemId);
          oldContainer.removeFromContainer(itemId);
          await this._saveItem(oldContainer);
        }
        
        // Add to new container if provided
        if (options.toContainerId) {
          const newContainer = this.items.get(options.toContainerId);
          if (!newContainer) {
            throw new Error(`Container with ID ${options.toContainerId} not found`);
          }
          
          if (newContainer.type !== ItemType.CONTAINER) {
            throw new Error(`Item ${options.toContainerId} is not a container`);
          }
          
          newContainer.addToContainer(itemId);
          item.containerItemId = options.toContainerId;
          await this._saveItem(newContainer);
        } else {
          item.containerItemId = null;
        }
      }
      
      // Update timestamp
      item.updatedAt = new Date();
      
      // Save item
      await this._saveItem(item);
      
      // Add to context
      await contextManager.addContextMessage({
        content: `Item transferred: ${item.name}`,
        role: 'system',
        metadata: { source: 'ItemManager' }
      });
      
      // Add to memory for previous and new owners
      if (previousOwnerId && previousOwnerId !== item.ownerId) {
        await memoryManager.addMemory({
          content: `You no longer have ${item.name}.`,
          agentId: previousOwnerId,
          tags: ['item', 'transfer'],
          keywords: ['item', item.name, 'transferred'],
          metadata: { source: 'ItemManager', itemId: item.id }
        });
      }
      
      if (item.ownerId && item.ownerId !== previousOwnerId) {
        await memoryManager.addMemory({
          content: `You received ${item.name}. ${item.description}`,
          agentId: item.ownerId,
          tags: ['item', 'acquisition'],
          keywords: ['item', item.name, 'received'],
          metadata: { source: 'ItemManager', itemId: item.id }
        });
      }
      
      // Emit event
      this._emitEvent(ItemEventType.ITEM_TRANSFERRED, {
        item: item.toJSON(),
        previousOwnerId,
        previousLocationId,
        previousContainerId,
        newOwnerId: item.ownerId,
        newLocationId: item.locationId,
        newContainerId: item.containerItemId
      });
      
      console.log(`Item transferred: ${item.name} (${item.id})`);
      return item;
    } catch (error) {
      console.error(`Failed to transfer item ${itemId}:`, error);
      throw error;
    }
  }

  /**
   * Use an item
   * @param {string} itemId - Item ID
   * @param {string} userId - ID of the agent using the item
   * @param {Object} [options] - Use options
   * @returns {Promise<Object>} Use result
   */
  async useItem(itemId, userId, options = {}) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Find item
      const item = this.items.get(itemId);
      if (!item) {
        throw new Error(`Item with ID ${itemId} not found`);
      }
      
      // Check if the item is usable
      if (!item.isUsable()) {
        return {
          success: false,
          message: `Item ${item.name} is not usable (${item.condition})`,
          item: item.toJSON()
        };
      }
      
      // Check if the user has permission to use the item
      if (item.ownerId && item.ownerId !== userId) {
        return {
          success: false,
          message: `You don't own this item`,
          item: item.toJSON()
        };
      }
      
      // Use the item
      const useResult = item.use();
      if (!useResult) {
        return {
          success: false,
          message: `Failed to use item ${item.name}`,
          item: item.toJSON()
        };
      }
      
      // Apply effects if any
      const effects = [];
      for (const effect of item.effects) {
        // Here you would implement effect application logic
        // For example, healing, damage, stat changes, etc.
        effects.push({
          type: effect.type,
          applied: true,
          description: effect.description
        });
      }
      
      // Update item
      await this._saveItem(item);
      
      // Add to context
      await contextManager.addContextMessage({
        content: `${await this._getUserName(userId)} used ${item.name}`,
        role: 'system',
        metadata: { source: 'ItemManager', itemId, userId }
      });
      
      // Add to memory
      await memoryManager.addMemory({
        content: `You used ${item.name}. ${effects.length > 0 ? 'Effects: ' + effects.map(e => e.description).join(', ') : ''}`,
        agentId: userId,
        tags: ['item', 'use'],
        keywords: ['item', item.name, 'used'],
        metadata: { source: 'ItemManager', itemId, effects }
      });
      
      // Emit event
      this._emitEvent(ItemEventType.ITEM_USED, {
        item: item.toJSON(),
        userId,
        effects,
        usesLeft: item.usesLeft,
        condition: item.condition
      });
      
      console.log(`Item used: ${item.name} (${item.id}) by ${userId}`);
      
      return {
        success: true,
        message: `Successfully used ${item.name}`,
        item: item.toJSON(),
        effects,
        usesLeft: item.usesLeft,
        condition: item.condition
      };
    } catch (error) {
      console.error(`Failed to use item ${itemId}:`, error);
      throw error;
    }
  }

  /**
   * Search for items based on criteria
   * @param {Object} criteria - Search criteria
   * @param {string} [criteria.name] - Name to search for (partial match)
   * @param {string} [criteria.type] - Item type
   * @param {string[]} [criteria.tags] - Tags to search for
   * @param {string} [criteria.ownerId] - Owner ID
   * @param {string} [criteria.locationId] - Location ID
   * @param {Object} [criteria.properties] - Properties to match
   * @param {number} [limit=10] - Maximum number of results
   * @returns {Promise<Item[]>} Array of matching items
   */
  async searchItems(criteria, limit = 10) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      let results = Array.from(this.items.values());
      
      // Filter by name
      if (criteria.name) {
        const nameLower = criteria.name.toLowerCase();
        results = results.filter(item => 
          item.name.toLowerCase().includes(nameLower)
        );
      }
      
      // Filter by type
      if (criteria.type) {
        results = results.filter(item => item.type === criteria.type);
      }
      
      // Filter by tags
      if (criteria.tags && criteria.tags.length > 0) {
        results = results.filter(item => 
          criteria.tags.some(tag => item.tags.includes(tag))
        );
      }
      
      // Filter by owner
      if (criteria.ownerId) {
        results = results.filter(item => item.ownerId === criteria.ownerId);
      }
      
      // Filter by location
      if (criteria.locationId) {
        results = results.filter(item => item.locationId === criteria.locationId);
      }
      
      // Filter by properties
      if (criteria.properties) {
        results = results.filter(item => {
          for (const [key, value] of Object.entries(criteria.properties)) {
            if (item.properties[key] !== value) {
              return false;
            }
          }
          return true;
        });
      }
      
      // Apply limit
      return results.slice(0, limit);
    } catch (error) {
      console.error('Failed to search items:', error);
      throw error;
    }
  }

  /**
   * Get all items owned by an agent
   * @param {string} agentId - Agent ID
   * @returns {Promise<Item[]>} Array of items
   */
  async getItemsByOwner(agentId) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      return Array.from(this.items.values())
        .filter(item => item.ownerId === agentId);
    } catch (error) {
      console.error(`Failed to get items for owner ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Get all items at a location
   * @param {string} locationId - Location ID
   * @returns {Promise<Item[]>} Array of items
   */
  async getItemsAtLocation(locationId) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      return Array.from(this.items.values())
        .filter(item => item.locationId === locationId && !item.ownerId);
    } catch (error) {
      console.error(`Failed to get items at location ${locationId}:`, error);
      throw error;
    }
  }

  /**
   * Validate an item with AI
   * @param {Object} itemData - Item data to validate
   * @returns {Promise<boolean>} Whether the item is valid
   * @private
   */
  async _validateItemWithAI(itemData) {
    try {
      const prompt = `
Please validate if the following item is reasonable and adheres to world rules:

Item Name: ${itemData.name}
Description: ${itemData.description || 'None provided'}
Type: ${itemData.type}
Properties: ${JSON.stringify(itemData.properties || {})}
Effects: ${JSON.stringify(itemData.effects || [])}

Is this item reasonable and consistent with world rules? Respond with YES or NO, followed by a brief explanation.
`;

      const response = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: config.api.groq.model,
        temperature: 0.2
      });

      const result = response.choices[0].message.content.trim();
      
      // Check if the response starts with YES
      const isValid = result.toUpperCase().startsWith('YES');
      
      console.log(`AI validation for item "${itemData.name}": ${isValid ? 'PASSED' : 'FAILED'}`);
      
      if (!isValid) {
        console.log(`Validation reason: ${result}`);
      }
      
      return isValid;
    } catch (error) {
      console.error('Failed to validate item with AI:', error);
      // If AI validation fails, assume the item is valid
      return true;
    }
  }

  /**
   * Validate a blueprint with AI
   * @param {Object} blueprintData - Blueprint data to validate
   * @returns {Promise<boolean>} Whether the blueprint is valid
   * @private
   */
  async _validateBlueprintWithAI(blueprintData) {
    try {
      const prompt = `
Please validate if the following item blueprint is reasonable and adheres to world rules:

Blueprint Name: ${blueprintData.name}
Description: ${blueprintData.description || 'None provided'}
Item Type: ${blueprintData.itemType}
Materials: ${JSON.stringify(blueprintData.materials || [])}
Crafting Steps: ${JSON.stringify(blueprintData.craftingSteps || [])}
Properties: ${JSON.stringify(blueprintData.properties || {})}
Effects: ${JSON.stringify(blueprintData.effects || [])}

Is this blueprint reasonable and consistent with world rules? Respond with YES or NO, followed by a brief explanation.
`;

      const response = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: config.api.groq.model,
        temperature: 0.2
      });

      const result = response.choices[0].message.content.trim();
      
      // Check if the response starts with YES
      const isValid = result.toUpperCase().startsWith('YES');
      
      console.log(`AI validation for blueprint "${blueprintData.name}": ${isValid ? 'PASSED' : 'FAILED'}`);
      
      if (!isValid) {
        console.log(`Validation reason: ${result}`);
      }
      
      return isValid;
    } catch (error) {
      console.error('Failed to validate blueprint with AI:', error);
      // If AI validation fails, assume the blueprint is valid
      return true;
    }
  }

  /**
   * Validate item updates with AI
   * @param {Item} item - Current item
   * @param {Object} updates - Updates to apply
   * @returns {Promise<boolean>} Whether the updates are valid
   * @private
   */
  async _validateItemUpdateWithAI(item, updates) {
    // For updates, we'll simulate what the item would look like after updates
    const updatedItemData = {
      ...item,
      ...updates,
      properties: { ...item.properties, ...(updates.properties || {}) },
      effects: updates.effects !== undefined ? updates.effects : item.effects
    };
    
    return this._validateItemWithAI(updatedItemData);
  }

  /**
   * Validate blueprint updates with AI
   * @param {Blueprint} blueprint - Current blueprint
   * @param {Object} updates - Updates to apply
   * @returns {Promise<boolean>} Whether the updates are valid
   * @private
   */
  async _validateBlueprintUpdateWithAI(blueprint, updates) {
    // For updates, we'll simulate what the blueprint would look like after updates
    const updatedBlueprintData = {
      ...blueprint,
      ...updates,
      properties: { ...blueprint.properties, ...(updates.properties || {}) },
      effects: updates.effects !== undefined ? updates.effects : blueprint.effects,
      materials: updates.materials !== undefined ? updates.materials : blueprint.materials,
      craftingSteps: updates.craftingSteps !== undefined ? updates.craftingSteps : blueprint.craftingSteps
    };
    
    return this._validateBlueprintWithAI(updatedBlueprintData);
  }

  /**
   * Get user name from user ID
   * @param {string} userId - User ID
   * @returns {Promise<string>} User name
   * @private
   */
  async _getUserName(userId) {
    try {
      const agent = await agentManager.getAgent(userId);
      return agent ? agent.name : 'Unknown User';
    } catch (error) {
      return 'Unknown User';
    }
  }

  /**
   * Save an item to file
   * @param {Item} item - Item to save
   * @private
   */
  async _saveItem(item) {
    try {
      const filePath = path.join(this.itemsPath, `${item.id}.json`);
      await fs.writeFile(filePath, JSON.stringify(item.toJSON(), null, 2));
    } catch (error) {
      console.error(`Failed to save item ${item.id}:`, error);
      throw error;
    }
  }
  /**
   * Save a blueprint to file
   * @param {Blueprint} blueprint - Blueprint to save
   * @private
   */
  async _saveBlueprint(blueprint) {
    try {
      const filePath = path.join(this.blueprintsPath, `${blueprint.id}.json`);
      await fs.writeFile(filePath, JSON.stringify(blueprint.toJSON(), null, 2));
    } catch (error) {
      console.error(`Failed to save blueprint ${blueprint.id}:`, error);
      throw error;
    }
  }

  /**
   * Add an event listener
   * @param {string} event - Event type
   * @param {Function} listener - Event listener
   * @returns {Function} Function to remove the listener
   */
  addEventListener(event, listener) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(listener);
    
    // Return a function to remove the listener
    return () => this.removeEventListener(event, listener);
  }

  /**
   * Remove an event listener
   * @param {string} event - Event type
   * @param {Function} listener - Event listener
   */
  removeEventListener(event, listener) {
    if (!this.eventListeners[event]) {
      return;
    }
    
    const index = this.eventListeners[event].indexOf(listener);
    if (index !== -1) {
      this.eventListeners[event].splice(index, 1);
    }
  }

  /**
   * Emit an event
   * @param {string} type - Event type
   * @param {Object} data - Event data
   * @private
   */
  _emitEvent(type, data) {
    // Notify listeners
    if (this.eventListeners[type]) {
      for (const listener of this.eventListeners[type]) {
        try {
          listener({ type, data, timestamp: new Date() });
        } catch (error) {
          console.error(`Error in event listener for ${type}:`, error);
        }
      }
    }
    
    // Notify 'all' listeners
    if (this.eventListeners['all']) {
      for (const listener of this.eventListeners['all']) {
        try {
          listener({ type, data, timestamp: new Date() });
        } catch (error) {
          console.error(`Error in 'all' event listener for ${type}:`, error);
        }
      }
    }
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    try {
      // Close any open resources
      
      // Clear caches
      this.items.clear();
      this.blueprints.clear();
      this.eventListeners = {};
      
      this.initialized = false;
      console.log('Item Manager resources cleaned up');
    } catch (error) {
      console.error('Failed to clean up Item Manager resources:', error);
    }
  }
}

// Create and export a singleton instance
const itemManager = new ItemManager();
export default itemManager;

// Also export the classes for direct use
export { Item, Blueprint };
