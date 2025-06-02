// Import modules for definition (Easier time to code)
import memoryManager from "../memory/memoryManager.js";
import contextManager from "../context/contextManager.js";
import scenarioManager from "../scenario/scenarioManager.js";
import timeManager from "../time/timeManager.js";
import agentManager from "../agents/agentManager.js";
import placeManager from "../places/placeManager.js";
import itemManager from "../items/itemManager.js";
import userManager from "../users/userManager.js";
import formatManager from "../formatter/formatManager.js";

// Import configuration
import config from "../config.js";

/**
 * Class for defining action dependencies
 */
export class Dependencies {
    constructor() {
        this.memoryManager = memoryManager;
        this.contextManager = contextManager;
        this.scenarioManager = scenarioManager;
        this.timeManager = timeManager;
        this.agentManager = agentManager;
        this.placeManager = placeManager;
        this.itemManager = itemManager;
        this.userManager = userManager;
        this.formatManager = formatManager;
    }

    static return() {
        return {
            memoryManager,
            contextManager,
            scenarioManager,
            timeManager,
            agentManager,
            placeManager,
            itemManager,
            userManager,
            formatManager
        };
    }
}

export class Config {
    constructor() {
        config
    }
}