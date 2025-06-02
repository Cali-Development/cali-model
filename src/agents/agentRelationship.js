import { v4 as uuidv4 } from 'uuid';

/**
 * Class representing a relationship between two agents
 */
export class AgentRelationship {
  /**
   * Create a relationship
   * @param {Object} params - Relationship parameters
   */
  constructor({
    id = uuidv4(),
    fromAgentId,
    toAgentId,
    type = RelationshipType.NEUTRAL,
    sentiment = 0, // -100 to 100 scale
    trust = 0, // -100 to 100 scale
    history = [],
    createdAt = new Date(),
    updatedAt = new Date(),
    metadata = {}
  }) {
    this.id = id;
    this.fromAgentId = fromAgentId;
    this.toAgentId = toAgentId;
    this.type = type;
    this.sentiment = sentiment;
    this.trust = trust;
    this.history = history;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.metadata = metadata;
  }

  /**
   * Convert relationship to JSON
   * @returns {Object} JSON representation of relationship
   */
  toJSON() {
    return {
      id: this.id,
      fromAgentId: this.fromAgentId,
      toAgentId: this.toAgentId,
      type: this.type,
      sentiment: this.sentiment,
      trust: this.trust,
      history: this.history,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      metadata: this.metadata
    };
  }

  /**
   * Create relationship from JSON
   * @param {Object} json - JSON representation of relationship
   * @returns {AgentRelationship} Relationship instance
   */
  static fromJSON(json) {
    return new AgentRelationship({
      id: json.id,
      fromAgentId: json.fromAgentId,
      toAgentId: json.toAgentId,
      type: json.type || RelationshipType.NEUTRAL,
      sentiment: json.sentiment || 0,
      trust: json.trust || 0,
      history: json.history || [],
      createdAt: new Date(json.createdAt),
      updatedAt: new Date(json.updatedAt),
      metadata: json.metadata || {}
    });
  }

  /**
   * Add an event to the relationship history
   * @param {string} event - Event description
   */
  addToHistory(event) {
    this.history.push({
      event,
      timestamp: new Date()
    });
    this.updatedAt = new Date();
  }

  /**
   * Update relationship sentiment
   * @param {number} delta - Change in sentiment (-100 to 100)
   */
  updateSentiment(delta) {
    this.sentiment = Math.max(-100, Math.min(100, this.sentiment + delta));
    this.updatedAt = new Date();
  }

  /**
   * Update relationship trust
   * @param {number} delta - Change in trust (-100 to 100)
   */
  updateTrust(delta) {
    this.trust = Math.max(-100, Math.min(100, this.trust + delta));
    this.updatedAt = new Date();
  }

  /**
   * Get relationship status description
   * @returns {string} Description of the relationship
   */
  getStatusDescription() {
    let description = `${this.type} with `;
    
    if (this.sentiment > 75) description += "very positive feelings";
    else if (this.sentiment > 50) description += "positive feelings";
    else if (this.sentiment > 25) description += "somewhat positive feelings";
    else if (this.sentiment > -25) description += "neutral feelings";
    else if (this.sentiment > -50) description += "somewhat negative feelings";
    else if (this.sentiment > -75) description += "negative feelings";
    else description += "very negative feelings";
    
    description += " and ";
    
    if (this.trust > 75) description += "very high trust";
    else if (this.trust > 50) description += "high trust";
    else if (this.trust > 25) description += "some trust";
    else if (this.trust > -25) description += "neutral trust";
    else if (this.trust > -50) description += "some distrust";
    else if (this.trust > -75) description += "high distrust";
    else description += "very high distrust";
    
    return description;
  }
}