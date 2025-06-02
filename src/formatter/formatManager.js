/**
 * Format Manager
 * 
 * Manages response formatting for agents and scenarios
 * Handles templates, customization, validation, and variables
 * Integrates with other managers for comprehensive formatting
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

// Import managers (will be injected during initialization)
let agentManager;
let placeManager;
let timeManager;
let userManager;

class FormatManager {
  constructor() {
    this.formats = new Map();
    this.agentFormats = new Map();
    this.defaultFormat = 'standard';
    this.eventEmitter = new EventEmitter();
    this.initialized = false;
    this.config = {
      formatsPath: './data/formats',
      defaultFormatsFile: 'formats.json'
    };
  }

  /**
   * Initialize the Format Manager
   * @param {Object} config Configuration options
   * @param {Object} dependencies Injected manager dependencies
   * @returns {Promise<boolean>} Initialization success
   */
  async initialize(config = {}, dependencies = {}) {
    if (this.initialized) return true;

    // Merge config with defaults
    this.config = { ...this.config, ...config };

    // Set up dependencies
    agentManager = dependencies.agentManager;
    placeManager = dependencies.placeManager;
    timeManager = dependencies.timeManager;
    userManager = dependencies.userManager;

    // Create formats directory if it doesn't exist
    try {
      await fs.mkdir(this.config.formatsPath, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        console.error('Error creating formats directory:', error);
        throw error;
      }
    }

    // Add default formats
    this.formats.set('standard', {
      id: 'standard',
      name: 'Standard Format',
      description: 'Default message format for agent responses',
      template: '{{content}}',
      variables: ['content'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    this.formats.set('detailed', {
      id: 'detailed',
      name: 'Detailed Format',
      description: 'Detailed format with emotions and actions',
      template: '**{{agentName}}** {{#if emotion}}*[{{emotion}}]* {{/if}}{{content}}{{#if action}}\n\n*{{action}}*{{/if}}',
      variables: ['agentName', 'content', 'emotion', 'action'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    this.formats.set('roleplay', {
      id: 'roleplay',
      name: 'Roleplay Format',
      description: 'Format for roleplay interactions',
      template: '**{{agentName}}** {{#if location}}*[at {{location}}]* {{/if}}{{#if emotion}}*[{{emotion}}]* {{/if}}\n{{content}}{{#if action}}\n\n*{{action}}*{{/if}}{{#if time}}\n\n*[{{time}}]*{{/if}}',
      variables: ['agentName', 'content', 'emotion', 'action', 'location', 'time'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    this.formats.set('system', {
      id: 'system',
      name: 'System Message',
      description: 'Format for system notifications',
      template: '*System: {{content}}*',
      variables: ['content'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Load formats from file
    try {
      const formatsFilePath = path.join(this.config.formatsPath, this.config.defaultFormatsFile);
      try {
        await fs.access(formatsFilePath);
        const data = await fs.readFile(formatsFilePath, 'utf8');
        const formatData = JSON.parse(data);

        // Process format templates
        for (const format of formatData.formats || []) {
          this.formats.set(format.id, format);
        }

        // Process agent format assignments
        for (const [agentId, formatId] of Object.entries(formatData.agentFormats || {})) {
          this.agentFormats.set(agentId, formatId);
        }

        // Set default format
        if (formatData.defaultFormat) {
          this.defaultFormat = formatData.defaultFormat;
        }

        console.log(`Loaded ${this.formats.size} format templates`);
      } catch (error) {
        if (error.code === 'ENOENT') {
          // File doesn't exist, create a new one
          await this.saveFormats();
          console.log('Created new formats file');
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('Error loading formats:', error);
      throw error;
    }

    this.initialized = true;
    this.eventEmitter.emit('initialized');
    return true;
  }

  /**
   * Save formats to file
   * @returns {Promise<boolean>} Save success
   */
  async saveFormats() {
    try {
      const formatsFilePath = path.join(this.config.formatsPath, this.config.defaultFormatsFile);
      const formatData = {
        formats: Array.from(this.formats.values()),
        agentFormats: Object.fromEntries(this.agentFormats),
        defaultFormat: this.defaultFormat
      };
      await fs.writeFile(formatsFilePath, JSON.stringify(formatData, null, 2), 'utf8');
      return true;
    } catch (error) {
      console.error('Error saving formats:', error);
      throw error;
    }
  }

  /**
   * Cleanup resources
   * @returns {Promise<boolean>} Cleanup success
   */
  async cleanup() {
    // Save any unsaved changes
    await this.saveFormats();
    
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
   * Create a new format template
   * @param {Object} formatData Format data
   * @returns {Promise<string>} The format ID
   */
  async createFormat(formatData) {
    if (!this.initialized) {
      throw new Error('Format Manager not initialized');
    }

    // Validate the format template
    this.validateFormat(formatData);

    // Generate a unique ID
    const formatId = formatData.id || `format-${uuidv4()}`;

    // Create format object with defaults
    const format = {
      id: formatId,
      name: formatData.name || 'Unnamed Format',
      description: formatData.description || '',
      template: formatData.template,
      variables: formatData.variables || this.extractVariablesFromTemplate(formatData.template),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save to map
    this.formats.set(formatId, format);

    // Save to file
    await this.saveFormats();

    // Emit event
    this.eventEmitter.emit('formatCreated', {
      formatId,
      name: format.name
    });

    return formatId;
  }

  /**
   * Get a format by ID
   * @param {string} formatId Format ID
   * @returns {Object|null} The format object or null if not found
   */
  getFormat(formatId) {
    if (!this.initialized) {
      throw new Error('Format Manager not initialized');
    }

    return this.formats.get(formatId) || null;
  }

  /**
   * Update a format
   * @param {string} formatId Format ID
   * @param {Object} updates Updates to apply
   * @returns {Promise<boolean>} Update success
   */
  async updateFormat(formatId, updates) {
    if (!this.initialized) {
      throw new Error('Format Manager not initialized');
    }

    const format = this.formats.get(formatId);
    if (!format) {
      throw new Error(`Format ${formatId} not found`);
    }

    // Create updated format
    const updatedFormat = {
      ...format,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    // If template was updated, re-extract variables
    if (updates.template) {
      updatedFormat.variables = this.extractVariablesFromTemplate(updates.template);
    }

    // Validate the updated format
    this.validateFormat(updatedFormat);

    // Save to map
    this.formats.set(formatId, updatedFormat);

    // Save to file
    await this.saveFormats();

    // Emit event
    this.eventEmitter.emit('formatUpdated', {
      formatId,
      name: updatedFormat.name,
      updates: Object.keys(updates)
    });

    return true;
  }

  /**
   * Delete a format
   * @param {string} formatId Format ID
   * @returns {Promise<boolean>} Deletion success
   */
  async deleteFormat(formatId) {
    if (!this.initialized) {
      throw new Error('Format Manager not initialized');
    }

    // Can't delete built-in formats
    if (['standard', 'detailed', 'roleplay', 'system'].includes(formatId)) {
      throw new Error(`Cannot delete built-in format: ${formatId}`);
    }

    const format = this.formats.get(formatId);
    if (!format) {
      throw new Error(`Format ${formatId} not found`);
    }

    // Delete from map
    this.formats.delete(formatId);

    // Update any agents using this format to use the default
    for (const [agentId, agentFormatId] of this.agentFormats.entries()) {
      if (agentFormatId === formatId) {
        this.agentFormats.set(agentId, this.defaultFormat);
      }
    }

    // Save to file
    await this.saveFormats();

    // Emit event
    this.eventEmitter.emit('formatDeleted', {
      formatId,
      name: format.name
    });

    return true;
  }

  /**
   * Validate a format template
   * @param {Object} format Format to validate
   * @throws {Error} If the format is invalid
   */
  validateFormat(format) {
    if (!format.template) {
      throw new Error('Format template is required');
    }

    // Check for balanced {{ }} pairs
    const openBraces = (format.template.match(/\{\{/g) || []).length;
    const closeBraces = (format.template.match(/\}\}/g) || []).length;
    if (openBraces !== closeBraces) {
      throw new Error('Unbalanced {{ }} pairs in template');
    }

    // Check for balanced {{#if }} {{/if}} pairs
    const openIfs = (format.template.match(/\{\{#if [^}]+\}\}/g) || []).length;
    const closeIfs = (format.template.match(/\{\{\/if\}\}/g) || []).length;
    if (openIfs !== closeIfs) {
      throw new Error('Unbalanced {{#if}} {{/if}} pairs in template');
    }

    return true;
  }

  /**
   * Extract variables from a template
   * @param {string} template Format template
   * @returns {Array<string>} List of variable names
   */
  extractVariablesFromTemplate(template) {
    const variables = new Set();
    
    // Extract simple variables {{ varName }}
    const varMatches = template.match(/\{\{([^#/][^}]+)\}\}/g) || [];
    for (const match of varMatches) {
      const varName = match.replace(/\{\{|\}\}/g, '').trim();
      if (varName && !varName.startsWith('if') && !varName.startsWith('/')) {
        variables.add(varName);
      }
    }

    // Extract conditional variables {{#if varName}}
    const condMatches = template.match(/\{\{#if ([^}]+)\}\}/g) || [];
    for (const match of condMatches) {
      const varName = match.replace(/\{\{#if|\}\}/g, '').trim();
      if (varName) {
        variables.add(varName);
      }
    }

    return Array.from(variables);
  }

  /**
   * Get all formats
   * @returns {Array} Array of format objects
   */
  getAllFormats() {
    if (!this.initialized) {
      throw new Error('Format Manager not initialized');
    }

    return Array.from(this.formats.values());
  }

  /**
   * Set the default format
   * @param {string} formatId Format ID
   * @returns {Promise<boolean>} Success
   */
  async setDefaultFormat(formatId) {
    if (!this.initialized) {
      throw new Error('Format Manager not initialized');
    }

    if (!this.formats.has(formatId)) {
      throw new Error(`Format ${formatId} not found`);
    }

    this.defaultFormat = formatId;
    await this.saveFormats();

    // Emit event
    this.eventEmitter.emit('defaultFormatChanged', {
      formatId,
      name: this.formats.get(formatId).name
    });

    return true;
  }

  /**
   * Get the default format
   * @returns {Object} The default format
   */
  getDefaultFormat() {
    if (!this.initialized) {
      throw new Error('Format Manager not initialized');
    }

    return this.formats.get(this.defaultFormat);
  }

  /**
   * Assign a format to an agent
   * @param {string} agentId Agent ID
   * @param {string} formatId Format ID
   * @returns {Promise<boolean>} Success
   */
  async assignFormatToAgent(agentId, formatId) {
    if (!this.initialized) {
      throw new Error('Format Manager not initialized');
    }

    // Check if agent exists if we have agentManager
    if (agentManager) {
      const agent = agentManager.getAgent(agentId);
      if (!agent) {
        throw new Error(`Agent ${agentId} not found`);
      }
    }

    // Check if format exists
    if (!this.formats.has(formatId)) {
      throw new Error(`Format ${formatId} not found`);
    }

    // Assign format
    this.agentFormats.set(agentId, formatId);
    await this.saveFormats();

    // Emit event
    this.eventEmitter.emit('agentFormatAssigned', {
      agentId,
      formatId,
      formatName: this.formats.get(formatId).name
    });

    return true;
  }

  /**
   * Get the format assigned to an agent
   * @param {string} agentId Agent ID
   * @returns {Object} The format object
   */
  getAgentFormat(agentId) {
    if (!this.initialized) {
      throw new Error('Format Manager not initialized');
    }

    const formatId = this.agentFormats.get(agentId) || this.defaultFormat;
    return this.formats.get(formatId);
  }

  /**
   * Format a message for an agent
   * @param {string} agentId Agent ID
   * @param {string} content Message content
   * @param {Object} variables Additional variables
   * @returns {string} Formatted message
   */
  formatMessage(agentId, content, variables = {}) {
    if (!this.initialized) {
      throw new Error('Format Manager not initialized');
    }

    // Get format for this agent
    const format = this.getAgentFormat(agentId);
    
    // Get agent data if available
    let agentData = {};
    if (agentManager) {
      const agent = agentManager.getAgent(agentId);
      if (agent) {
        agentData = {
          agentName: agent.name,
          emotion: agent.state?.mood,
          location: agent.state?.location
        };

        // Get location name if we have placeManager
        if (placeManager && agent.state?.location) {
          const place = placeManager.getPlace(agent.state.location);
          if (place) {
            agentData.locationName = place.name;
          }
        }
      }
    }

    // Get time data if available
    let timeData = {};
    if (timeManager) {
      timeData = {
        time: timeManager.formatTime(timeManager.getInUniverseTime())
      };
    }

    // Combine all variables
    const allVariables = {
      content,
      ...agentData,
      ...timeData,
      ...variables
    };

    // Apply format
    return this.applyFormat(format.template, allVariables);
  }

  /**
   * Apply a format template with variables
   * @param {string} template Format template
   * @param {Object} variables Variables to inject
   * @returns {string} Formatted string
   */
  applyFormat(template, variables) {
    let result = template;

    // Process conditional sections
    const conditionalRegex = /\{\{#if ([^}]+)\}\}(.*?)\{\{\/if\}\}/gs;
    result = result.replace(conditionalRegex, (match, condition, content) => {
      const conditionVar = condition.trim();
      return variables[conditionVar] ? content : '';
    });

    // Replace variables
    const variableRegex = /\{\{([^#/][^}]+)\}\}/g;
    result = result.replace(variableRegex, (match, variable) => {
      const varName = variable.trim();
      return variables[varName] !== undefined ? variables[varName] : '';
    });

    return result;
  }

  /**
   * Create a format from a template string
   * @param {string} name Format name
   * @param {string} template Template string
   * @param {string} description Format description
   * @returns {Promise<string>} Format ID
   */
  async createFormatFromTemplate(name, template, description = '') {
    if (!this.initialized) {
      throw new Error('Format Manager not initialized');
    }

    return this.createFormat({
      name,
      description,
      template
    });
  }

  /**
   * Clone an existing format
   * @param {string} formatId Source format ID
   * @param {string} newName New format name
   * @returns {Promise<string>} New format ID
   */
  async cloneFormat(formatId, newName) {
    if (!this.initialized) {
      throw new Error('Format Manager not initialized');
    }

    const sourceFormat = this.formats.get(formatId);
    if (!sourceFormat) {
      throw new Error(`Format ${formatId} not found`);
    }

    return this.createFormat({
      name: newName || `Copy of ${sourceFormat.name}`,
      description: sourceFormat.description,
      template: sourceFormat.template
    });
  }
}

// Create and export singleton instance
const formatManager = new FormatManager();
export default formatManager;

