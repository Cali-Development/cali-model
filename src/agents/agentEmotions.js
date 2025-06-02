import { EmotionType } from './agentManager.js';

/**
 * Class representing an agent's emotional state
 */
export class EmotionalState {
    /**
     * Create an emotional state
     * @param {Object} params - Emotional state parameters
     */
    constructor({
      primaryEmotion = EmotionType.NEUTRAL,
      secondaryEmotion = null,
      intensity = 50, // 0-100 scale
      reason = null,
      timestamp = new Date(),
      duration = 3600000, // 1 hour in milliseconds
      history = []
    }) {
      this.primaryEmotion = primaryEmotion;
      this.secondaryEmotion = secondaryEmotion;
      this.intensity = intensity;
      this.reason = reason;
      this.timestamp = timestamp;
      this.duration = duration;
      this.history = history;
    }
  
    /**
     * Convert emotional state to JSON
     * @returns {Object} JSON representation of emotional state
     */
    toJSON() {
      return {
        primaryEmotion: this.primaryEmotion,
        secondaryEmotion: this.secondaryEmotion,
        intensity: this.intensity,
        reason: this.reason,
        timestamp: this.timestamp instanceof Date && !isNaN(this.timestamp) 
          ? this.timestamp.toISOString() 
          : new Date().toISOString(),
        duration: this.duration,
        history: this.history.map(item => ({
          ...item,
          timestamp: item.timestamp instanceof Date && !isNaN(item.timestamp)
            ? item.timestamp.toISOString()
            : new Date().toISOString()
        }))
      };
    }
  
    /**
     * Create emotional state from JSON
     * @param {Object} json - JSON representation of emotional state
     * @returns {EmotionalState} Emotional state instance
     */
    static fromJSON(json) {
      return new EmotionalState({
        primaryEmotion: json.primaryEmotion || EmotionType.NEUTRAL,
        secondaryEmotion: json.secondaryEmotion,
        intensity: json.intensity || 50,
        reason: json.reason,
        timestamp: new Date(json.timestamp),
        duration: json.duration || 3600000,
        history: (json.history || []).map(item => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }))
      });
    }
  
    /**
     * Update the emotional state
     * @param {string} emotion - New primary emotion
     * @param {number} intensity - New intensity
     * @param {string} reason - Reason for the change
     */
    update(emotion, intensity, reason) {
      // Store current state in history
      this.history.push({
        primaryEmotion: this.primaryEmotion,
        secondaryEmotion: this.secondaryEmotion,
        intensity: this.intensity,
        reason: this.reason,
        timestamp: this.timestamp,
        duration: this.duration
      });
      
      // Limit history size
      if (this.history.length > 10) {
        this.history.shift();
      }
      
      // Update current state
      this.secondaryEmotion = this.primaryEmotion;
      this.primaryEmotion = emotion;
      this.intensity = Math.max(0, Math.min(100, intensity));
      this.reason = reason;
      this.timestamp = new Date();
    }
  
    /**
     * Check if the emotional state is expired
     * @returns {boolean} Whether the emotional state is expired
     */
    isExpired() {
      const now = new Date();
      return (now - this.timestamp) > this.duration;
    }
  
    /**
     * Get emotional state description
     * @returns {string} Description of the emotional state
     */
    getDescription() {
      let intensityDesc = '';
      
      if (this.intensity > 80) intensityDesc = 'extremely';
      else if (this.intensity > 60) intensityDesc = 'very';
      else if (this.intensity > 40) intensityDesc = 'moderately';
      else if (this.intensity > 20) intensityDesc = 'slightly';
      else intensityDesc = 'barely';
      
      return `${intensityDesc} ${this.primaryEmotion}${this.secondaryEmotion ? ' with undertones of ' + this.secondaryEmotion : ''}`;
    }
  }