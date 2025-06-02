/**
 * Scenario Manager Tests
 * 
 * Tests for core Scenario Manager functionality:
 * - Loading scenarios
 * - Updating world state
 * - Managing plots
 * - Event emission
 * - Scenario persistence
 * - Plot point management
 */

import { jest } from '@jest/globals';
import scenarioManager from '../../src/scenario/scenarioManager.js';

// Mock file system operations
jest.mock('fs/promises', () => ({
  readFile: jest.fn().mockImplementation((path) => {
    if (path.includes('default.json')) {
      return Promise.resolve(JSON.stringify({
        name: 'Default Scenario',
        description: 'A test scenario',
        worldState: {
          time: '2025-01-01T12:00:00Z',
          location: 'Test City',
          weather: 'sunny',
          events: ['festival']
        },
        plots: [
          {
            id: 'plot-1',
            title: 'Main Quest',
            description: 'The primary storyline',
            status: 'active',
            plotPoints: [
              {
                id: 'pp-1',
                description: 'Starting point',
                completed: true
              },
              {
                id: 'pp-2',
                description: 'Middle challenge',
                completed: false,
                prerequisites: ['pp-1']
              }
            ]
          }
        ]
      }));
    } else if (path.includes('alternate.json')) {
      return Promise.resolve(JSON.stringify({
        name: 'Alternate Scenario',
        description: 'An alternate test scenario',
        worldState: {
          time: '2025-02-15T15:30:00Z',
          location: 'Another City',
          weather: 'rainy',
          events: ['concert']
        },
        plots: []
      }));
    } else if (path.includes('invalid.json')) {
      return Promise.resolve('{ invalid json }');
    } else {
      return Promise.reject(new Error('File not found'));
    }
  }),
  writeFile: jest.fn().mockResolvedValue(undefined),
  mkdir: jest.fn().mockResolvedValue(undefined),
  access: jest.fn().mockImplementation((path) => {
    if (path.includes('missing')) {
      return Promise.reject(new Error('File not found'));
    }
    return Promise.resolve();
  })
}));

// Mock the Context Manager
jest.mock('../../src/context/contextManager.js', () => ({
  addMessage: jest.fn().mockResolvedValue(true),
  getContext: jest.fn().mockResolvedValue({
    messages: [
      {
        content: 'What is happening in the city?',
        role: 'user',
        userId: 'user-123',
        timestamp: new Date().toISOString()
      },
      {
        content: 'There\'s a festival happening in Test City today.',
        role: 'assistant',
        agentId: 'agent-123',
        timestamp: new Date().toISOString()
      }
    ],
    summary: 'User asked about city events. Agent mentioned festival.'
  }),
  initialize: jest.fn().mockResolvedValue(true),
  cleanup: jest.fn().mockResolvedValue(true),
}));

// Mock the Memory Manager
jest.mock('../../src/memory/memoryManager.js', () => ({
  addMemory: jest.fn().mockResolvedValue('mem-123456'),
  getRelevantMemories: jest.fn().mockResolvedValue([
    {
      id: 'mem-789012',
      content: 'There is a festival in Test City on January 1st, 2025',
      agentId: 'agent-123',
      timestamp: new Date().toISOString(),
      importance: 0.8,
      source: 'scenario',
      keywords: ['festival', 'Test City', 'January', '2025'],
      metadata: { type: 'event' },
      relevance: 0.9
    }
  ]),
  initialize: jest.fn().mockResolvedValue(true),
  cleanup: jest.fn().mockResolvedValue(true),
}));

// Mock the event emitter
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

describe('Scenario Manager', () => {
  // Setup and teardown
  beforeEach(async () => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Initialize scenario manager with test config
    const testConfig = {
      scenariosPath: '/test/scenarios',
      defaultScenario: 'default.json'
    };
    
    await scenarioManager.initialize(testConfig);
  });
  
  afterEach(async () => {
    // Cleanup after each test
    await scenarioManager.cleanup();
  });
  
  // Tests
  
  test('should initialize successfully and load default scenario', async () => {
    // Verify the scenario manager is defined with expected methods
    expect(scenarioManager).toBeDefined();
    expect(scenarioManager.initialize).toBeDefined();
    expect(scenarioManager.loadScenario).toBeDefined();
    expect(scenarioManager.saveScenario).toBeDefined();
    expect(scenarioManager.updateWorldState).toBeDefined();
    expect(scenarioManager.addPlot).toBeDefined();
    expect(scenarioManager.updatePlot).toBeDefined();
    
    // Verify the default scenario was loaded
    const currentScenario = scenarioManager.getCurrentScenario();
    expect(currentScenario).toBeDefined();
    expect(currentScenario.name).toBe('Default Scenario');
    expect(currentScenario.worldState.location).toBe('Test City');
    expect(currentScenario.plots).toHaveLength(1);
  });
  
  test('should load a specific scenario', async () => {
    // Load an alternate scenario
    await scenarioManager.loadScenario('alternate.json');
    
    // Verify the scenario was loaded
    const currentScenario = scenarioManager.getCurrentScenario();
    expect(currentScenario).toBeDefined();
    expect(currentScenario.name).toBe('Alternate Scenario');
    expect(currentScenario.worldState.location).toBe('Another City');
    expect(currentScenario.worldState.weather).toBe('rainy');
    expect(currentScenario.plots).toHaveLength(0);
    
    // Verify the file was read
    const fs = require('fs/promises');
    expect(fs.readFile).toHaveBeenCalledWith(expect.stringContaining('alternate.json'), 'utf8');
  });
  
  test('should handle errors when loading invalid scenarios', async () => {
    // Attempt to load an invalid scenario
    await expect(scenarioManager.loadScenario('invalid.json'))
      .rejects.toThrow();
    
    // Verify current scenario remains unchanged (still the default)
    const currentScenario = scenarioManager.getCurrentScenario();
    expect(currentScenario.name).toBe('Default Scenario');
  });
  
  test('should update world state', async () => {
    // Update specific properties of the world state
    await scenarioManager.updateWorldState({
      weather: 'stormy',
      events: ['festival', 'market']
    });
    
    // Verify the world state was updated
    const currentScenario = scenarioManager.getCurrentScenario();
    expect(currentScenario.worldState.weather).toBe('stormy');
    expect(currentScenario.worldState.events).toContain('market');
    expect(currentScenario.worldState.location).toBe('Test City'); // Unchanged
    
    // Verify event was emitted
    const eventEmitter = scenarioManager.getEventEmitter();
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'worldStateUpdated',
      expect.objectContaining({
        weather: 'stormy',
        events: expect.arrayContaining(['festival', 'market'])
      })
    );
  });
  
  test('should add a new plot', async () => {
    // Create a new plot
    const newPlot = {
      title: 'Side Quest',
      description: 'An optional side story',
      status: 'inactive',
      plotPoints: [
        {
          description: 'Find the treasure map',
          completed: false
        }
      ]
    };
    
    // Add the plot
    const plotId = await scenarioManager.addPlot(newPlot);
    
    // Verify the plot was added with an ID
    expect(plotId).toBeDefined();
    
    const currentScenario = scenarioManager.getCurrentScenario();
    expect(currentScenario.plots).toHaveLength(2); // Default + new plot
    
    const addedPlot = currentScenario.plots.find(p => p.id === plotId);
    expect(addedPlot).toBeDefined();
    expect(addedPlot.title).toBe('Side Quest');
    expect(addedPlot.plotPoints).toHaveLength(1);
    
    // Verify event was emitted
    const eventEmitter = scenarioManager.getEventEmitter();
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'plotAdded',
      expect.objectContaining({
        id: plotId,
        title: 'Side Quest'
      })
    );
  });
  
  test('should update an existing plot', async () => {
    // Update the existing plot from the default scenario
    const plotId = 'plot-1';
    const updates = {
      title: 'Updated Main Quest',
      status: 'completed'
    };
    
    await scenarioManager.updatePlot(plotId, updates);
    
    // Verify the plot was updated
    const currentScenario = scenarioManager.getCurrentScenario();
    const updatedPlot = currentScenario.plots.find(p => p.id === plotId);
    
    expect(updatedPlot).toBeDefined();
    expect(updatedPlot.title).toBe('Updated Main Quest');
    expect(updatedPlot.status).toBe('completed');
    expect(updatedPlot.description).toBe('The primary storyline'); // Unchanged
    
    // Verify event was emitted
    const eventEmitter = scenarioManager.getEventEmitter();
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'plotUpdated',
      expect.objectContaining({
        id: plotId,
        title: 'Updated Main Quest',
        status: 'completed'
      })
    );
  });
  
  test('should add a plot point to an existing plot', async () => {
    const plotId = 'plot-1';
    const newPlotPoint = {
      description: 'Final challenge',
      completed: false,
      prerequisites: ['pp-2']
    };
    
    const plotPointId = await scenarioManager.addPlotPoint(plotId, newPlotPoint);
    
    // Verify the plot point was added
    expect(plotPointId).toBeDefined();
    
    const currentScenario = scenarioManager.getCurrentScenario();
    const plot = currentScenario.plots.find(p => p.id === plotId);
    
    expect(plot.plotPoints).toHaveLength(3); // 2 existing + 1 new
    
    const addedPlotPoint = plot.plotPoints.find(pp => pp.id === plotPointId);
    expect(addedPlotPoint).toBeDefined();
    expect(addedPlotPoint.description).toBe('Final challenge');
    expect(addedPlotPoint.prerequisites).toContain('pp-2');
    
    // Verify event was emitted
    const eventEmitter = scenarioManager.getEventEmitter();
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'plotPointAdded',
      expect.objectContaining({
        plotId,
        plotPointId,
        description: 'Final challenge'
      })
    );
  });
  
  test('should update a plot point', async () => {
    const plotId = 'plot-1';
    const plotPointId = 'pp-2';
    const updates = {
      description: 'Updated middle challenge',
      completed: true
    };
    
    await scenarioManager.updatePlotPoint(plotId, plotPointId, updates);
    
    // Verify the plot point was updated
    const currentScenario = scenarioManager.getCurrentScenario();
    const plot = currentScenario.plots.find(p => p.id === plotId);
    const updatedPlotPoint = plot.plotPoints.find(pp => pp.id === plotPointId);
    
    expect(updatedPlotPoint).toBeDefined();
    expect(updatedPlotPoint.description).toBe('Updated middle challenge');
    expect(updatedPlotPoint.completed).toBe(true);
    expect(updatedPlotPoint.prerequisites).toContain('pp-1'); // Unchanged
    
    // Verify event was emitted
    const eventEmitter = scenarioManager.getEventEmitter();
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'plotPointUpdated',
      expect.objectContaining({
        plotId,
        plotPointId,
        description: 'Updated middle challenge',
        completed: true
      })
    );
  });
  
  test('should save the current scenario', async () => {
    // Make some changes to the scenario
    await scenarioManager.updateWorldState({ weather: 'foggy' });
    
    // Save the scenario
    await scenarioManager.saveScenario();
    
    // Verify the file was written
    const fs = require('fs/promises');
    expect(fs.writeFile).toHaveBeenCalled();
    
    // Verify the saved content includes our changes
    const savedContent = JSON.parse(fs.writeFile.mock.calls[0][1]);
    expect(savedContent.worldState.weather).toBe('foggy');
  });
  
  test('should handle saving to a new file', async () => {
    // Save to a specific file
    await scenarioManager.saveScenario('custom.json');
    
    // Verify the file was written with the correct path
    const fs = require('fs/promises');
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('custom.json'),
      expect.any(String),
      'utf8'
    );
  });
  
  test('should remove a plot', async () => {
    const plotId = 'plot-1';
    
    await scenarioManager.removePlot(plotId);
    
    // Verify the plot was removed
    const currentScenario = scenarioManager.getCurrentScenario();
    expect(currentScenario.plots).toHaveLength(0);
    
    // Verify event was emitted
    const eventEmitter = scenarioManager.getEventEmitter();
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'plotRemoved',
      expect.objectContaining({
        id: plotId
      })
    );
  });
  
  test('should remove a plot point', async () => {
    const plotId = 'plot-1';
    const plotPointId = 'pp-2';
    
    await scenarioManager.removePlotPoint(plotId, plotPointId);
    
    // Verify the plot point was removed
    const currentScenario = scenarioManager.getCurrentScenario();
    const plot = currentScenario.plots.find(p => p.id === plotId);
    
    expect(plot.plotPoints).toHaveLength(1); // 2 - 1 = 1
    expect(plot.plotPoints.find(pp => pp.id === plotPointId)).toBeUndefined();
    
    // Verify event was emitted
    const eventEmitter = scenarioManager.getEventEmitter();
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'plotPointRemoved',
      expect.objectContaining({
        plotId,
        plotPointId
      })
    );
  });
  
  test('should handle integration with memory manager', async () => {
    // Setup memory manager mock for this test
    const memoryManager = require('../../src/memory/memoryManager.js');
    
    // Create a scenario event that should be remembered
    await scenarioManager.recordScenarioEvent({
      description: 'Festival begins in Test City',
      importance: 0.8,
      agentIds: ['agent-123']
    });
    
    // Verify memory manager was called to store the event
    expect(memoryManager.addMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('Festival begins'),
        importance: 0.8,
        source: 'scenario',
        metadata: expect.objectContaining({
          type: 'scenarioEvent'
        })
      })
    );
  });
});

