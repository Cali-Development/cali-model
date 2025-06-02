import fs from 'fs/promises';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { Groq } from 'groq-sdk';
import config from '../config.js';

// Local Modules
import { AgentRelationship } from './agentRelationship.js';
import { AgentMessage } from './agentMessage.js';
import { AgentActions } from './agentActions.js';
import { Agent } from './agentClass.js';

import { AgentData, Context, Message } from './Parameters.js';

// Modules
import memoryManager from '../memory/memoryManager.js';
import placeManager from '../places/placeManager.js';
import contextManager from '../context/contextManager.js';
import scenarioManager from '../scenario/scenarioManager.js';
import timeManager from '../time/timeManager.js';
import actionManager from '../actions/actionManager.js';

// Get the directory name
const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Event types for agent events
 */
export const AgentEventType = {
  AGENT_CREATED: 'agent_created',
  AGENT_UPDATED: 'agent_updated',
  AGENT_DELETED: 'agent_deleted',
  AGENT_MOVED: 'agent_moved',
  AGENT_MESSAGE_SENT: 'agent_message_sent',
  AGENT_STATE_CHANGED: 'agent_state_changed'
};

/**
 * Relationship types between agents
 */
export const RelationshipType = {
  FRIEND: 'friend',
  ENEMY: 'enemy',
  ACQUAINTANCE: 'acquaintance',
  FAMILY: 'family',
  COLLEAGUE: 'colleague',
  LOVER: 'lover',
  RIVAL: 'rival',
  MENTOR: 'mentor',
  STUDENT: 'student',
  NEUTRAL: 'neutral'
};

/**
 * Emotion types for agents
 */
export const EmotionType = {
  HAPPY: 'happy',
  SAD: 'sad',
  ANGRY: 'angry',
  AFRAID: 'afraid',
  SURPRISED: 'surprised',
  DISGUSTED: 'disgusted',
  NEUTRAL: 'neutral',
  EXCITED: 'excited',
  BORED: 'bored',
  ANXIOUS: 'anxious',
  CONTENT: 'content',
  CONFUSED: 'confused'
};

/**
 * Class for managing AI agents
 */
class AgentManager {
  /**
   * Create an agent manager
   */
  constructor() {
    this.agentsPath = path.join(config.system.dataDir, 'agents');
    this.relationshipsPath = path.join(config.system.dataDir, 'relationships');
    this.agents = new Map(); // Map of agent ID to agent object
    this.relationships = new Map(); // Map of relationship ID to relationship object
    this.messageHistory = new Map(); // Map of agent ID to array of messages
    
    this.groq = new Groq({ apiKey: config.api.groq.apiKey });
    
    // Event listeners
    this.eventListeners = {};
    
    // Initialization flag
    this.initialized = false;
  }

  /**
   * Initialize the agent manager
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      // Create agents directory if it doesn't exist
      await fs.mkdir(this.agentsPath, { recursive: true });
      await fs.mkdir(this.relationshipsPath, { recursive: true });
      
      // Load all existing agents
      const files = await fs.readdir(this.agentsPath);
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const agentData = await fs.readFile(path.join(this.agentsPath, file), 'utf-8');
            const agent = Agent.fromJSON(JSON.parse(agentData));
            this.agents.set(agent.id, agent);
          } catch (error) {
            console.error(`Failed to load agent from ${file}:`, error);
          }
        }
      }
      
      // Load all existing relationships
      const relationshipFiles = await fs.readdir(this.relationshipsPath);
      for (const file of relationshipFiles) {
        if (file.endsWith('.json')) {
          try {
            const relationshipData = await fs.readFile(path.join(this.relationshipsPath, file), 'utf-8');
            const relationship = AgentRelationship.fromJSON(JSON.parse(relationshipData));
            this.relationships.set(relationship.id, relationship);
          } catch (error) {
            console.error(`Failed to load relationship from ${file}:`, error);
          }
        }
      }
      
      this.initialized = true;
      console.log(`Agent Manager initialized with ${this.agents.size} agents and ${this.relationships.size} relationships`);
    } catch (error) {
      console.error('Failed to initialize Agent Manager:', error);
      throw error;
    }
  }

  /**
   * Create a new agent
   * @param {AgentData} agentData - Agent data
   * @returns {Promise<Agent>} Created agent
   */
  async createAgent(agentData) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Validate required fields
      if (!agentData.name || !agentData.personality) {
        throw new Error('Agent name and personality are required');
      }
      
      // Create agent instance
      const agent = new Agent({
        ...agentData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Add to agents map
      this.agents.set(agent.id, agent);
      
      // Save agent to file
      await this._saveAgent(agent);
      
      // Emit event
      this._emitEvent(AgentEventType.AGENT_CREATED, { agent: agent.toJSON() });
      
      console.log(`Agent created: ${agent.name} (${agent.id})`);
      return agent;
    } catch (error) {
      console.error('Failed to create agent:', error);
      throw error;
    }
  }

  /**
   * Get an agent by ID
   * @param {string} id - Agent ID
   * @returns {Agent|null} Agent instance or null if not found
   */
  async getAgent(id) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      return this.agents.get(id) || null;
    } catch (error) {
      console.error(`Failed to get agent with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get all agents
   * @returns {Agent[]} Array of all agents
   */
  async getAllAgents() {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      return Array.from(this.agents.values());
    } catch (error) {
      console.error('Failed to get all agents:', error);
      throw error;
    }
  }

  /**
   * Update an agent
   * @param {string} id - Agent ID
   * @param {AgentData} updates - Updates to apply to the agent
   * @returns {Promise<Agent|null>} Updated agent or null if not found
   */
  async updateAgent(id, updates) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Find agent
      const agent = this.agents.get(id);
      if (!agent) {
        console.log(`Agent with ID ${id} not found`);
        return null;
      }
      
      // Get previous agent state for events
      const previousAgent = { ...agent.toJSON() };
      
      // Apply updates
      if (updates.name !== undefined) agent.name = updates.name;
      if (updates.description !== undefined) agent.description = updates.description;
      if (updates.personality !== undefined) agent.personality = updates.personality;
      if (updates.appearance !== undefined) agent.appearance = updates.appearance;
      if (updates.backstory !== undefined) agent.backstory = updates.backstory;
      if (updates.locationId !== undefined) {
        const previousLocation = agent.locationId;
        agent.locationId = updates.locationId;
        
        // Emit move event if location changed
        if (previousLocation !== updates.locationId) {
          this._emitEvent(AgentEventType.AGENT_MOVED, { 
            agentId: id,
            previousLocation,
            newLocation: updates.locationId
          });
        }
      }
      
      if (updates.inventory !== undefined) agent.inventory = updates.inventory;
      if (updates.goals !== undefined) agent.goals = updates.goals;
      if (updates.traits !== undefined) agent.traits = { ...agent.traits, ...updates.traits };
      if (updates.state !== undefined) {
        const previousState = { ...agent.state };
        agent.state = { ...agent.state, ...updates.state };
        
        // Emit state changed event
        this._emitEvent(AgentEventType.AGENT_STATE_CHANGED, {
          agentId: id,
          previousState,
          newState: agent.state
        });
      }
      
      if (updates.isActive !== undefined) agent.isActive = updates.isActive;
      if (updates.metadata !== undefined) {
        agent.metadata = { ...agent.metadata, ...updates.metadata };
      }
      
      // Update timestamp
      agent.updatedAt = new Date();
      
      // Save agent to file
      await this._saveAgent(agent);
      
      // Emit event
      this._emitEvent(AgentEventType.AGENT_UPDATED, { 
        previous: previousAgent,
        current: agent.toJSON()
      });
      
      console.log(`Agent updated: ${agent.name} (${agent.id})`);
      return agent;
    } catch (error) {
      console.error(`Failed to update agent ${id}:`, error);
      throw error;
    }
  }

  /**
   * Save an agent to file
   * @param {Agent} agent - Agent to save
   * @returns {Promise<void>} Promise that resolves when the agent is saved
   */
  _saveAgent(agent) {
    return new Promise((resolve, reject) => {
      fs.writeFile(path.join(this.agentsPath, `${agent.id}.json`), JSON.stringify(agent, null, 2), (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Delete an agent
   * @param {string} id - Agent ID
   * @returns {Promise<boolean>} Success indicator
   */
  async deleteAgent(id) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Find agent
      const agent = this.agents.get(id);
      if (!agent) {
        console.log(`Agent with ID ${id} not found`);
        return false;
      }
      
      // Get agent info before removal
      const agentInfo = agent.toJSON();
      
      // Remove agent from map
      this.agents.delete(id);
      
      // Delete agent file
      await fs.unlink(path.join(this.agentsPath, `${id}.json`));
      
      // Emit event
      this._emitEvent(AgentEventType.AGENT_DELETED, { agent: agentInfo });
      
      console.log(`Agent deleted: ${agent.name} (${agent.id})`);
      return true;
    } catch (error) {
      console.error(`Failed to delete agent ${id}:`, error);
      throw error;
    }
  }

  /**
   * Send a message from one agent to another
   * @param {Message} messageData - Message data
   * @returns {Promise<AgentMessage>} Sent message
   */
  async sendAgentMessage(messageData) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Validate required fields
      if (!messageData.content || !messageData.fromAgentId || !messageData.toAgentId) {
        throw new Error('Message content, sender, and recipient are required');
      }
      
      // Check if agents exist
      const fromAgent = this.agents.get(messageData.fromAgentId);
      const toAgent = this.agents.get(messageData.toAgentId);
      
      if (!fromAgent) {
        throw new Error(`Sender agent with ID ${messageData.fromAgentId} not found`);
      }
      
      if (!toAgent) {
        throw new Error(`Recipient agent with ID ${messageData.toAgentId} not found`);
      }
      
      // Create message instance
      const message = new AgentMessage({
        content: messageData.content,
        fromAgentId: messageData.fromAgentId,
        toAgentId: messageData.toAgentId,
        type: messageData.type || 'message',
        timestamp: new Date(),
        metadata: messageData.metadata || {}
      });
      
      // Store in message history
      if (!this.messageHistory.has(messageData.fromAgentId)) {
        this.messageHistory.set(messageData.fromAgentId, []);
      }
      if (!this.messageHistory.has(messageData.toAgentId)) {
        this.messageHistory.set(messageData.toAgentId, []);
      }
      
      this.messageHistory.get(messageData.fromAgentId).push(message);
      this.messageHistory.get(messageData.toAgentId).push(message);
      
      // Add to context
      await contextManager.addContextMessage({
        content: `${fromAgent.name} to ${toAgent.name}: ${message.content}`,
        role: 'assistant',
        agentId: message.fromAgentId,
        metadata: {
          isAgentMessage: true,
          toAgentId: message.toAgentId
        }
      });
      
      // Add to memory for both agents
      await memoryManager.addMemory({
        content: `You said to ${toAgent.name}: ${message.content}`,
        agentId: message.fromAgentId,
        tags: ['communication'],
        keywords: [toAgent.name, 'message'],
        metadata: { messageId: message.id, toAgentId: message.toAgentId }
      });
      
      await memoryManager.addMemory({
        content: `${fromAgent.name} said to you: ${message.content}`,
        agentId: message.toAgentId,
        tags: ['communication'],
        keywords: [fromAgent.name, 'message'],
        metadata: { messageId: message.id, fromAgentId: message.fromAgentId }
      });
      
      // Emit event
      this._emitEvent(AgentEventType.AGENT_MESSAGE_SENT, { message: message.toJSON() });
      
      console.log(`Message sent from ${fromAgent.name} to ${toAgent.name}`);
      return message;
    } catch (error) {
      console.error('Failed to send agent message:', error);
      throw error;
    }
  }

  /**
   * Generate a response from an agent to a message
   * @param {string} agentId - Agent ID
   * @param {Context} context - Context data
   * @returns {Promise<string>} Generated response
   */
  async generateAgentResponse(agentId, context) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Get the agent
      const agent = this.agents.get(agentId);
      if (!agent) {
        throw new Error(`Agent with ID ${agentId} not found`);
      }
      
      // Prepare the prompt
      const systemPrompt = agent.getSystemPrompt();
      
      // Prepare context messages
      const messages = [
        { role: 'system', content: systemPrompt }
      ];
      
      // Add time context
      const timeDetails = timeManager.getTimeDetails();
      messages.push({
        role: 'system',
        content: `The current time is ${timeDetails.inUniverse.formatted} (${timeDetails.inUniverse.timeOfDay}).`
      });
      
      // Add location context
      if (agent.locationId) {
        messages.push({
          role: 'system',
          content: `You are currently at ${(await placeManager.getPlace(agent.locationId)).name || 'unknown place'}.`
        });
      }

      // Add scenario context
      const scenario = scenarioManager.getScenario();
      if (scenario) {
        messages.push({
          role: 'system',
          content: `The current scenario name is '${scenario.name}'.`
        });

        messages.push({
          role: 'system',
          content: `The current scenario description is '${scenario.description}'.`
        });
      }

      // Add avaliable actions context
      const actions = actionManager.getAllActions();
      if (actions.length > 0) {
        messages.push({
          role: 'system',
          content: `The following actions are available: ${actions.map(action => action.name).join(', ')}`
        });

        messages.push({
          role: 'system',
          content: `You can get action parameters & argument details by typing: action-getdetails <action name>`
        })

        messages.push({
          role: 'system',
          content: `You can execute actions by typing: action-execute <action name> <JSON>`
        })

        messages.push({
          role: 'system',
          content: `If you've executed an action, the system will return the result of the action.`
        })
      }

      // Add agents (characters) information
      const agents = this.agents.values();
      if (agents.length > 0) {
        messages.push({
          role: 'system',
          content: `The following agents are available: \n${agents.map(agent => '- ' + agent.name + ' (ID: ' + agent.id + ')').join('\n')}`
        });

        messages.push({
          role: 'system',
          content: `You can get agent details by typing: agent-getdetails <agent id>`
        })
      }
      
      // Add relevant memories
      const relevantMemories = await memoryManager.getRelevantMemories({
        query: context.message || '',
        agentId: agentId,
        maxCount: 5
      });
      
      if (relevantMemories.length > 0) {
        messages.push({
          role: 'system',
          content: 'Relevant memories:\n' + relevantMemories.map(memory => 
            `- ${memory.content}`
          ).join('\n')
        });
      }

      // Add context messages
      const contextMessages = await contextManager.getCurrentContextSummary();
      if (contextMessages.length > 0) {
        messages.push({
          role: 'system',
          content: 'Context:\n' + contextMessages
        });
      }

      // Add full conversation history
      const conversationHistory = await contextManager.getFullContext();
      if (conversationHistory.length > 0) {
        messages.push({
          role: 'system',
          content: 'Conversation history:\n' + conversationHistory
        });
      }
      
      // Add additional context if provided
      if (context.additionalContext && context.additionalContext.length > 0) {
        for (const item of context.additionalContext) {
          messages.push({
            role: item.role || 'system',
            content: item.content
          });
        }
      }
      
      // Add the message to respond to
      if (context.message) {
        const fromText = context.fromAgentId ? 
          `${this.agents.get(context.fromAgentId)?.name || 'Someone'}` : 
          'User';
        
        messages.push({
          role: 'user',
          content: `${fromText}: ${context.message}`
        });
      }

      const initialResponse = await this.groq.chat.completions.create({
        messages,
        model: config.api.groq.model,
        temperature: 0.7,
        max_tokens: 800
      });
  
      // Handle action loop
      return await this._handleActionLoop(initialResponse, messages);
    } catch (error) {
      console.error(`Failed to generate response for agent ${agentId}:`, error);
      return `[Error generating response: ${error.message}]`;
    }
  }

  /**
   * Handle action loop
   * @param {object} response 
   * @param {Array} messages 
   * @param {number} depth 
   * @returns {Promise<string>}
   * @private
   */
  async _handleActionLoop(response, messages, depth = 0) {
    if (depth > 120) return response.choices?.[0]?.message?.content || '[Max recursion depth reached]';
  
    const reply = response.choices?.[0]?.message?.content?.trim();
    if (!reply) return '[No response from model]';
  
    try {
      const result = await AgentActions.parseActions(reply);
      result; // Execute the parseAction static function
      if (!result) return reply;
  
      const followUp = await this.groq.chat.completions.create({
        messages: [
          ...messages.filter(msg => msg.role !== 'user'),
          { role: 'system', content: `✅ Action executed:\n${JSON.stringify(result, null, 2)}` },
          { role: 'system', content: 'Continue the conversation.' },
        ],
        model: config.api.groq.model,
        temperature: 0.7,
        max_tokens: 800
      });
  
      return await this._handleActionLoop(followUp, messages, depth + 1);
    } catch (err) {
      console.error('Action parsing or execution error:', err);
  
      const retry = await this.groq.chat.completions.create({
        messages: [
          ...messages.filter(msg => msg.role !== 'user'),
          { role: 'system', content: `❌ Action error: ${err.message}` },
          { role: 'system', content: 'Try again. The action had an error.' },
        ],
        model: config.api.groq.model,
        temperature: 0.7,
        max_tokens: 800
      });
  
      return await this._handleActionLoop(retry, messages, depth + 1);
    }
  }  

  /**
   * Get message history between agents
   * @param {string} agentId1 - First agent ID
   * @param {string} agentId2 - Second agent ID
   * @param {number} [limit=50] - Maximum number of messages to return
   * @returns {Promise<AgentMessage[]>} Array of messages
   */
  async getMessageHistory(agentId1, agentId2, limit = 50) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      const messages = [];
      
      // Get messages from first agent's history
      if (this.messageHistory.has(agentId1)) {
        const agentMessages = this.messageHistory.get(agentId1);
        for (const message of agentMessages) {
          if (message.fromAgentId === agentId2 || message.toAgentId === agentId2) {
            messages.push(message);
          }
        }
      }
      
      // Sort by timestamp
      messages.sort((a, b) => a.timestamp - b.timestamp);
      
      // Apply limit
      return messages.slice(-limit);
    } catch (error) {
      console.error('Failed to get message history:', error);
      throw error;
    }
  }
  
  /**
   * Move an agent to a new location
   * @param {string} agentId - Agent ID
   * @param {string} locationId - New location ID
   * @returns {Promise<Agent|null>} Updated agent or null if not found
   */
  async moveAgent(agentId, locationId) {
    try {
      return await this.updateAgent(agentId, { locationId });
    } catch (error) {
      console.error(`Failed to move agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Get agents at a specific location
   * @param {string} locationId - Location ID
   * @returns {Promise<Agent[]>} Array of agents at the location
   */
  async getAgentsAtLocation(locationId) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      return Array.from(this.agents.values())
        .filter(agent => agent.locationId === locationId);
    } catch (error) {
      console.error(`Failed to get agents at location ${locationId}:`, error);
      throw error;
    }
  }

  /**
   * Create a relationship between agents
   * @param {Object} relationshipData - Relationship data
   * @returns {Promise<AgentRelationship>} Created relationship
   */
  async createRelationship(relationshipData) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Validate required fields
      if (!relationshipData.fromAgentId || !relationshipData.toAgentId) {
        throw new Error('From agent ID and to agent ID are required');
      }
      
      // Check if agents exist
      const fromAgent = this.agents.get(relationshipData.fromAgentId);
      const toAgent = this.agents.get(relationshipData.toAgentId);
      
      if (!fromAgent) {
        throw new Error(`From agent with ID ${relationshipData.fromAgentId} not found`);
      }
      
      if (!toAgent) {
        throw new Error(`To agent with ID ${relationshipData.toAgentId} not found`);
      }
      
      // Check if relationship already exists
      const existingRelationship = Array.from(this.relationships.values()).find(
        r => r.fromAgentId === relationshipData.fromAgentId && r.toAgentId === relationshipData.toAgentId
      );
      
      if (existingRelationship) {
        return existingRelationship;
      }
      
      // Create relationship instance
      const relationship = new AgentRelationship({
        ...relationshipData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Add to relationships map
      this.relationships.set(relationship.id, relationship);
      
      // Save relationship to file
      await this._saveRelationship(relationship);
      
      // Add to memory for both agents
      await memoryManager.addMemory({
        content: `You established a relationship with ${toAgent.name} as ${relationship.type}.`,
        agentId: relationship.fromAgentId,
        tags: ['relationship'],
        keywords: [toAgent.name, relationship.type],
        metadata: { relationshipId: relationship.id }
      });
      
      await memoryManager.addMemory({
        content: `${fromAgent.name} established a relationship with you as ${relationship.type}.`,
        agentId: relationship.toAgentId,
        tags: ['relationship'],
        keywords: [fromAgent.name, relationship.type],
        metadata: { relationshipId: relationship.id }
      });
      
      console.log(`Relationship created between ${fromAgent.name} and ${toAgent.name}`);
      return relationship;
    } catch (error) {
      console.error('Failed to create relationship:', error);
      throw error;
    }
  }

  /**
   * Get a relationship by ID
   * @param {string} id - Relationship ID
   * @returns {AgentRelationship|null} Relationship instance or null if not found
   */
  async getRelationship(id) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      return this.relationships.get(id) || null;
    } catch (error) {
      console.error(`Failed to get relationship with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get relationship between two agents
   * @param {string} fromAgentId - From agent ID
   * @param {string} toAgentId - To agent ID
   * @returns {Promise<AgentRelationship|null>} Relationship instance or null if not found
   */
  async getRelationshipBetweenAgents(fromAgentId, toAgentId) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      return Array.from(this.relationships.values()).find(
        r => r.fromAgentId === fromAgentId && r.toAgentId === toAgentId
      ) || null;
    } catch (error) {
      console.error(`Failed to get relationship between agents ${fromAgentId} and ${toAgentId}:`, error);
      throw error;
    }
  }

  /**
   * Update a relationship
   * @param {string} id - Relationship ID
   * @param {Object} updates - Updates to apply to the relationship
   * @returns {Promise<AgentRelationship|null>} Updated relationship or null if not found
   */
  async updateRelationship(id, updates) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Find relationship
      const relationship = this.relationships.get(id);
      if (!relationship) {
        console.log(`Relationship with ID ${id} not found`);
        return null;
      }
      
      // Apply updates
      if (updates.type !== undefined) relationship.type = updates.type;
      if (updates.sentiment !== undefined) relationship.sentiment = updates.sentiment;
      if (updates.trust !== undefined) relationship.trust = updates.trust;
      if (updates.history !== undefined) relationship.history = updates.history;
      if (updates.metadata !== undefined) {
        relationship.metadata = { ...relationship.metadata, ...updates.metadata };
      }
      
      // Update timestamp
      relationship.updatedAt = new Date();
      
      // Save relationship to file
      await this._saveRelationship(relationship);
      
      console.log(`Relationship updated: ${relationship.id}`);
      return relationship;
    } catch (error) {
      console.error(`Failed to update relationship ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get all relationships for an agent
   * @param {string} agentId - Agent ID
   * @returns {Promise<AgentRelationship[]>} Array of relationships
   */
  async getAgentRelationships(agentId) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      return Array.from(this.relationships.values()).filter(
        r => r.fromAgentId === agentId || r.toAgentId === agentId
      );
    } catch (error) {
      console.error(`Failed to get relationships for agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Update agent's emotional state
   * @param {string} agentId - Agent ID
   * @param {string} emotion - New emotion
   * @param {number} intensity - Emotion intensity (0-100)
   * @param {string} reason - Reason for the emotion
   * @returns {Promise<Agent|null>} Updated agent or null if not found
   */
  async updateAgentEmotion(agentId, emotion, intensity, reason) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Find agent
      const agent = this.agents.get(agentId);
      if (!agent) {
        console.log(`Agent with ID ${agentId} not found`);
        return null;
      }
      
      // Update emotional state
      agent.emotions.update(emotion, intensity, reason);
      
      // Update mood in state based on emotion
      if (intensity > 60) {
        switch (emotion) {
          case EmotionType.HAPPY:
          case EmotionType.EXCITED:
          case EmotionType.CONTENT:
            agent.state.mood = 'happy';
            break;
          case EmotionType.SAD:
          case EmotionType.ANXIOUS:
            agent.state.mood = 'sad';
            break;
          case EmotionType.ANGRY:
          case EmotionType.DISGUSTED:
            agent.state.mood = 'angry';
            break;
          case EmotionType.AFRAID:
            agent.state.mood = 'afraid';
            break;
          case EmotionType.SURPRISED:
            agent.state.mood = 'surprised';
            break;
          case EmotionType.BORED:
          case EmotionType.CONFUSED:
          case EmotionType.NEUTRAL:
            agent.state.mood = 'neutral';
            break;
          default:
            agent.state.mood = 'neutral';
        }
      }
      
      // Update energy based on emotion and intensity
      if (emotion === EmotionType.EXCITED || emotion === EmotionType.ANGRY) {
        agent.state.energy = Math.min(100, agent.state.energy + Math.floor(intensity / 10));
      } else if (emotion === EmotionType.BORED || emotion === EmotionType.SAD) {
        agent.state.energy = Math.max(0, agent.state.energy - Math.floor(intensity / 10));
      }
      
      // Update timestamp
      agent.updatedAt = new Date();
      
      // Save agent to file
      await this._saveAgent(agent);
      
      // Add to context
      await contextManager.addContextMessage({
        content: `${agent.name}'s emotional state changed to ${agent.emotions.getDescription()} because: ${reason}`,
        role: 'system',
        metadata: { source: 'AgentManager', emotion }
      });
      
      // Add to memory
      await memoryManager.addMemory({
        content: `You felt ${agent.emotions.getDescription()} because: ${reason}`,
        agentId: agentId,
        tags: ['emotion', emotion],
        keywords: [emotion, 'feeling', 'mood'],
        metadata: { intensity, reason }
      });
      
      // Emit state changed event
      this._emitEvent(AgentEventType.AGENT_STATE_CHANGED, {
        agentId,
        emotion,
        intensity,
        reason,
        newState: agent.state
      });
      
      console.log(`Updated ${agent.name}'s emotion to ${emotion} (${intensity}): ${reason}`);
      return agent;
    } catch (error) {
      console.error(`Failed to update agent emotion for ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Save a relationship to file
   * @param {AgentRelationship} relationship - Relationship to save
   * @private
   */
  async _saveRelationship(relationship) {
    try {
      const filePath = path.join(this.relationshipsPath, `${relationship.id}.json`);
      await fs.writeFile(filePath, JSON.stringify(relationship.toJSON(), null, 2));
    } catch (error) {
      console.error(`Failed to save relationship ${relationship.id}:`, error);
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
   * Cleans up the AgentManager instance
   */
  cleanup() {
    // Clean up agents
    this.agents.clear();
    this.agentsPath = null;

    // Clean up event listeners
    this.removeEventListener('all', () => {});
    
    // Reset initialized flag
    this.initialized = false;
    return true;
  }
}

// Create and export a singleton instance
const agentManager = new AgentManager();
export default agentManager;

// Also export the classes for direct use
export { Agent, AgentMessage };

