import fs from 'fs/promises';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import config from '../config.js';
import contextManager from '../context/contextManager.js';
import memoryManager from '../memory/memoryManager.js';

// Get the directory name
const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Event types for scenario updates
 */
export const ScenarioEventType = {
  SCENARIO_LOADED: 'scenario_loaded',
  SCENARIO_UPDATED: 'scenario_updated',
  SCENARIO_RESET: 'scenario_reset',
  PLOT_ADDED: 'plot_added',
  PLOT_UPDATED: 'plot_updated',
  PLOT_REMOVED: 'plot_removed',
  WORLD_STATE_CHANGED: 'world_state_changed'
};

/**
 * Class representing a scenario event
 */
class ScenarioEvent {
  /**
   * Create a scenario event
   * @param {string} type - Event type
   * @param {Object} data - Event data
   * @param {Date} timestamp - Event timestamp
   */
  constructor(type, data, timestamp = new Date()) {
    this.id = uuidv4();
    this.type = type;
    this.data = data;
    this.timestamp = timestamp;
  }

  /**
   * Convert event to JSON
   * @returns {Object} JSON representation of event
   */
  toJSON() {
    return {
      id: this.id,
      type: this.type,
      data: this.data,
      timestamp: this.timestamp.toISOString()
    };
  }
}

/**
 * Class representing a plot point
 */
class PlotPoint {
  /**
   * Create a plot point
   * @param {Object} params - Plot point parameters
   * @param {string} params.id - Unique identifier
   * @param {string} params.title - Plot point title
   * @param {string} params.description - Plot point description
   * @param {boolean} params.active - Whether the plot point is active
   * @param {string} params.status - Plot point status (e.g., 'pending', 'in_progress', 'completed')
   * @param {Array} params.relatedCharacters - Characters involved in the plot
   * @param {Array} params.relatedLocations - Locations involved in the plot
   * @param {Date} params.createdAt - Creation timestamp
   * @param {Date} params.updatedAt - Last update timestamp
   * @param {Object} params.metadata - Additional metadata
   */
  constructor({
    id = uuidv4(),
    title,
    description,
    active = true,
    status = 'pending',
    relatedCharacters = [],
    relatedLocations = [],
    createdAt = new Date(),
    updatedAt = new Date(),
    metadata = {}
  }) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.active = active;
    this.status = status;
    this.relatedCharacters = relatedCharacters;
    this.relatedLocations = relatedLocations;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.metadata = metadata;
  }

  /**
   * Convert plot point to JSON
   * @returns {Object} JSON representation of plot point
   */
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      active: this.active,
      status: this.status,
      relatedCharacters: this.relatedCharacters,
      relatedLocations: this.relatedLocations,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      metadata: this.metadata
    };
  }

  /**
   * Create plot point from JSON
   * @param {Object} json - JSON representation of plot point
   * @returns {PlotPoint} Plot point instance
   */
  static fromJSON(json) {
    return new PlotPoint({
      id: json.id,
      title: json.title,
      description: json.description,
      active: json.active,
      status: json.status,
      relatedCharacters: json.relatedCharacters || [],
      relatedLocations: json.relatedLocations || [],
      createdAt: new Date(json.createdAt),
      updatedAt: new Date(json.updatedAt),
      metadata: json.metadata || {}
    });
  }
}

/**
 * Class for managing scenarios
 */
class ScenarioManager {
  /**
   * Create a scenario manager
   */
  constructor() {
    this.scenariosPath = config.scenarios.path;
    this.defaultScenarioFile = config.scenarios.defaultScenario;
    
    // Current scenario state
    this.currentScenario = {
      id: null,
      name: '',
      description: '',
      plots: [],
      worldState: {},
      createdAt: null,
      updatedAt: null,
      metadata: {}
    };
    
    // Event listeners
    this.eventListeners = {};
    
    // Initialization flag
    this.initialized = false;
  }

  /**
   * Initialize the scenario manager
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      // Create scenarios directory if it doesn't exist
      await fs.mkdir(this.scenariosPath, { recursive: true });
      
      // Check if default scenario exists
      const defaultScenarioPath = path.join(this.scenariosPath, this.defaultScenarioFile);
      try {
        await fs.access(defaultScenarioPath);
      } catch (error) {
        // Create default scenario if it doesn't exist
        await this._createDefaultScenario();
      }
      
      // Load default scenario
      await this.loadScenario(this.defaultScenarioFile);
      
      this.initialized = true;
      console.log('Scenario Manager initialized');
    } catch (error) {
      console.error('Failed to initialize Scenario Manager:', error);
      throw error;
    }
  }

  /**
   * Create default scenario
   * @private
   * @returns {Promise<void>}
   */
  async _createDefaultScenario() {
    try {
      const defaultScenario = {
        id: uuidv4(),
        name: 'Default Scenario',
        description: 'A new world begins. This is the default scenario.',
        plots: [
          new PlotPoint({
            title: 'New Beginning',
            description: 'The story is just starting. Characters are getting to know each other.',
            status: 'in_progress'
          }).toJSON()
        ],
        worldState: {
          timeOfDay: 'morning',
          weather: 'clear',
          currentEvents: []
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {}
      };
      
      const defaultScenarioPath = path.join(this.scenariosPath, this.defaultScenarioFile);
      await fs.writeFile(defaultScenarioPath, JSON.stringify(defaultScenario, null, 2));
      console.log(`Created default scenario at ${defaultScenarioPath}`);
    } catch (error) {
      console.error('Failed to create default scenario:', error);
      throw error;
    }
  }

  /**
   * Load a scenario from file
   * @param {string} filename - Scenario filename
   * @returns {Promise<Object>} Loaded scenario
   */
  async loadScenario(filename) {
    try {
      if (!this.initialized && filename !== this.defaultScenarioFile) {
        await this.initialize();
      }
      
      const scenarioPath = path.join(this.scenariosPath, filename);
      const scenarioData = await fs.readFile(scenarioPath, 'utf-8');
      const scenario = JSON.parse(scenarioData);
      
      // Validate scenario structure
      this._validateScenario(scenario);
      
      // Convert plot points to PlotPoint instances
      scenario.plots = scenario.plots.map(plot => PlotPoint.fromJSON(plot));
      
      // Update current scenario
      this.currentScenario = {
        ...scenario,
        createdAt: new Date(scenario.createdAt),
        updatedAt: new Date(scenario.updatedAt)
      };
      
      // Add to context
      await this._addToContext('Scenario loaded: ' + scenario.name);
      
      // Add to memory
      await this._addToMemory(`Scenario "${scenario.name}" loaded. ${scenario.description}`);
      
      // Emit event
      this._emitEvent(ScenarioEventType.SCENARIO_LOADED, { scenario: this.getScenario() });
      
      console.log(`Scenario loaded from ${scenarioPath}`);
      return this.getScenario();
    } catch (error) {
      console.error(`Failed to load scenario ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Save the current scenario to file
   * @param {string} [filename=null] - Scenario filename (defaults to current scenario filename)
   * @returns {Promise<void>}
   */
  async saveScenario(filename = null) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      const targetFilename = filename || this.defaultScenarioFile;
      const scenarioPath = path.join(this.scenariosPath, targetFilename);
      
      // Update timestamp
      this.currentScenario.updatedAt = new Date();
      
      // Convert plot points to JSON
      const scenarioToSave = {
        ...this.currentScenario,
        plots: this.currentScenario.plots.map(plot => 
          plot instanceof PlotPoint ? plot.toJSON() : plot
        ),
        createdAt: this.currentScenario.createdAt.toISOString(),
        updatedAt: this.currentScenario.updatedAt.toISOString()
      };
      
      await fs.writeFile(scenarioPath, JSON.stringify(scenarioToSave, null, 2));
      console.log(`Scenario saved to ${scenarioPath}`);
    } catch (error) {
      console.error('Failed to save scenario:', error);
      throw error;
    }
  }

  /**
   * Get the current scenario
   * @returns {Object} Current scenario
   */
  getScenario() {
    try {
      // Return a deep copy to prevent accidental mutations
      return JSON.parse(JSON.stringify({
        ...this.currentScenario,
        plots: this.currentScenario.plots.map(plot => 
          plot instanceof PlotPoint ? plot.toJSON() : plot
        ),
        createdAt: this.currentScenario.createdAt.toISOString(),
        updatedAt: this.currentScenario.updatedAt.toISOString()
      }));
    } catch (error) {
      console.error('Failed to get scenario:', error);
      throw error;
    }
  }

  /**
   * Update the scenario
   * @param {Object} updates - Updates to apply to the scenario
   * @param {boolean} [save=true] - Whether to save the changes to disk
   * @returns {Promise<Object>} Updated scenario
   */
  async updateScenario(updates, save = true) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Validate updates
      if (!updates || typeof updates !== 'object') {
        throw new Error('Updates must be an object');
      }
      
      // Apply updates
      const previousScenario = this.getScenario();
      
      if (updates.name !== undefined) this.currentScenario.name = updates.name;
      if (updates.description !== undefined) this.currentScenario.description = updates.description;
      
      // Handle plot updates (if provided)
      if (updates.plots !== undefined) {
        if (!Array.isArray(updates.plots)) {
          throw new Error('Plots must be an array');
        }
        
        // Convert to PlotPoint instances
        this.currentScenario.plots = updates.plots.map(plot => 
          plot instanceof PlotPoint ? plot : PlotPoint.fromJSON(plot)
        );
      }
      
      // Handle world state updates (if provided)
      if (updates.worldState !== undefined) {
        if (typeof updates.worldState !== 'object') {
          throw new Error('World state must be an object');
        }
        
        this.currentScenario.worldState = {
          ...this.currentScenario.worldState,
          ...updates.worldState
        };
        
        // Emit world state changed event
        this._emitEvent(ScenarioEventType.WORLD_STATE_CHANGED, { 
          previous: previousScenario.worldState,
          current: this.currentScenario.worldState
        });
      }
      
      // Handle metadata updates (if provided)
      if (updates.metadata !== undefined) {
        if (typeof updates.metadata !== 'object') {
          throw new Error('Metadata must be an object');
        }
        
        this.currentScenario.metadata = {
          ...this.currentScenario.metadata,
          ...updates.metadata
        };
      }
      
      // Update timestamp
      this.currentScenario.updatedAt = new Date();
      
      // Add to context
      await this._addToContext(`Scenario updated: ${this.currentScenario.name}`);
      
      // Add to memory
      await this._addToMemory(`Scenario "${this.currentScenario.name}" was updated.`);
      
      // Emit event
      this._emitEvent(ScenarioEventType.SCENARIO_UPDATED, { 
        previous: previousScenario,
        current: this.getScenario()
      });
      
      // Save if requested
      if (save) {
        await this.saveScenario();
      }
      
      console.log('Scenario updated');
      return this.getScenario();
    } catch (error) {
      console.error('Failed to update scenario:', error);
      throw error;
    }
  }

  /**
   * Reset the scenario to default
   * @returns {Promise<Object>} Reset scenario
   */
  async resetScenario() {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Create a new default scenario
      await this._createDefaultScenario();
      
      // Load the default scenario
      await this.loadScenario(this.defaultScenarioFile);
      
      // Add to context
      await this._addToContext('Scenario reset to default');
      
      // Add to memory
      await this._addToMemory('The scenario was reset to default state.');
      
      // Emit event
      this._emitEvent(ScenarioEventType.SCENARIO_RESET, { scenario: this.getScenario() });
      
      console.log('Scenario reset to default');
      return this.getScenario();
    } catch (error) {
      console.error('Failed to reset scenario:', error);
      throw error;
    }
  }

  /**
   * Add a plot point to the scenario
   * @param {Object} plotData - Plot point data
   * @returns {Promise<PlotPoint>} Added plot point
   */
  async addPlot(plotData) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Create plot point instance
      const plot = new PlotPoint(plotData);
      
      // Add to plots array
      this.currentScenario.plots.push(plot);
      
      // Update timestamp
      this.currentScenario.updatedAt = new Date();
      
      // Add to context
      await this._addToContext(`New plot added: ${plot.title}`);
      
      // Add to memory
      await this._addToMemory(`A new plot "${plot.title}" was added to the scenario. ${plot.description}`);
      
      // Emit event
      this._emitEvent(ScenarioEventType.PLOT_ADDED, { plot: plot.toJSON() });
      
      // Save changes
      await this.saveScenario();
      
      console.log(`Plot added: ${plot.title}`);
      return plot;
    } catch (error) {
      console.error('Failed to add plot:', error);
      throw error;
    }
  }

  /**
   * Update a plot point in the scenario
   * @param {string} plotId - Plot point ID
   * @param {Object} updates - Updates to apply to the plot point
   * @returns {Promise<PlotPoint|null>} Updated plot point or null if not found
   */
  async updatePlot(plotId, updates) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Find plot point
      const plotIndex = this.currentScenario.plots.findIndex(plot => plot.id === plotId);
      if (plotIndex === -1) {
        console.log(`Plot with ID ${plotId} not found`);
        return null;
      }
      
      // Get the plot
      const plot = this.currentScenario.plots[plotIndex];
      const previousPlot = { ...plot.toJSON() };
      
      // Apply updates
      if (updates.title !== undefined) plot.title = updates.title;
      if (updates.description !== undefined) plot.description = updates.description;
      if (updates.active !== undefined) plot.active = updates.active;
      if (updates.status !== undefined) plot.status = updates.status;
      if (updates.relatedCharacters !== undefined) plot.relatedCharacters = updates.relatedCharacters;
      if (updates.relatedLocations !== undefined) plot.relatedLocations = updates.relatedLocations;
      if (updates.metadata !== undefined) {
        plot.metadata = {
          ...plot.metadata,
          ...updates.metadata
        };
      }
      
      // Update timestamps
      plot.updatedAt = new Date();
      this.currentScenario.updatedAt = new Date();
      
      // Add to context
      await this._addToContext(`Plot updated: ${plot.title}`);
      
      // Add to memory
      await this._addToMemory(`The plot "${plot.title}" was updated. Status: ${plot.status}`);
      
      // Emit event
      this._emitEvent(ScenarioEventType.PLOT_UPDATED, { 
        previous: previousPlot,
        current: plot.toJSON()
      });
      
      // Save changes
      await this.saveScenario();
      
      console.log(`Plot updated: ${plot.title}`);
      return plot;
    } catch (error) {
      console.error(`Failed to update plot ${plotId}:`, error);
      throw error;
    }
  }

  /**
   * Remove a plot point from the scenario
   * @param {string} plotId - Plot point ID
   * @returns {Promise<boolean>} Success indicator
   */
  async removePlot(plotId) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Find plot point
      const plotIndex = this.currentScenario.plots.findIndex(plot => plot.id === plotId);
      if (plotIndex === -1) {
        console.log(`Plot with ID ${plotId} not found`);
        return false;
      }
      
      // Get plot info before removal
      const plot = this.currentScenario.plots[plotIndex];
      
      // Remove plot
      this.currentScenario.plots.splice(plotIndex, 1);
      
      // Update timestamp
      this.currentScenario.updatedAt = new Date();
      
      // Add to context
      await this._addToContext(`Plot removed: ${plot.title}`);
      
      // Add to memory
      await this._addToMemory(`The plot "${plot.title}" was removed from the scenario.`);
      
      // Emit event
      this._emitEvent(ScenarioEventType.PLOT_REMOVED, { plot: plot.toJSON() });
      
      // Save changes
      await this.saveScenario();
      
      console.log(`Plot removed: ${plot.title}`);
      return true;
    } catch (error) {
      console.error(`Failed to remove plot ${plotId}:`, error);
      throw error;
    }
  }

  /**
   * Update the world state
   * @param {Object} updates - Updates to apply to the world state
   * @returns {Promise<Object>} Updated world state
   */
  async updateWorldState(updates) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Validate updates
      if (!updates || typeof updates !== 'object') {
        throw new Error('Updates must be an object');
      }
      
      // Get previous world state for event
      const previousWorldState = { ...this.currentScenario.worldState };
      
      // Apply updates
      this.currentScenario.worldState = {
        ...this.currentScenario.worldState,
        ...updates
      };
      
      // Update timestamp
      this.currentScenario.updatedAt = new Date();
      
      // Add to context
      await this._addToContext('World state updated');
      
      // Add to memory
      const updateDescription = Object.entries(updates)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      await this._addToMemory(`The world state was updated. ${updateDescription}`);
      
      // Emit event
      this._emitEvent(ScenarioEventType.WORLD_STATE_CHANGED, { 
        previous: previousWorldState,
        current: this.currentScenario.worldState
      });
      
      // Save changes
      await this.saveScenario();
      
      console.log('World state updated');
      return this.currentScenario.worldState;
    } catch (error) {
      console.error('Failed to update world state:', error);
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
   * Validate scenario structure
   * @param {Object} scenario - Scenario to validate
   * @private
   */
  _validateScenario(scenario) {
    // Required fields
    const requiredFields = ['id', 'name', 'description', 'plots', 'worldState', 'createdAt', 'updatedAt'];
    for (const field of requiredFields) {
      if (scenario[field] === undefined) {
        throw new Error(`Invalid scenario: missing required field '${field}'`);
      }
    }
    
    // Validate plots
    if (!Array.isArray(scenario.plots)) {
      throw new Error('Invalid scenario: plots must be an array');
    }
    
    // Validate world state
    if (typeof scenario.worldState !== 'object') {
      throw new Error('Invalid scenario: worldState must be an object');
    }
  }

  /**
   * Add a message to the context manager
   * @param {string} message - Message content
   * @private
   */
  async _addToContext(message) {
    try {
      await contextManager.addContextMessage({
        content: message,
        role: 'system',
        metadata: { source: 'ScenarioManager' }
      });
    } catch (error) {
      console.error('Failed to add to context:', error);
    }
  }

  /**
   * Add a memory to the memory manager
   * @param {string} content - Memory content
   * @private
   */
  async _addToMemory(content) {
    try {
      await memoryManager.addMemory({
        content,
        agentId: 'system',
        tags: ['scenario'],
        keywords: ['scenario', 'world', 'plot'],
        metadata: { source: 'ScenarioManager' }
      });
    } catch (error) {
      console.error('Failed to add to memory:', error);
    }
  }

  /**
   * Emit an event
   * @param {string} type - Event type
   * @param {Object} data - Event data
   * @private
   */
  _emitEvent(type, data) {
    // Create event
    const event = new ScenarioEvent(type, data);
    
    // Notify listeners
    if (this.eventListeners[type]) {
      for (const listener of this.eventListeners[type]) {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in event listener for ${type}:`, error);
        }
      }
    }
    
    // Notify 'all' listeners
    if (this.eventListeners['all']) {
      for (const listener of this.eventListeners['all']) {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in 'all' event listener for ${type}:`, error);
        }
      }
    }
  }

  /**
   * Cleans up the ScenarioManager instance
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
const scenarioManager = new ScenarioManager();
export default scenarioManager;

// Also export the classes for direct use
export { PlotPoint, ScenarioEvent };

