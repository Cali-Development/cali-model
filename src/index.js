/**
 * Simple Roleplaying AI System
 * A clean, simple AI system with memory and context management
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import process from 'process';

// Load environment variables
dotenv.config();

// Import core components
import memoryManager from './memory/memoryManager.js';
import contextManager from './context/contextManager.js';
import discordInterface from './discord/discordInterface.js';
import config from './config.js';

// Track initialization state
const initState = {
  memory: false,
  context: false,
  discord: false
};

/**
 * Initialize the system
 */
async function initSystem() {
  console.log('🚀 Starting Simple Roleplaying AI System...');
  
  try {
    // 1. Initialize Memory Manager
    console.log('📝 Initializing Memory Manager...');
    await memoryManager.initialize();
    initState.memory = true;
    console.log('✅ Memory Manager initialized');
    
    // 2. Initialize Context Manager
    console.log('🧠 Initializing Context Manager...');
    await contextManager.initialize();
    initState.context = true;
    console.log('✅ Context Manager initialized');
    
    // 3. Initialize Discord Interface
    console.log('🤖 Initializing Discord Interface...');
    await discordInterface.initialize();
    initState.discord = true;
    console.log('✅ Discord Interface initialized');
    
    console.log('✨ System ready! Simple Roleplaying AI is now running.');
    console.log('💬 Start chatting with the AI on Discord!');
    
  } catch (error) {
    console.error('❌ Error during system initialization:', error);
    await shutdownSystem();
    process.exit(1);
  }
}

/**
 * Shutdown the system gracefully
 */
async function shutdownSystem() {
  console.log('\n🛑 Shutting down system...');
  
  try {
    // Discord Interface
    if (initState.discord) {
      console.log('🤖 Shutting down Discord Interface...');
      await discordInterface.cleanup();
      console.log('✅ Discord Interface shut down');
    }
    
    // Context Manager
    if (initState.context) {
      console.log('🧠 Shutting down Context Manager...');
      contextManager.cleanup();
      console.log('✅ Context Manager shut down');
    }
    
    // Memory Manager
    if (initState.memory) {
      console.log('📝 Shutting down Memory Manager...');
      memoryManager.close();
      console.log('✅ Memory Manager shut down');
    }
    
    console.log('✨ System shutdown complete');
  } catch (error) {
    console.error('❌ Error during system shutdown:', error);
    process.exit(1);
  }
}

// Handle process termination signals
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT signal');
  await shutdownSystem();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM signal');
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
