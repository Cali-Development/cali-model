# Cali Model

An advanced AI context & memory system with multi-agent roleplay capabilities. This system provides a comprehensive framework for building AI agents with sophisticated memory, context awareness, scenario management, and interaction capabilities through Discord.

## 📋 Project Overview

Cali Model is a comprehensive multi-agent AI system with advanced context, memory, scenario, time, place, and item management, designed to create rich, persistent AI experiences through Discord. The system allows for:

- **Multi-Agent Interaction**: Create and manage multiple AI personas with distinct personalities and states
- **Memory Persistence**: AI agents maintain memories across conversations and sessions
- **Context Awareness**: Agents understand and remember conversation context
- **Scenario Management**: Create and evolve story worlds and plots
- **Time Management**: Track both real-world and in-universe time
- **Place & Item Management**: Track locations, their connections, and items within the world
- **Discord Integration**: Interact with the system through a Discord bot interface

## 🖥️ System Requirements

- Node.js 18.x or higher
- NPM 9.x or higher
- SQLite3
- At least 1GB of available RAM
- A Discord Bot Token (for Discord integration)
- A Groq API Key (for AI model access)

## 🚀 Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/cali-model.git
   cd cali-model
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory (see Configuration section below).

4. Start the system:
   ```bash
   npm start
   ```

   For development with auto-restart:
   ```bash
   npm run dev
   ```

## ⚙️ Configuration

Create a `.env` file in the root directory with the following variables:

```
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_GUILD_ID=your_discord_guild_id

# AI Model Configuration
GROQ_API_KEY=your_groq_api_key
AI_MODEL=mixtral-8x7b-32768  # Default model, can be changed

# Database Configuration
DATABASE_PATH=./data/cali.db

# System Configuration
LOG_LEVEL=info  # Options: error, warn, info, debug
TIME_SCALE=1.0  # In-universe time scale relative to real-world time
DEFAULT_COOLDOWN=1000  # Cooldown between agent responses in milliseconds
```

## 🎮 Usage

### Starting the System

Run the system with:
```bash
npm start
```

The system will initialize all managers in sequence and connect to Discord if properly configured.

### Discord Commands

- `/start` - Start a conversation with an AI agent
- `/assign [agent]` - Assign a specific AI agent to the conversation
- `/list` - List all available AI agents
- `/time` - Check the current in-universe time
- `/help` - Display help information

### Interacting with Agents

Simply mention an agent by name or tag them in a Discord message to interact with them. The system will handle the conversation context and agent responses automatically.

## 🏗️ Architecture Overview

The system is structured as a set of modular managers that handle different aspects of the AI experience:

```
cali-model/
├── src/
│   ├── memory/       # Memory management
│   ├── context/      # Context tracking and management
│   ├── scenario/     # World state and scenario management
│   ├── time/         # Time tracking and management
│   ├── agents/       # Agent personality and state management
│   ├── places/       # Location management and pathfinding
│   ├── items/        # Item and inventory management
│   ├── discord/      # Discord bot interface
│   └── index.js      # Main application entry point
└── data/
    └── cali.db       # SQLite database for persistence
```

The system uses event-driven communication between managers, allowing for modular and extensible behavior.

## 📚 Manager Descriptions

### Memory Manager

Handles persistent storage of memories with metadata, timestamps, tags, and relationships. Provides CRUD operations and relevance evaluation for memories.

### Context Manager

Tracks recent conversation context and generates AI-based summaries dynamically using the Groq API. Helps agents maintain awareness of ongoing conversations.

### Scenario Manager

Maintains editable story/world states, including plots and world state. Supports event-driven updates to the scenario based on agent interactions.

### Time Manager

Tracks real-world and in-universe time with scaling, synchronization, and event notifications about time changes. Allows for time-based events and triggers.

### Agent Manager

Manages multiple AI personas including their personality, emotional state, relationships, inventory, location, and messaging. Supports:
- Agent creation and updates
- Inter-agent messaging
- Emotional state updates with personality integration
- Relationships between agents
- Persistence of agent state

### Place Manager

Handles creation and management of places and their connections. Supports:
- Parent-child places (hierarchical locations)
- Agent movement between places
- Place searches and queries
- Adjacent place queries
- Pathfinding between locations
- Coordinates-based distance calculations

### Item Manager

Manages items and blueprints, tracking:
- Owners
- Locations
- Properties
- Uses
- Conditions
- Item creation, updates, deletion, transfers, and usage

### Discord Interface

Provides a Discord bot interface using discord.js, with:
- Sophisticated message handling
- Intelligent message splitting for long responses
- Asynchronous message collectors
- Multi-agent tracking per user and channel
- Command handling
- Event-driven interactions
- Rate-limiting and cooldowns

## 🤖 Discord Bot Setup Guide

1. **Create a Discord Application**:
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Click "New Application" and name your bot
   - Navigate to the "Bot" tab and click "Add Bot"
   - Under the "Privileged Gateway Intents" section, enable:
     - Presence Intent
     - Server Members Intent
     - Message Content Intent

2. **Get Your Bot Token**:
   - In the Bot tab, click "Reset Token" and copy the new token
   - Add this token to your `.env` file as `DISCORD_TOKEN`

3. **Invite the Bot to Your Server**:
   - In the OAuth2 > URL Generator tab
   - Select the scopes: `bot` and `applications.commands`
   - Bot Permissions: 
     - Read Messages/View Channels
     - Send Messages
     - Embed Links
     - Attach Files
     - Read Message History
     - Use Slash Commands
   - Copy the generated URL and open it in your browser
   - Select your server and authorize the bot

4. **Configure the Bot**:
   - Set the `DISCORD_CLIENT_ID` in your `.env` file (found in General Information tab)
   - Set the `DISCORD_GUILD_ID` in your `.env` file (your server's ID, enable Developer Mode in Discord to copy it)

5. **Start the System**:
   - Run `npm start` to start the system
   - The bot should now appear online in your Discord server
   - Use the `/help` command to get started

## 📜 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

