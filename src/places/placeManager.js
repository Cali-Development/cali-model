import fs from 'fs/promises';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import config from '../config.js';
import memoryManager from '../memory/memoryManager.js';
import contextManager from '../context/contextManager.js';
import scenarioManager from '../scenario/scenarioManager.js';
import agentManager from '../agents/agentManager.js';

// Get the directory name
const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Event types for place events
 */
export const PlaceEventType = {
  PLACE_CREATED: 'place_created',
  PLACE_UPDATED: 'place_updated',
  PLACE_DELETED: 'place_deleted',
  PLACES_CONNECTED: 'places_connected',
  CONNECTION_UPDATED: 'connection_updated',
  CONNECTION_DELETED: 'connection_deleted',
  AGENT_ENTERED: 'agent_entered',
  AGENT_LEFT: 'agent_left'
};

/**
 * Place types
 */
export const PlaceType = {
  CITY: 'city',
  TOWN: 'town',
  VILLAGE: 'village',
  FOREST: 'forest',
  MOUNTAIN: 'mountain',
  LAKE: 'lake',
  RIVER: 'river',
  OCEAN: 'ocean',
  DESERT: 'desert',
  CAVE: 'cave',
  BUILDING: 'building',
  ROOM: 'room',
  ROAD: 'road',
  FIELD: 'field',
  PARK: 'park',
  OTHER: 'other'
};

/**
 * Connection types
 */
export const ConnectionType = {
  ROAD: 'road',
  PATH: 'path',
  RIVER: 'river',
  BRIDGE: 'bridge',
  TUNNEL: 'tunnel',
  PORTAL: 'portal',
  DOOR: 'door',
  STAIRS: 'stairs',
  ELEVATOR: 'elevator',
  TELEPORT: 'teleport',
  BORDER: 'border',
  OTHER: 'other'
};

/**
 * Class representing a place
 */
class Place {
  /**
   * Create a place
   * @param {Object} params - Place parameters
   */
  constructor({
    id = uuidv4(),
    name,
    description,
    type = PlaceType.OTHER,
    coordinates = { x: 0, y: 0, z: 0 },
    size = { width: 10, height: 10, depth: 10 },
    tags = [],
    properties = {},
    blueprint = null,
    parentId = null,
    children = [],
    createdAt = new Date(),
    updatedAt = new Date(),
    metadata = {}
  }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.type = type;
    this.coordinates = coordinates;
    this.size = size;
    this.tags = tags;
    this.properties = properties;
    this.blueprint = blueprint;
    this.parentId = parentId;
    this.children = children;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.metadata = metadata;
  }

  /**
   * Convert place to JSON
   * @returns {Object} JSON representation of place
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      type: this.type,
      coordinates: this.coordinates,
      size: this.size,
      tags: this.tags,
      properties: this.properties,
      blueprint: this.blueprint,
      parentId: this.parentId,
      children: this.children,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      metadata: this.metadata
    };
  }

  /**
   * Create place from JSON
   * @param {Object} json - JSON representation of place
   * @returns {Place} Place instance
   */
  static fromJSON(json) {
    return new Place({
      id: json.id,
      name: json.name,
      description: json.description,
      type: json.type || PlaceType.OTHER,
      coordinates: json.coordinates || { x: 0, y: 0, z: 0 },
      size: json.size || { width: 10, height: 10, depth: 10 },
      tags: json.tags || [],
      properties: json.properties || {},
      blueprint: json.blueprint,
      parentId: json.parentId,
      children: json.children || [],
      createdAt: new Date(json.createdAt),
      updatedAt: new Date(json.updatedAt),
      metadata: json.metadata || {}
    });
  }

  /**
   * Get place description for display
   * @returns {string} Formatted description
   */
  getFormattedDescription() {
    return `${this.name} (${this.type}): ${this.description}`;
  }

  /**
   * Add a child place ID
   * @param {string} childId - Child place ID
   */
  addChild(childId) {
    if (!this.children.includes(childId)) {
      this.children.push(childId);
      this.updatedAt = new Date();
    }
  }

  /**
   * Remove a child place ID
   * @param {string} childId - Child place ID
   */
  removeChild(childId) {
    const index = this.children.indexOf(childId);
    if (index !== -1) {
      this.children.splice(index, 1);
      this.updatedAt = new Date();
    }
  }
}

/**
 * Class representing a connection between places
 */
class Connection {
  /**
   * Create a connection
   * @param {Object} params - Connection parameters
   */
  constructor({
    id = uuidv4(),
    fromPlaceId,
    toPlaceId,
    type = ConnectionType.PATH,
    name = null,
    description = null,
    bidirectional = true,
    travelTime = 60, // seconds
    distance = 1, // kilometers
    conditions = [], // e.g., ['requires_key', 'daylight_only']
    createdAt = new Date(),
    updatedAt = new Date(),
    metadata = {}
  }) {
    this.id = id;
    this.fromPlaceId = fromPlaceId;
    this.toPlaceId = toPlaceId;
    this.type = type;
    this.name = name;
    this.description = description;
    this.bidirectional = bidirectional;
    this.travelTime = travelTime;
    this.distance = distance;
    this.conditions = conditions;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.metadata = metadata;
  }

  /**
   * Convert connection to JSON
   * @returns {Object} JSON representation of connection
   */
  toJSON() {
    return {
      id: this.id,
      fromPlaceId: this.fromPlaceId,
      toPlaceId: this.toPlaceId,
      type: this.type,
      name: this.name,
      description: this.description,
      bidirectional: this.bidirectional,
      travelTime: this.travelTime,
      distance: this.distance,
      conditions: this.conditions,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      metadata: this.metadata
    };
  }

  /**
   * Create connection from JSON
   * @param {Object} json - JSON representation of connection
   * @returns {Connection} Connection instance
   */
  static fromJSON(json) {
    return new Connection({
      id: json.id,
      fromPlaceId: json.fromPlaceId,
      toPlaceId: json.toPlaceId,
      type: json.type || ConnectionType.PATH,
      name: json.name,
      description: json.description,
      bidirectional: json.bidirectional !== undefined ? json.bidirectional : true,
      travelTime: json.travelTime || 60,
      distance: json.distance || 1,
      conditions: json.conditions || [],
      createdAt: new Date(json.createdAt),
      updatedAt: new Date(json.updatedAt),
      metadata: json.metadata || {}
    });
  }

  /**
   * Get connection description for display
   * @returns {string} Formatted description
   */
  getFormattedDescription() {
    const name = this.name ? this.name : `${this.type} connection`;
    const desc = this.description ? `: ${this.description}` : '';
    const direction = this.bidirectional ? 'bidirectional' : 'one-way';
    return `${name}${desc} (${direction}, ${this.travelTime}s, ${this.distance}km)`;
  }

  /**
   * Check if an agent can travel through this connection
   * @param {Object} agent - Agent object
   * @returns {boolean} Whether the agent can travel
   */
  canTravel(agent) {
    // Implement condition checking logic here
    // For now, simply return true if there are no conditions
    return this.conditions.length === 0;
  }
}

/**
 * Class for managing places
 */
class PlaceManager {
  /**
   * Create a place manager
   */
  constructor() {
    this.placesPath = path.join(config.system.dataDir, 'places');
    this.connectionsPath = path.join(config.system.dataDir, 'connections');
    this.places = new Map(); // Map of place ID to place object
    this.connections = new Map(); // Map of connection ID to connection object
    
    // Event listeners
    this.eventListeners = {};
    
    // Initialization flag
    this.initialized = false;
  }

  /**
   * Initialize the place manager
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      // Create directories if they don't exist
      await fs.mkdir(this.placesPath, { recursive: true });
      await fs.mkdir(this.connectionsPath, { recursive: true });
      
      // Load all existing places
      const placeFiles = await fs.readdir(this.placesPath);
      for (const file of placeFiles) {
        if (file.endsWith('.json')) {
          try {
            const placeData = await fs.readFile(path.join(this.placesPath, file), 'utf-8');
            const place = Place.fromJSON(JSON.parse(placeData));
            this.places.set(place.id, place);
          } catch (error) {
            console.error(`Failed to load place from ${file}:`, error);
          }
        }
      }
      
      // Load all existing connections
      const connectionFiles = await fs.readdir(this.connectionsPath);
      for (const file of connectionFiles) {
        if (file.endsWith('.json')) {
          try {
            const connectionData = await fs.readFile(path.join(this.connectionsPath, file), 'utf-8');
            const connection = Connection.fromJSON(JSON.parse(connectionData));
            this.connections.set(connection.id, connection);
          } catch (error) {
            console.error(`Failed to load connection from ${file}:`, error);
          }
        }
      }
      
      // Create default place if none exists
      if (this.places.size === 0) {
        await this._createDefaultPlace();
      }
      
      this.initialized = true;
      console.log(`Place Manager initialized with ${this.places.size} places and ${this.connections.size} connections`);
    } catch (error) {
      console.error('Failed to initialize Place Manager:', error);
      throw error;
    }
  }

  /**
   * Create a default place
   * @private
   */
  async _createDefaultPlace() {
    try {
      const defaultPlace = new Place({
        name: 'Default Location',
        description: 'A starting point for your world.',
        type: PlaceType.OTHER
      });
      
      // Add to places map
      this.places.set(defaultPlace.id, defaultPlace);
      
      // Save place to file
      await this._savePlace(defaultPlace);
      
      // Update scenario with default place info
      await scenarioManager.updateWorldState({
        defaultPlaceId: defaultPlace.id,
        defaultPlaceName: defaultPlace.name
      });
      
      console.log(`Created default place: ${defaultPlace.name} (${defaultPlace.id})`);
    } catch (error) {
      console.error('Failed to create default place:', error);
      throw error;
    }
  }

  /**
   * Add a new place
   * @param {Object} placeData - Place data
   * @returns {Promise<Place>} Created place
   */
  async addPlace(placeData) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Validate required fields
      if (!placeData.name) {
        throw new Error('Place name is required');
      }
      
      // Create place instance
      const place = new Place({
        ...placeData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Add to places map
      this.places.set(place.id, place);
      
      // If this place has a parent, update the parent's children list
      if (place.parentId && this.places.has(place.parentId)) {
        const parent = this.places.get(place.parentId);
        parent.addChild(place.id);
        await this._savePlace(parent);
      }
      
      // Save place to file
      await this._savePlace(place);
      
      // Add to context
      await contextManager.addContextMessage({
        content: `New place created: ${place.name} (${place.type})`,
        role: 'system',
        metadata: { source: 'PlaceManager' }
      });
      
      // Add to memory
      await memoryManager.addMemory({
        content: `A new place called ${place.name} was created. ${place.description}`,
        agentId: 'system',
        tags: ['place'],
        keywords: ['place', place.name, place.type],
        metadata: { source: 'PlaceManager' }
      });
      
      // Emit event
      this._emitEvent(PlaceEventType.PLACE_CREATED, { place: place.toJSON() });
      
      console.log(`Place created: ${place.name} (${place.id})`);
      return place;
    } catch (error) {
      console.error('Failed to add place:', error);
      throw error;
    }
  }

  /**
   * Get a place by ID
   * @param {string} id - Place ID
   * @returns {Place|null} Place instance or null if not found
   */
  async getPlace(id) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      return this.places.get(id) || null;
    } catch (error) {
      console.error(`Failed to get place with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get place info including connections and agents present
   * @param {string} id - Place ID
   * @returns {Promise<Object>} Place info
   */
  async getPlaceInfo(id) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      const place = this.places.get(id);
      if (!place) {
        throw new Error(`Place with ID ${id} not found`);
      }
      
      // Get connections from this place
      const connections = await this.getPlaceConnections(id);
      
      // Get agents at this place
      const agents = await agentManager.getAgentsAtLocation(id);
      
      // Get child places
      const children = [];
      for (const childId of place.children) {
        const child = this.places.get(childId);
        if (child) {
          children.push({
            id: child.id,
            name: child.name,
            type: child.type
          });
        }
      }
      
      // Get parent place
      let parent = null;
      if (place.parentId) {
        const parentPlace = this.places.get(place.parentId);
        if (parentPlace) {
          parent = {
            id: parentPlace.id,
            name: parentPlace.name,
            type: parentPlace.type
          };
        }
      }
      
      return {
        place: place.toJSON(),
        connections: connections.map(c => c.toJSON()),
        agents: agents.map(a => ({
          id: a.id,
          name: a.name,
          description: a.description
        })),
        children,
        parent
      };
    } catch (error) {
      console.error(`Failed to get place info for ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update a place
   * @param {string} id - Place ID
   * @param {Object} updates - Updates to apply to the place
   * @returns {Promise<Place|null>} Updated place or null if not found
   */
  async updatePlace(id, updates) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Find place
      const place = this.places.get(id);
      if (!place) {
        console.log(`Place with ID ${id} not found`);
        return null;
      }
      
      // Get previous place state for events
      const previousPlace = { ...place.toJSON() };
      
      // Apply updates
      if (updates.name !== undefined) place.name = updates.name;
      if (updates.description !== undefined) place.description = updates.description;
      if (updates.type !== undefined) place.type = updates.type;
      if (updates.coordinates !== undefined) place.coordinates = { ...place.coordinates, ...updates.coordinates };
      if (updates.size !== undefined) place.size = { ...place.size, ...updates.size };
      if (updates.tags !== undefined) place.tags = updates.tags;
      if (updates.properties !== undefined) place.properties = { ...place.properties, ...updates.properties };
      if (updates.blueprint !== undefined) place.blueprint = updates.blueprint;
      
      // Handle parent changes
      if (updates.parentId !== undefined && updates.parentId !== place.parentId) {
        // Remove from old parent's children list
        if (place.parentId && this.places.has(place.parentId)) {
          const oldParent = this.places.get(place.parentId);
          oldParent.removeChild(place.id);
          await this._savePlace(oldParent);
        }
        
        // Add to new parent's children list
        place.parentId = updates.parentId;
        if (place.parentId && this.places.has(place.parentId)) {
          const newParent = this.places.get(place.parentId);
          newParent.addChild(place.id);
          await this._savePlace(newParent);
        }
      }
      
      if (updates.metadata !== undefined) {
        place.metadata = { ...place.metadata, ...updates.metadata };
      }
      
      // Update timestamp
      place.updatedAt = new Date();
      
      // Save place to file
      await this._savePlace(place);
      
      // Add to context
      await contextManager.addContextMessage({
        content: `Place updated: ${place.name}`,
        role: 'system',
        metadata: { source: 'PlaceManager' }
      });
      
      // Emit event
      this._emitEvent(PlaceEventType.PLACE_UPDATED, { 
        previous: previousPlace,
        current: place.toJSON()
      });
      
      console.log(`Place updated: ${place.name} (${place.id})`);
      return place;
    } catch (error) {
      console.error(`Failed to update place ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a place
   * @param {string} id - Place ID
   * @returns {Promise<boolean>} Success indicator
   */
  async deletePlace(id) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Find place
      const place = this.places.get(id);
      if (!place) {
        console.log(`Place with ID ${id} not found`);
        return false;
      }
      
      // Check if there are agents at this place
      const agents = await agentManager.getAgentsAtLocation(id);
      if (agents.length > 0) {
        throw new Error(`Cannot delete place with agents present. Move agents first.`);
      }
      
      // Get place info before removal
      const placeInfo = place.toJSON();
      
      // Remove from parent's children list
      if (place.parentId && this.places.has(place.parentId)) {
        const parent = this.places.get(place.parentId);
        parent.removeChild(place.id);
        await this._savePlace(parent);
      }
      
      // Delete connections involving this place
      for (const connection of this.connections.values()) {
        if (connection.fromPlaceId === id || connection.toPlaceId === id) {
          await this.deleteConnection(connection.id);
        }
      }
      
      // Handle child places (move to parent or delete)
      for (const childId of place.children) {
        const child = this.places.get(childId);
        if (child) {
          if (place.parentId) {
            // Move child to this place's parent
            await this.updatePlace(childId, { parentId: place.parentId });
          } else {
            // No parent to move to, delete the child
            await this.deletePlace(childId);
          }
        }
      }
      
      // Remove place from map
      this.places.delete(id);
      
      // Delete place file
      await fs.unlink(path.join(this.placesPath, `${id}.json`));
      
      // Add to context
      await contextManager.addContextMessage({
        content: `Place deleted: ${place.name}`,
        role: 'system',
        metadata: { source: 'PlaceManager' }
      });
      
      // Emit event
      this._emitEvent(PlaceEventType.PLACE_DELETED, { place: placeInfo });
      
      console.log(`Place deleted: ${place.name} (${place.id})`);
      return true;
    } catch (error) {
      console.error(`Failed to delete place ${id}:`, error);
      throw error;
    }
  }

  /**
   * Connect two places
   * @param {Object} connectionData - Connection data
   * @returns {Promise<Connection>} Created connection
   */
  async connectPlaces(connectionData) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Validate required fields
      if (!connectionData.fromPlaceId || !connectionData.toPlaceId) {
        throw new Error('From place ID and to place ID are required');
      }
      
      // Check if places exist
      const fromPlace = this.places.get(connectionData.fromPlaceId);
      const toPlace = this.places.get(connectionData.toPlaceId);
      
      if (!fromPlace) {
        throw new Error(`From place with ID ${connectionData.fromPlaceId} not found`);
      }
      
      if (!toPlace) {
        throw new Error(`To place with ID ${connectionData.toPlaceId} not found`);
      }
      
      // Check if connection already exists
      const existingConnection = Array.from(this.connections.values()).find(
        c => (c.fromPlaceId === connectionData.fromPlaceId && c.toPlaceId === connectionData.toPlaceId) ||
             (c.bidirectional && c.fromPlaceId === connectionData.toPlaceId && c.toPlaceId === connectionData.fromPlaceId)
      );
      
      if (existingConnection) {
        return existingConnection;
      }
      
      // Create connection instance
      const connection = new Connection({
        ...connectionData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Add to connections map
      this.connections.set(connection.id, connection);
      
      // Save connection to file
      await this._saveConnection(connection);
      
      // Add to context
      await contextManager.addContextMessage({
        content: `Connected ${fromPlace.name} to ${toPlace.name} via ${connection.type}`,
        role: 'system',
        metadata: { source: 'PlaceManager' }
      });
      
      // Add to memory
      await memoryManager.addMemory({
        content: `A ${connection.type} connection was established between ${fromPlace.name} and ${toPlace.name}.`,
        agentId: 'system',
        tags: ['connection', connection.type],
        keywords: [fromPlace.name, toPlace.name, 'connection', connection.type],
        metadata: { source: 'PlaceManager' }
      });
      
      // Emit event
      this._emitEvent(PlaceEventType.PLACES_CONNECTED, { 
        connection: connection.toJSON(),
        fromPlace: fromPlace.toJSON(),
        toPlace: toPlace.toJSON()
      });
      
      console.log(`Connected ${fromPlace.name} to ${toPlace.name} via ${connection.type}`);
      return connection;
    } catch (error) {
      console.error('Failed to connect places:', error);
      throw error;
    }
  }

  /**
   * Get connections for a place
   * @param {string} placeId - Place ID
   * @returns {Promise<Connection[]>} Array of connections
   */
  async getPlaceConnections(placeId) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      return Array.from(this.connections.values()).filter(
        connection => connection.fromPlaceId === placeId || 
                      (connection.bidirectional && connection.toPlaceId === placeId)
      );
    } catch (error) {
      console.error(`Failed to get connections for place ${placeId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a connection
   * @param {string} id - Connection ID
   * @returns {Promise<boolean>} Success indicator
   */
  async deleteConnection(id) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Find connection
      const connection = this.connections.get(id);
      if (!connection) {
        console.log(`Connection with ID ${id} not found`);
        return false;
      }
      
      // Get connection info before removal
      const connectionInfo = connection.toJSON();
      
      // Remove connection from map
      this.connections.delete(id);
      
      // Delete connection file
      await fs.unlink(path.join(this.connectionsPath, `${id}.json`));
      
      // Add to context
      await contextManager.addContextMessage({
        content: `Connection deleted between places ${connection.fromPlaceId} and ${connection.toPlaceId}`,
        role: 'system',
        metadata: { source: 'PlaceManager' }
      });
      
      // Emit event
      this._emitEvent(PlaceEventType.CONNECTION_DELETED, { connection: connectionInfo });
      
      console.log(`Connection deleted: ${connection.id}`);
      return true;
    } catch (error) {
      console.error(`Failed to delete connection ${id}:`, error);
      throw error;
    }
  }

  /**
   * Move an agent to a place
   * @param {string} agentId - Agent ID
   * @param {string} placeId - Destination place ID
   * @param {boolean} [useConnections=true] - Whether to check connections
   * @returns {Promise<Object>} Result object
   */
  async moveAgentToPlace(agentId, placeId, useConnections = true) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Get agent
      const agent = await agentManager.getAgent(agentId);
      if (!agent) {
        throw new Error(`Agent with ID ${agentId} not found`);
      }
      
      // Get destination place
      const destPlace = this.places.get(placeId);
      if (!destPlace) {
        throw new Error(`Place with ID ${placeId} not found`);
      }
      
      // If agent is already at this place, nothing to do
      if (agent.locationId === placeId) {
        return {
          success: true,
          message: `${agent.name} is already at ${destPlace.name}`,
          agent,
          place: destPlace
        };
      }
      
      // If using connections, check if there's a valid path
      if (useConnections) {
        const currentPlaceId = agent.locationId;
        
        // If current place is not set, skip connection check
        if (currentPlaceId) {
          // Check if there's a direct connection
          const connection = Array.from(this.connections.values()).find(
            c => (c.fromPlaceId === currentPlaceId && c.toPlaceId === placeId) ||
                 (c.bidirectional && c.fromPlaceId === placeId && c.toPlaceId === currentPlaceId)
          );
          
          if (!connection) {
            return {
              success: false,
              message: `No connection found between ${agent.locationId} and ${placeId}`,
              agent,
              place: destPlace
            };
          }
          
          // Check if agent can travel through this connection
          if (!connection.canTravel(agent)) {
            return {
              success: false,
              message: `Cannot travel through connection due to conditions`,
              agent,
              place: destPlace,
              connection
            };
          }
        }
      }
      
      // Get the current place (if any)
      const prevPlace = agent.locationId ? this.places.get(agent.locationId) : null;
      
      // Update agent location
      const updatedAgent = await agentManager.updateAgent(agentId, { locationId: placeId });
      
      // Add to context
      await contextManager.addContextMessage({
        content: `${agent.name} moved to ${destPlace.name}`,
        role: 'system',
        metadata: { source: 'PlaceManager' }
      });
      
      // Add to memory
      await memoryManager.addMemory({
        content: `You moved to ${destPlace.name}. ${destPlace.description}`,
        agentId: agentId,
        tags: ['movement', 'location'],
        keywords: ['moved', 'location', destPlace.name, destPlace.type],
        metadata: { 
          source: 'PlaceManager',
          placeId: placeId,
          previousPlaceId: agent.locationId
        }
      });
      
      // Emit events
      if (prevPlace) {
        this._emitEvent(PlaceEventType.AGENT_LEFT, { 
          agentId,
          placeId: prevPlace.id,
          placeName: prevPlace.name,
          destinationId: placeId,
          destinationName: destPlace.name
        });
      }
      
      this._emitEvent(PlaceEventType.AGENT_ENTERED, { 
        agentId,
        placeId: destPlace.id,
        placeName: destPlace.name,
        previousPlaceId: prevPlace ? prevPlace.id : null,
        previousPlaceName: prevPlace ? prevPlace.name : null
      });
      
      console.log(`Moved ${agent.name} to ${destPlace.name}`);
      return {
        success: true,
        message: `${agent.name} moved to ${destPlace.name}`,
        agent: updatedAgent,
        place: destPlace,
        previousPlace: prevPlace
      };
    } catch (error) {
      console.error(`Failed to move agent ${agentId} to place ${placeId}:`, error);
      throw error;
    }
  }

  /**
   * Search for places based on criteria
   * @param {Object} criteria - Search criteria
   * @param {string} [criteria.name] - Name to search for (partial match)
   * @param {string} [criteria.type] - Place type
   * @param {string[]} [criteria.tags] - Tags to search for
   * @param {Object} [criteria.properties] - Properties to match
   * @param {number} [limit=10] - Maximum number of results
   * @returns {Promise<Place[]>} Array of matching places
   */
  async searchPlaces(criteria, limit = 10) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      let results = Array.from(this.places.values());
      
      // Filter by name
      if (criteria.name) {
        const nameLower = criteria.name.toLowerCase();
        results = results.filter(place => 
          place.name.toLowerCase().includes(nameLower)
        );
      }
      
      // Filter by type
      if (criteria.type) {
        results = results.filter(place => place.type === criteria.type);
      }
      
      // Filter by tags
      if (criteria.tags && criteria.tags.length > 0) {
        results = results.filter(place => 
          criteria.tags.some(tag => place.tags.includes(tag))
        );
      }
      
      // Filter by properties
      if (criteria.properties) {
        results = results.filter(place => {
          for (const [key, value] of Object.entries(criteria.properties)) {
            if (place.properties[key] !== value) {
              return false;
            }
          }
          return true;
        });
      }
      
      // Apply limit
      return results.slice(0, limit);
    } catch (error) {
      console.error('Failed to search places:', error);
      throw error;
    }
  }

  /**
   * Get adjacent places (places connected to a given place)
   * @param {string} placeId - Place ID
   * @returns {Promise<Object[]>} Array of adjacent places with connection info
   */
  async getAdjacentPlaces(placeId) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      const connections = await this.getPlaceConnections(placeId);
      const adjacentPlaces = [];
      
      for (const connection of connections) {
        let adjacentPlaceId;
        
        if (connection.fromPlaceId === placeId) {
          adjacentPlaceId = connection.toPlaceId;
        } else if (connection.bidirectional && connection.toPlaceId === placeId) {
          adjacentPlaceId = connection.fromPlaceId;
        } else {
          continue; // Not adjacent in the right direction
        }
        
        const adjacentPlace = this.places.get(adjacentPlaceId);
        if (adjacentPlace) {
          adjacentPlaces.push({
            place: adjacentPlace,
            connection
          });
        }
      }
      
      return adjacentPlaces;
    } catch (error) {
      console.error(`Failed to get adjacent places for ${placeId}:`, error);
      throw error;
    }
  }

  /**
   * Find a path between two places
   * @param {string} startPlaceId - Starting place ID
   * @param {string} endPlaceId - Destination place ID
   * @param {Object} [agent] - Agent object to check travel conditions
   * @returns {Promise<Object>} Path information or null if no path found
   */
  async getPathBetweenPlaces(startPlaceId, endPlaceId, agent = null) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Check if places exist
      const startPlace = this.places.get(startPlaceId);
      const endPlace = this.places.get(endPlaceId);
      
      if (!startPlace) {
        throw new Error(`Start place with ID ${startPlaceId} not found`);
      }
      
      if (!endPlace) {
        throw new Error(`End place with ID ${endPlaceId} not found`);
      }
      
      // If start and end are the same, return empty path
      if (startPlaceId === endPlaceId) {
        return {
          path: [],
          totalDistance: 0,
          totalTravelTime: 0
        };
      }
      
      // Use breadth-first search to find the shortest path
      const queue = [{ placeId: startPlaceId, path: [], distance: 0, travelTime: 0 }];
      const visited = new Set([startPlaceId]);
      
      while (queue.length > 0) {
        const { placeId, path, distance, travelTime } = queue.shift();
        
        // Get adjacent places
        const adjacentPlaces = await this.getAdjacentPlaces(placeId);
        
        for (const { place, connection } of adjacentPlaces) {
          if (visited.has(place.id)) {
            continue; // Already visited
          }
          
          // Check if agent can travel through this connection
          if (agent && !connection.canTravel(agent)) {
            continue; // Cannot travel
          }
          
          // Create new path
          const newPath = [...path, {
            fromId: placeId,
            toId: place.id,
            connectionId: connection.id,
            connectionType: connection.type,
            distance: connection.distance,
            travelTime: connection.travelTime
          }];
          
          const newDistance = distance + connection.distance;
          const newTravelTime = travelTime + connection.travelTime;
          
          // If this is the destination, return the path
          if (place.id === endPlaceId) {
            return {
              path: newPath,
              totalDistance: newDistance,
              totalTravelTime: newTravelTime
            };
          }
          
          // Add to queue for further exploration
          visited.add(place.id);
          queue.push({
            placeId: place.id,
            path: newPath,
            distance: newDistance,
            travelTime: newTravelTime
          });
        }
      }
      
      // No path found
      return null;
    } catch (error) {
      console.error(`Failed to find path between ${startPlaceId} and ${endPlaceId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate distance between two places
   * @param {string} placeId1 - First place ID
   * @param {string} placeId2 - Second place ID
   * @returns {number} Distance in units
   */
  calculateDistance(placeId1, placeId2) {
    try {
      const place1 = this.places.get(placeId1);
      const place2 = this.places.get(placeId2);
      
      if (!place1 || !place2) {
        throw new Error('One or both places not found');
      }
      
      // Calculate Euclidean distance between coordinates
      const dx = place2.coordinates.x - place1.coordinates.x;
      const dy = place2.coordinates.y - place1.coordinates.y;
      const dz = place2.coordinates.z - place1.coordinates.z;
      
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    } catch (error) {
      console.error(`Failed to calculate distance between ${placeId1} and ${placeId2}:`, error);
      return Infinity;
    }
  }

  /**
   * Validate a place's data
   * @param {Object} placeData - Place data to validate
   * @returns {boolean} Whether the data is valid
   */
  validatePlaceData(placeData) {
    // Name is required
    if (!placeData.name || typeof placeData.name !== 'string') {
      return false;
    }
    
    // Type must be valid if provided
    if (placeData.type && !Object.values(PlaceType).includes(placeData.type)) {
      return false;
    }
    
    // Coordinates must be valid if provided
    if (placeData.coordinates) {
      const { x, y, z } = placeData.coordinates;
      if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Save a place to file
   * @param {Place} place - Place to save
   * @private
   */
  async _savePlace(place) {
    try {
      const filePath = path.join(this.placesPath, `${place.id}.json`);
      await fs.writeFile(filePath, JSON.stringify(place.toJSON(), null, 2));
    } catch (error) {
      console.error(`Failed to save place ${place.id}:`, error);
      throw error;
    }
  }

  /**
   * Save a connection to file
   * @param {Connection} connection - Connection to save
   * @private
   */
  async _saveConnection(connection) {
    try {
      const filePath = path.join(this.connectionsPath, `${connection.id}.json`);
      await fs.writeFile(filePath, JSON.stringify(connection.toJSON(), null, 2));
    } catch (error) {
      console.error(`Failed to save connection ${connection.id}:`, error);
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
   * Cleans up the PlaceManager instance
   */
  cleanup() {    
    // Clean up event listeners
    this.removeEventListener('all', () => {});
    
    // Reset initialized flag
    this.initialized = false;
    return true;
  }
}

// Create and export a singleton instance
const placeManager = new PlaceManager();
export default placeManager;

// Also export the classes for direct use
export { Place, Connection };
