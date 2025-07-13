import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env file
dotenv.config();

// Get the directory name
const __dirname = dirname(fileURLToPath(import.meta.url));

// Configuration object
const config = {
  // Packages & build information
  package: {
    name: 'Cali AI Model',
    version: '2',
    description: 'Advanced AI context & memory system with multi-agent roleplay capabilities',
    author: 'Cassitly',
    license: 'MIT',

    build: {
      date: new Date().toISOString(),
      commitHash: process.env.COMMIT_HASH || 'unknown',
      buildNumber: process.env.BUILD_NUMBER || 'unknown',
      buildTag: process.env.BUILD_TAG || 'unknown',
      branch: process.env.BRANCH || 'edited',
    }
  },

  // API Keys and sensitive data
  api: {
    groq: {
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL || 'meta-llama/llama-4-maverick-17b-128e-instruct',
      summaryModel: process.env.SUMMARY_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct',
      temperature: parseFloat(process.env.GROQ_TEMPERATURE || '0.7'),
      maxTokens: parseInt(process.env.GROQ_MAX_TOKENS || '4096', 10),
    },
  },
  
  // Discord bot configuration
  discord: {
    token: process.env.DISCORD_BOT_TOKEN,
    clientId: process.env.DISCORD_CLIENT_ID,
    prefix: process.env.COMMAND_PREFIX || '!',
    messageRateLimit: parseInt(process.env.MESSAGE_RATE_LIMIT || '1000', 10), // ms between messages
    maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
  },
  
  // Database settings
  database: {
    path: process.env.DATABASE_PATH || join(__dirname, '..', 'data', 'memory.db'),
    backupInterval: parseInt(process.env.DB_BACKUP_INTERVAL || '86400000', 10), // 24 hours in ms
  },
  
  // Time settings
  time: {
    // Real-world time settings
    realTimeUpdateInterval: parseInt(process.env.REAL_TIME_UPDATE_INTERVAL || '60000', 10), // 1 minute in ms
    
    // In-universe time settings
    timeScale: parseFloat(process.env.TIME_SCALE || '1.0'), // 1.0 = real-time, 2.0 = twice as fast
    initialDate: process.env.INITIAL_UNIVERSE_DATE || new Date().toISOString(),
    dateFormat: process.env.DATE_FORMAT || 'yyyy-MM-dd HH:mm:ss',
  },
  
  // Memory settings
  memory: {
    maxMemoriesPerConversation: parseInt(process.env.MAX_MEMORIES_PER_CONVERSATION || '500', 10),
    maxGlobalMemories: parseInt(process.env.MAX_GLOBAL_MEMORIES || '10000', 10),
    relevanceThreshold: parseFloat(process.env.RELEVANCE_THRESHOLD || '0.7'),
    defaultMemoryRetention: parseInt(process.env.DEFAULT_MEMORY_RETENTION || '2592000000', 10), // 30 days in ms
    pruneInterval: parseInt(process.env.MEMORY_PRUNE_INTERVAL || '86400000', 10), // 24 hours in ms
  },
  
  // Context settings
  context: {
    maxContextMessages: parseInt(process.env.MAX_CONTEXT_MESSAGES || '50', 10),
    summarizationThreshold: parseInt(process.env.SUMMARIZATION_THRESHOLD || '20', 10),
    maxSummaryLength: parseInt(process.env.MAX_SUMMARY_LENGTH || '1000', 10),
    cacheTimeout: parseInt(process.env.CONTEXT_CACHE_TIMEOUT || '300000', 10), // 5 minutes in ms
  },
  
  // System-wide settings
  system: {
    debug: process.env.DEBUG_MODE === 'true',
    logLevel: process.env.LOG_LEVEL || 'info',
    maxAsyncOperations: parseInt(process.env.MAX_ASYNC_OPERATIONS || '5', 10),
    enableAIMonitoring: process.env.ENABLE_AI_MONITORING !== 'false',
    dataDir: process.env.DATA_DIR || join(__dirname, '..', 'data'),
  },
  
  // Scenarios settings
  scenarios: {
    path: process.env.SCENARIOS_PATH || join(__dirname, '..', 'data', 'scenarios'),
    defaultScenario: process.env.DEFAULT_SCENARIO || 'default.json',
  },
  
  // User settings
  users: {
    maxMadeUpUsers: parseInt(process.env.MAX_MADE_UP_USERS || '100', 10),
  },
  
  // Places settings
  places: {
    maxPlaces: parseInt(process.env.MAX_PLACES || '500', 10),
  },
  
  // Items settings
  items: {
    maxItems: parseInt(process.env.MAX_ITEMS || '1000', 10),
  },
};

export default config;

