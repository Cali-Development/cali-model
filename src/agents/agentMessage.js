import { v4 as uuidv4 } from 'uuid';

/**
 * Class representing a message between agents
 */
export class AgentMessage {
  /**
   * Create an agent message
   * @param {Object} params - Message parameters
   */
  constructor({
    id = uuidv4(),
    content,
    fromAgentId,
    toAgentId,
    type = 'message',
    timestamp = new Date(),
    metadata = {}
  }) {
    this.id = id;
    this.content = content;
    this.fromAgentId = fromAgentId;
    this.toAgentId = toAgentId;
    this.type = type;
    this.timestamp = timestamp;
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
      fromAgentId: this.fromAgentId,
      toAgentId: this.toAgentId,
      type: this.type,
      timestamp: this.timestamp.toISOString(),
      metadata: this.metadata
    };
  }

  /**
   * Create message from JSON
   * @param {Object} json - JSON representation of message
   * @returns {AgentMessage} Message instance
   */
  static fromJSON(json) {
    return new AgentMessage({
      id: json.id,
      content: json.content,
      fromAgentId: json.fromAgentId,
      toAgentId: json.toAgentId,
      type: json.type || 'message',
      timestamp: new Date(json.timestamp),
      metadata: json.metadata || {}
    });
  }
}