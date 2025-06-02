import { v4 as uuidv4 } from 'uuid';

// Local Modules
import { EmotionalState } from './agentEmotions.js';

/**
 * Class representing an AI agent
 */
export class Agent {
  /**
   * Create an agent
   * @param {Object} params - Agent parameters
   */
  constructor({
    id = uuidv4(),
    name,
    description,
    personality = { 
      openness: 50,       // 0-100 scale
      conscientiousness: 50,
      extraversion: 50,
      agreeableness: 50,
      neuroticism: 50
    },
    appearance,
    backstory = '',
    locationId = 'default',
    inventory = [],
    goals = [],
    traits = {},
    state = { mood: 'neutral', energy: 100, busy: false },
    emotions = new EmotionalState({}),
    isActive = true,
    createdAt = new Date(),
    updatedAt = new Date(),
    metadata = {}
  }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.personality = personality;
    this.appearance = appearance;
    this.backstory = backstory;
    this.locationId = locationId;
    this.inventory = inventory;
    this.goals = goals;
    this.traits = traits;
    this.state = state;
    this.isActive = isActive;
    this.emotions = emotions;
    this.personality = personality;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.metadata = metadata;
  }

  /**
   * Convert agent to JSON
   * @returns {Object} JSON representation of agent
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      personality: this.personality,
      appearance: this.appearance,
      backstory: this.backstory,
      locationId: this.locationId,
      inventory: this.inventory,
      goals: this.goals,
      traits: this.traits,
      state: this.state,
      isActive: this.isActive,
      emotions: JSON.stringify(this.emotions),
      personality: this.personality,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      metadata: this.metadata
    };
  }

  /**
   * Create agent from JSON
   * @param {Object} json - JSON representation of agent
   * @returns {Agent} Agent instance
   */
  static fromJSON(json) {
    return new Agent({
      id: json.id,
      name: json.name,
      description: json.description,
      personality: json.personality,
      appearance: json.appearance,
      backstory: json.backstory || '',
      locationId: json.locationId || 'default',
      inventory: json.inventory || [],
      goals: json.goals || [],
      traits: json.traits || {},
      state: json.state || { mood: 'neutral', energy: 100, busy: false },
      isActive: json.isActive !== undefined ? json.isActive : true,
      emotions: json.emotions ? EmotionalState.fromJSON(json.emotions) : new EmotionalState({}),
      personality: json.personality || { 
        openness: 50,
        conscientiousness: 50,
        extraversion: 50,
        agreeableness: 50,
        neuroticism: 50
      },
      createdAt: new Date(json.createdAt),
      updatedAt: new Date(json.updatedAt),
      metadata: json.metadata || {}
    });
  }

  /**
   * Get the agent's system prompt
   * @returns {string} System prompt
   */
  getSystemPrompt() {
    return `You are ${this.name}. ${this.description}

Personality: ${Object.entries(this.personality).map(([key, value]) => `${key}: ${value}`)}
Appearance: ${this.appearance}
${this.backstory ? `Backstory: ${this.backstory}` : ''}

Your current state: ${Object.entries(this.state).map(([key, value]) => `${key}: ${value}`).join(', ')}
Your current emotion: ${this.emotions.getDescription()}
${this.inventory.length > 0 ? `You are carrying: ${this.inventory.join(', ')}` : 'You are not carrying anything.'}
${this.goals.length > 0 ? `Your current goals: ${this.goals.join(', ')}` : ''}

Personality traits:
- Openness: ${this.personality.openness}/100 (${this.personality.openness > 75 ? 'very high' : this.personality.openness > 50 ? 'high' : this.personality.openness > 25 ? 'moderate' : 'low'})
- Conscientiousness: ${this.personality.conscientiousness}/100 (${this.personality.conscientiousness > 75 ? 'very high' : this.personality.conscientiousness > 50 ? 'high' : this.personality.conscientiousness > 25 ? 'moderate' : 'low'})
- Extraversion: ${this.personality.extraversion}/100 (${this.personality.extraversion > 75 ? 'very high' : this.personality.extraversion > 50 ? 'high' : this.personality.extraversion > 25 ? 'moderate' : 'low'})
- Agreeableness: ${this.personality.agreeableness}/100 (${this.personality.agreeableness > 75 ? 'very high' : this.personality.agreeableness > 50 ? 'high' : this.personality.agreeableness > 25 ? 'moderate' : 'low'})
- Neuroticism: ${this.personality.neuroticism}/100 (${this.personality.neuroticism > 75 ? 'very high' : this.personality.neuroticism > 50 ? 'high' : this.personality.neuroticism > 25 ? 'moderate' : 'low'})

Always stay in character and respond as ${this.name} would based on your personality, emotional state, and current situation.

This could be one of your example responses to this message:
${this.metadata.example ? this.metadata.example.map((example) => `Example Conversation ${this.metadata.example.indexOf(example) + 1}:\nMessage: ${example.message}\nResponse: ${example.response}`).join('\n\n') : "No Examples. (This means the system hasn't provided example conversation data.)"}

The example conversations is completely unrelated to your current conversations with the user.
So please don't relate them to the current conversation.

Be sure to use actions according to the conversation, like when the user says "Let's go to sports field", you use the action to go to the field, accordingly.
If there are any errors with the action, be sure to tell the user. (Because, I'll be there to debug it.)`;
  }
}