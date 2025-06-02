/**
 * Main application entry point
 * Initializes all managers and starts the system
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import process from 'process';

// Load environment variables
dotenv.config();

// Import singleton manager instances
import memoryManager from './memory/memoryManager.js';
import contextManager from './context/contextManager.js';
import scenarioManager from './scenario/scenarioManager.js';
import timeManager from './time/timeManager.js';
import agentManager from './agents/agentManager.js';
import placeManager from './places/placeManager.js';
import itemManager from './items/itemManager.js';
import userManager from './users/userManager.js';
import discordInterface from './discord/discordInterface.js';
import formatterManager from './formatter/formatManager.js';
import actionManager from './actions/actionManager.js';

// Import configuration
import config from './config.js';

// Track initialization state
const initState = {
  memory: false,
  context: false,
  formatter: false,
  scenario: false,
  time: false,
  agents: false,
  places: false,
  items: false,
  actions: false,
  discord: false
};

/**
 * Initialize the system in the correct order
 */
async function initSystem() {
  console.log('Starting system initialization...');
  
  try {
    // 1. Initialize Memory Manager
    console.log('Initializing Memory Manager...');
    await memoryManager.initialize();
    initState.memory = true;
    console.log('✅ Memory Manager initialized');
    
    // 2. Initialize Context Manager
    console.log('Initializing Context Manager...');
    await contextManager.initialize();
    initState.context = true;
    console.log('✅ Context Manager initialized');
    
    // 3. Initialize Formatter Manager
    console.log('Initializing Formatter Manager...');
    await formatterManager.initialize();
    initState.formatter = true;
    console.log('✅ Formatter Manager initialized');
    
    // 4. Initialize Scenario Manager
    console.log('Initializing Scenario Manager...');
    await scenarioManager.initialize();
    initState.scenario = true;
    console.log('✅ Scenario Manager initialized');
    
    // 5. Initialize Time Manager
    console.log('Initializing Time Manager...');
    await timeManager.initialize();
    initState.time = true;
    console.log('✅ Time Manager initialized');
    
    // 6. Initialize Agent Manager
    console.log('Initializing Agent Manager...');
    await agentManager.initialize();
    initState.agents = true;
    console.log('✅ Agent Manager initialized');
    
    // 7. Initialize Place Manager
    console.log('Initializing Place Manager...');
    await placeManager.initialize();
    initState.places = true;
    console.log('✅ Place Manager initialized');
    
    // 8. Initialize Item Manager
    console.log('Initializing Item Manager...');
    await itemManager.initialize();
    initState.items = true;
    console.log('✅ Item Manager initialized');
    
    // 9. Initialize Action Manager
    console.log('Initializing Action Manager...');
    await actionManager.initialize(config,
      {
        memoryManager: memoryManager,
        contextManager: contextManager,
        scenarioManager: scenarioManager,
        timeManager: timeManager,
        agentManager: agentManager,
        placeManager: placeManager,
        itemManager: itemManager,
        
        userManager: userManager,
        formatManager: formatterManager
      }
    );
    initState.actions = true;
    console.log('✅ Action Manager initialized');

    // 9. Initialize User Manager
    console.log('Initializing User Manager...');
    await userManager.initialize();
    console.log('✅ User Manager initialized');
    
    // 10. Initialize Discord Interface
    console.log('Initializing Discord Interface...');
    await discordInterface.initialize();
    initState.discord = true;
    console.log('✅ Discord Interface initialized');
    
    console.log('✨ System initialization complete! ✨');
    console.log('The system is now running. Press Ctrl+C to shutdown gracefully.');
    
  } catch (error) {
    console.error('❌ Error during system initialization:', error);
    await shutdownSystem();
    process.exit(1);
  }
}

/**
 * Shutdown the system in the reverse order of initialization
 */
async function shutdownSystem() {
  console.log('\nShutting down system...');
  
  try {
    // Shutdown in reverse order of initialization
    
    // 10. Discord Interface
    if (initState.discord) {
      console.log('Shutting down Discord Interface...');
      await discordInterface.cleanup();
      console.log('✅ Discord Interface shut down');
    }
    
    // 9. Action Manager
    if (initState.actions) {
      console.log('Shutting down Action Manager...');
      await actionManager.cleanup();
      console.log('✅ Action Manager shut down');
    }
    
    // 8. Item Manager
    if (initState.items) {
      console.log('Shutting down Item Manager...');
      itemManager.cleanup();
      console.log('✅ Item Manager shut down');
    }
    
    // 7. Place Manager
    if (initState.places) {
      console.log('Shutting down Place Manager...');
      placeManager.cleanup();
      console.log('✅ Place Manager shut down');
    }
    
    // 6. Agent Manager
    if (initState.agents) {
      console.log('Shutting down Agent Manager...');
      agentManager.cleanup();
      console.log('✅ Agent Manager shut down');
    }
    
    // 5. Time Manager
    if (initState.time) {
      console.log('Shutting down Time Manager...');
      timeManager.cleanup();
      console.log('✅ Time Manager shut down');
    }
    
    // 4. Scenario Manager
    if (initState.scenario) {
      console.log('Shutting down Scenario Manager...');
      scenarioManager.cleanup();
      console.log('✅ Scenario Manager shut down');
    }
    
    // 3. Formatter Manager
    if (initState.formatter) {
      console.log('Shutting down Formatter Manager...');
      await formatterManager.cleanup();
      console.log('✅ Formatter Manager shut down');
    }
    
    // 2. Context Manager
    if (initState.context) {
      console.log('Shutting down Context Manager...');
      contextManager.cleanup();
      console.log('✅ Context Manager shut down');
    }
    
    // 1. Memory Manager
    if (initState.memory) {
      console.log('Shutting down Memory Manager...');
      memoryManager.close();
      console.log('✅ Memory Manager shut down');
    }
    
    console.log('✨ System shutdown complete ✨');
  } catch (error) {
    console.error('❌ Error during system shutdown:', error);
    // Force exit in case of shutdown error
    process.exit(1);
  }
}

// Handle process termination signals
process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT signal');
  await shutdownSystem();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nReceived SIGTERM signal');
  await shutdownSystem();
  process.exit(0);
});

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', async (error) => {
  console.error('❌ Uncaught Exception:', error);
  await shutdownSystem();
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('❌ Unhandled Promise Rejection:', reason);
  await shutdownSystem();
  process.exit(1);
});

// Start the system
initSystem().catch(async (error) => {
  console.error('❌ Fatal error during system initialization:', error);
  await shutdownSystem();
  process.exit(1);
});

