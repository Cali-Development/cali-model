/**
 * Time Manager Tests
 * 
 * Tests for core Time Manager functionality:
 * - Real-time tracking
 * - In-universe time management
 * - Time scaling
 * - Time-based events
 * - Time synchronization
 * - Time format handling
 */

import { jest } from '@jest/globals';
import timeManager from '../../src/time/timeManager.js';
import { format, addSeconds, addHours, addDays, differenceInSeconds } from 'date-fns';

// Mock date-fns
jest.mock('date-fns', () => {
  const actual = jest.requireActual('date-fns');
  return {
    ...actual,
    format: jest.fn().mockImplementation(actual.format),
    addSeconds: jest.fn().mockImplementation(actual.addSeconds),
    addHours: jest.fn().mockImplementation(actual.addHours),
    addDays: jest.fn().mockImplementation(actual.addDays),
    differenceInSeconds: jest.fn().mockImplementation(actual.differenceInSeconds),
  };
});

// Mock system time
const mockNow = new Date('2025-01-01T12:00:00Z').getTime();
global.Date.now = jest.fn().mockReturnValue(mockNow);

// Mock Context Manager
jest.mock('../../src/context/contextManager.js', () => ({
  addMessage: jest.fn().mockResolvedValue(true),
  initialize: jest.fn().mockResolvedValue(true),
  cleanup: jest.fn().mockResolvedValue(true),
}));

// Mock Scenario Manager
jest.mock('../../src/scenario/scenarioManager.js', () => ({
  updateWorldState: jest.fn().mockResolvedValue(true),
  getCurrentScenario: jest.fn().mockReturnValue({
    worldState: {
      time: '2025-01-01T12:00:00Z',
    }
  }),
  initialize: jest.fn().mockResolvedValue(true),
  cleanup: jest.fn().mockResolvedValue(true),
}));

// Mock event emitter
jest.mock('events', () => {
  return {
    EventEmitter: jest.fn().mockImplementation(() => ({
      emit: jest.fn(),
      on: jest.fn(),
      once: jest.fn(),
      removeListener: jest.fn(),
      removeAllListeners: jest.fn(),
    })),
  };
});

// Mock setInterval and clearInterval
global.setInterval = jest.fn().mockReturnValue(123);
global.clearInterval = jest.fn();

describe('Time Manager', () => {
  // Setup and teardown
  beforeEach(async () => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Initialize time manager with test config
    const testConfig = {
      realTimeUpdateInterval: 60000, // 1 minute in ms
      timeScale: 1.0, // 1.0 = real-time
      initialDate: '2025-01-01T12:00:00Z',
      dateFormat: 'yyyy-MM-dd HH:mm:ss'
    };
    
    await timeManager.initialize(testConfig);
  });
  
  afterEach(async () => {
    // Cleanup after each test
    await timeManager.cleanup();
  });
  
  // Tests
  
  test('should initialize successfully', () => {
    expect(timeManager).toBeDefined();
    expect(timeManager.initialize).toBeDefined();
    expect(timeManager.getRealTime).toBeDefined();
    expect(timeManager.getInUniverseTime).toBeDefined();
    expect(timeManager.setTimeScale).toBeDefined();
    expect(timeManager.fastForward).toBeDefined();
    expect(timeManager.getEventEmitter).toBeDefined();
    
    // Verify interval was set
    expect(global.setInterval).toHaveBeenCalledWith(
      expect.any(Function),
      60000 // realTimeUpdateInterval
    );
  });
  
  test('should return current real-world time', () => {
    const realTime = timeManager.getRealTime();
    expect(realTime).toBeDefined();
    
    // Should be close to our mocked Date.now()
    const realTimeMs = new Date(realTime).getTime();
    expect(realTimeMs).toBe(mockNow);
  });
  
  test('should return current in-universe time', () => {
    const inUniverseTime = timeManager.getInUniverseTime();
    expect(inUniverseTime).toBeDefined();
    
    // With scale 1.0, should match real time at initialization
    const inUniverseTimeObj = new Date(inUniverseTime);
    const initialTimeObj = new Date('2025-01-01T12:00:00Z');
    expect(inUniverseTimeObj.toISOString()).toBe(initialTimeObj.toISOString());
  });
  
  test('should format times according to config', () => {
    const inUniverseTime = timeManager.getInUniverseTime();
    const formattedTime = timeManager.formatTime(inUniverseTime);
    
    expect(formattedTime).toBe('2025-01-01 12:00:00');
    expect(format).toHaveBeenCalledWith(
      expect.any(Date),
      'yyyy-MM-dd HH:mm:ss'
    );
  });
  
  test('should update time scale', () => {
    // Set time scale to 2.0 (twice as fast)
    timeManager.setTimeScale(2.0);
    
    // Simulate time passage - advance real time by 1 hour
    const nextRealTime = new Date('2025-01-01T13:00:00Z').getTime();
    global.Date.now.mockReturnValueOnce(nextRealTime);
    
    // In-universe time should advance by 2 hours
    const inUniverseTime = timeManager.getInUniverseTime();
    const expectedTime = new Date('2025-01-01T14:00:00Z').toISOString();
    
    expect(inUniverseTime).toBe(expectedTime);
    
    // Verify event was emitted for time scale change
    const eventEmitter = timeManager.getEventEmitter();
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'timeScaleChanged',
      expect.objectContaining({ scale: 2.0 })
    );
  });
  
  test('should emit hourly time update events', () => {
    const eventEmitter = timeManager.getEventEmitter();
    
    // Mock implementation of internal time update function
    const updateFunction = global.setInterval.mock.calls[0][0];
    
    // Current hour is 12
    expect(timeManager.getCurrentHour()).toBe(12);
    
    // Simulate time passing to next hour (13:00)
    const nextRealTime = new Date('2025-01-01T13:00:00Z').getTime();
    global.Date.now.mockReturnValueOnce(nextRealTime);
    
    // Call the update function manually
    updateFunction();
    
    // Verify hour changed event was emitted
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'hourChanged',
      expect.objectContaining({ 
        hour: 13,
        time: expect.stringContaining('2025-01-01')
      })
    );
  });
  
  test('should emit daily time update events', () => {
    const eventEmitter = timeManager.getEventEmitter();
    
    // Mock implementation of internal time update function
    const updateFunction = global.setInterval.mock.calls[0][0];
    
    // Current day is 1
    expect(timeManager.getCurrentDay()).toBe(1);
    
    // Simulate time passing to next day (Jan 2nd)
    const nextRealTime = new Date('2025-01-02T12:00:00Z').getTime();
    global.Date.now.mockReturnValueOnce(nextRealTime);
    
    // Call the update function manually
    updateFunction();
    
    // Verify day changed event was emitted
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'dayChanged',
      expect.objectContaining({ 
        day: 2,
        time: expect.stringContaining('2025-01-02')
      })
    );
  });
  
  test('should fast forward time', async () => {
    // Initial time is 2025-01-01T12:00:00Z
    const initialTime = timeManager.getInUniverseTime();
    expect(initialTime).toBe('2025-01-01T12:00:00.000Z');
    
    // Fast forward 24 hours
    await timeManager.fastForward({ hours: 24 });
    
    // New time should be 2025-01-02T12:00:00Z
    const newTime = timeManager.getInUniverseTime();
    expect(newTime).toBe('2025-01-02T12:00:00.000Z');
    
    // Scenario manager should be updated with new time
    const scenarioManager = require('../../src/scenario/scenarioManager.js');
    expect(scenarioManager.updateWorldState).toHaveBeenCalledWith(
      expect.objectContaining({
        time: '2025-01-02T12:00:00.000Z'
      })
    );
    
    // Verify time jump event was emitted
    const eventEmitter = timeManager.getEventEmitter();
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'timeJump',
      expect.objectContaining({ 
        from: '2025-01-01T12:00:00.000Z',
        to: '2025-01-02T12:00:00.000Z'
      })
    );
  });
  
  test('should synchronize with scenario time', async () => {
    // Mock scenario time different from current time
    const scenarioManager = require('../../src/scenario/scenarioManager.js');
    scenarioManager.getCurrentScenario.mockReturnValueOnce({
      worldState: {
        time: '2025-02-15T08:30:00Z',
      }
    });
    
    // Synchronize with scenario
    await timeManager.syncWithScenario();
    
    // Time should be updated to match scenario
    const newTime = timeManager.getInUniverseTime();
    expect(newTime).toBe('2025-02-15T08:30:00.000Z');
    
    // Verify time sync event was emitted
    const eventEmitter = timeManager.getEventEmitter();
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'timeSynced',
      expect.objectContaining({ 
        time: '2025-02-15T08:30:00.000Z'
      })
    );
  });
  
  test('should calculate time difference', () => {
    // Initial time is 2025-01-01T12:00:00Z
    const startTime = new Date('2025-01-01T12:00:00Z');
    const endTime = new Date('2025-01-01T14:30:00Z');
    
    const difference = timeManager.getTimeDifference(startTime, endTime);
    
    expect(difference).toEqual({
      hours: 2,
      minutes: 30,
      seconds: 0
    });
  });
  
  test('should handle time of day events', async () => {
    const eventEmitter = timeManager.getEventEmitter();
    
    // Register a time of day event for 12:30
    await timeManager.registerTimeOfDayEvent({
      hour: 12,
      minute: 30,
      name: 'Lunch time',
      recurring: true
    });
    
    // Simulate time passing to 12:30
    const lunchTime = new Date('2025-01-01T12:30:00Z').getTime();
    global.Date.now.mockReturnValueOnce(lunchTime);
    
    // Call the update function manually
    const updateFunction = global.setInterval.mock.calls[0][0];
    updateFunction();
    
    // Verify time of day event was emitted
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'timeOfDayEvent',
      expect.objectContaining({ 
        name: 'Lunch time',
        time: expect.stringContaining('12:30')
      })
    );
  });
  
  test('should calculate elapsed time since a reference point', () => {
    // Set reference time as 2 hours ago
    const referenceTime = new Date('2025-01-01T10:00:00Z').toISOString();
    
    // Current time is 2025-01-01T12:00:00Z (mocked)
    const elapsed = timeManager.getElapsedTimeSince(referenceTime);
    
    expect(elapsed).toEqual({
      hours: 2,
      minutes: 0,
      seconds: 0
    });
  });
  
  test('should clean up intervals on cleanup', async () => {
    await timeManager.cleanup();
    
    // Verify interval was cleared
    expect(global.clearInterval).toHaveBeenCalledWith(123);
  });
});

