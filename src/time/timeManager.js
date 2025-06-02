import { format, parseISO, add, differenceInMilliseconds } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import config from '../config.js';
import contextManager from '../context/contextManager.js';
import scenarioManager from '../scenario/scenarioManager.js';

/**
 * Event types for time changes
 */
export const TimeEventType = {
  TIME_ADVANCED: 'time_advanced',
  TIME_SCALE_CHANGED: 'time_scale_changed',
  TIME_SYNCED: 'time_synced',
  DAY_CHANGED: 'day_changed',
  HOUR_CHANGED: 'hour_changed'
};

/**
 * Class representing a time event
 */
class TimeEvent {
  /**
   * Create a time event
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
 * Class for managing time
 */
class TimeManager {
  /**
   * Create a time manager
   */
  constructor() {
    // Configuration
    this.realTimeUpdateInterval = config.time.realTimeUpdateInterval;
    this.timeScale = config.time.timeScale;
    this.dateFormat = config.time.dateFormat;
    
    // Time state
    this.lastRealUpdate = new Date();
    this.inUniverseTime = config.time.initialDate ? 
      parseISO(config.time.initialDate) : 
      new Date();
    
    // Update interval
    this.updateIntervalId = null;
    
    // Event listeners
    this.eventListeners = {};
    
    // Initialization flag
    this.initialized = false;
  }

  /**
   * Initialize the time manager
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      // Set up real-time update interval
      if (this.realTimeUpdateInterval > 0) {
        this.updateIntervalId = setInterval(() => {
          this._updateRealTime();
        }, this.realTimeUpdateInterval);
      }
      
      // Add initial system message to context
      await this._addToContext(`Time initialized. In-universe time: ${this.formatTime(this.inUniverseTime)}`);
      
      // Update world state with current time
      await this._updateWorldState();
      
      this.initialized = true;
      console.log('Time Manager initialized');
    } catch (error) {
      console.error('Failed to initialize Time Manager:', error);
      throw error;
    }
  }

  /**
   * Get the current time
   * @param {boolean} [inUniverse=true] - Whether to return in-universe time or real time
   * @param {string} [format=null] - Format to return the time in (null for Date object)
   * @returns {Date|string} Current time
   */
  getCurrentTime(inUniverse = true, format = null) {
    try {
      const time = inUniverse ? this.inUniverseTime : new Date();
      return format ? this.formatTime(time, format) : time;
    } catch (error) {
      console.error('Failed to get current time:', error);
      return inUniverse ? this.inUniverseTime : new Date();
    }
  }

  /**
   * Format a time
   * @param {Date} time - Time to format
   * @param {string} [formatStr=null] - Format string (defaults to configured format)
   * @returns {string} Formatted time
   */
  formatTime(time, formatStr = null) {
    try {
      return format(time, formatStr || this.dateFormat);
    } catch (error) {
      console.error('Failed to format time:', error);
      return time.toISOString();
    }
  }

  /**
   * Advance in-universe time
   * @param {Object} delta - Time to advance
   * @param {number} [delta.milliseconds=0] - Milliseconds to advance
   * @param {number} [delta.seconds=0] - Seconds to advance
   * @param {number} [delta.minutes=0] - Minutes to advance
   * @param {number} [delta.hours=0] - Hours to advance
   * @param {number} [delta.days=0] - Days to advance
   * @param {number} [delta.weeks=0] - Weeks to advance
   * @param {number} [delta.months=0] - Months to advance
   * @param {number} [delta.years=0] - Years to advance
   * @returns {Promise<Date>} New in-universe time
   */
  async advanceTime(delta) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Validate delta
      if (!delta || typeof delta !== 'object') {
        throw new Error('Delta must be an object');
      }
      
      // Get previous time for events
      const previousTime = new Date(this.inUniverseTime);
      
      // Add the delta to in-universe time
      this.inUniverseTime = add(this.inUniverseTime, delta);
      
      // Add to context
      await this._addToContext(`Time advanced to ${this.formatTime(this.inUniverseTime)}`);
      
      // Update world state
      await this._updateWorldState();
      
      // Check for day/hour changes
      await this._checkTimeChanges(previousTime, this.inUniverseTime);
      
      // Emit event
      this._emitEvent(TimeEventType.TIME_ADVANCED, {
        previousTime,
        currentTime: this.inUniverseTime,
        delta
      });
      
      console.log(`Time advanced to ${this.formatTime(this.inUniverseTime)}`);
      return this.inUniverseTime;
    } catch (error) {
      console.error('Failed to advance time:', error);
      throw error;
    }
  }

  /**
   * Synchronize in-universe time with real time based on time scale
   * @returns {Promise<Date>} New in-universe time
   */
  async syncWithRealTime() {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Calculate time elapsed since last update
      const now = new Date();
      const elapsedReal = differenceInMilliseconds(now, this.lastRealUpdate);
      
      // Apply time scale to get in-universe elapsed time
      const elapsedInUniverse = elapsedReal * this.timeScale;
      
      // Only update if there's a significant change
      if (elapsedInUniverse >= 1000) { // At least 1 second
        // Get previous time for events
        const previousTime = new Date(this.inUniverseTime);
        
        // Update in-universe time
        this.inUniverseTime = add(this.inUniverseTime, { milliseconds: elapsedInUniverse });
        
        // Update last real update time
        this.lastRealUpdate = now;
        
        // Add to context
        await this._addToContext(`Time synced to ${this.formatTime(this.inUniverseTime)}`);
        
        // Update world state
        await this._updateWorldState();
        
        // Check for day/hour changes
        await this._checkTimeChanges(previousTime, this.inUniverseTime);
        
        // Emit event
        this._emitEvent(TimeEventType.TIME_SYNCED, {
          previousTime,
          currentTime: this.inUniverseTime,
          elapsedReal,
          elapsedInUniverse
        });
        
        console.log(`Time synced to ${this.formatTime(this.inUniverseTime)}`);
      }
      
      return this.inUniverseTime;
    } catch (error) {
      console.error('Failed to sync time with real time:', error);
      throw error;
    }
  }

  /**
   * Set the time scale
   * @param {number} scale - New time scale (1.0 = real-time, 2.0 = twice as fast)
   * @returns {Promise<number>} New time scale
   */
  async setTimeScale(scale) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Validate scale
      if (typeof scale !== 'number' || scale <= 0) {
        throw new Error('Time scale must be a positive number');
      }
      
      // Get previous scale for events
      const previousScale = this.timeScale;
      
      // Update time scale
      this.timeScale = scale;
      
      // Add to context
      await this._addToContext(`Time scale changed to ${scale}x`);
      
      // Emit event
      this._emitEvent(TimeEventType.TIME_SCALE_CHANGED, {
        previousScale,
        currentScale: scale
      });
      
      console.log(`Time scale changed to ${scale}x`);
      return this.timeScale;
    } catch (error) {
      console.error('Failed to set time scale:', error);
      throw error;
    }
  }

  /**
   * Set the in-universe time directly
   * @param {Date|string} time - New in-universe time
   * @returns {Promise<Date>} New in-universe time
   */
  async setInUniverseTime(time) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // Parse the time if it's a string
      const newTime = typeof time === 'string' ? parseISO(time) : time;
      
      // Validate time
      if (!(newTime instanceof Date) || isNaN(newTime.getTime())) {
        throw new Error('Invalid time provided');
      }
      
      // Get previous time for events
      const previousTime = new Date(this.inUniverseTime);
      
      // Update in-universe time
      this.inUniverseTime = newTime;
      
      // Add to context
      await this._addToContext(`Time set to ${this.formatTime(this.inUniverseTime)}`);
      
      // Update world state
      await this._updateWorldState();
      
      // Check for day/hour changes
      await this._checkTimeChanges(previousTime, this.inUniverseTime);
      
      // Emit event
      this._emitEvent(TimeEventType.TIME_ADVANCED, {
        previousTime,
        currentTime: this.inUniverseTime,
        delta: 'manual_set'
      });
      
      console.log(`Time set to ${this.formatTime(this.inUniverseTime)}`);
      return this.inUniverseTime;
    } catch (error) {
      console.error('Failed to set in-universe time:', error);
      throw error;
    }
  }

  /**
   * Get time details
   * @returns {Object} Time details
   */
  getTimeDetails() {
    const inUniverseTime = this.inUniverseTime;
    const realTime = new Date();
    
    return {
      inUniverse: {
        time: inUniverseTime,
        formatted: this.formatTime(inUniverseTime),
        year: inUniverseTime.getFullYear(),
        month: inUniverseTime.getMonth() + 1,
        day: inUniverseTime.getDate(),
        hour: inUniverseTime.getHours(),
        minute: inUniverseTime.getMinutes(),
        second: inUniverseTime.getSeconds(),
        dayOfWeek: inUniverseTime.getDay(),
        dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][inUniverseTime.getDay()],
        monthName: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][inUniverseTime.getMonth()],
        timeOfDay: this._getTimeOfDay(inUniverseTime)
      },
      real: {
        time: realTime,
        formatted: this.formatTime(realTime)
      },
      timeScale: this.timeScale,
      timeDifference: differenceInMilliseconds(inUniverseTime, realTime)
    };
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
   * Clean up resources
   */
  cleanup() {
    if (this.updateIntervalId) {
      clearInterval(this.updateIntervalId);
      this.updateIntervalId = null;
    }
  }

  /**
   * Update real time and apply time scale to in-universe time
   * @private
   */
  async _updateRealTime() {
    // If we're using time scale, sync with real time
    if (this.timeScale !== 0) {
      await this.syncWithRealTime();
    }
  }

  /**
   * Check for day or hour changes
   * @param {Date} previousTime - Previous time
   * @param {Date} currentTime - Current time
   * @private
   */
  async _checkTimeChanges(previousTime, currentTime) {
    // Check for day change
    if (previousTime.getDate() !== currentTime.getDate() || 
        previousTime.getMonth() !== currentTime.getMonth() || 
        previousTime.getFullYear() !== currentTime.getFullYear()) {
      
      // Emit day changed event
      this._emitEvent(TimeEventType.DAY_CHANGED, {
        previousTime,
        currentTime,
        previousDay: previousTime.getDate(),
        currentDay: currentTime.getDate()
      });
      
      // Add to context
      await this._addToContext(`Day changed to ${this.formatTime(currentTime, 'MMMM d, yyyy')}`);
    }
    
    // Check for hour change
    if (previousTime.getHours() !== currentTime.getHours()) {
      // Get time of day
      const timeOfDay = this._getTimeOfDay(currentTime);
      
      // Emit hour changed event
      this._emitEvent(TimeEventType.HOUR_CHANGED, {
        previousTime,
        currentTime,
        previousHour: previousTime.getHours(),
        currentHour: currentTime.getHours(),
        timeOfDay
      });
      
      // Add to context
      await this._addToContext(`Hour changed to ${currentTime.getHours()}:00 (${timeOfDay})`);
    }
  }

  /**
   * Get the time of day description
   * @param {Date} time - Time to check
   * @returns {string} Time of day description
   * @private
   */
  _getTimeOfDay(time) {
    const hour = time.getHours();
    
    if (hour >= 5 && hour < 8) return 'early morning';
    if (hour >= 8 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 13) return 'noon';
    if (hour >= 13 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 20) return 'evening';
    if (hour >= 20 && hour < 23) return 'night';
    return 'late night';
  }

  /**
   * Update world state with current time
   * @private
   */
  async _updateWorldState() {
    try {
      // Get time details
      const timeDetails = this.getTimeDetails();
      
      // Update scenario world state with time
      await scenarioManager.updateWorldState({
        currentTime: this.formatTime(this.inUniverseTime),
        timeOfDay: timeDetails.inUniverse.timeOfDay
      });
    } catch (error) {
      console.error('Failed to update world state with time:', error);
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
        metadata: { source: 'TimeManager' }
      });
    } catch (error) {
      console.error('Failed to add to context:', error);
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
    const event = new TimeEvent(type, data);
    
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
}

// Create and export a singleton instance
const timeManager = new TimeManager();
export default timeManager;

// Also export the classes for direct use
export { TimeEvent };

