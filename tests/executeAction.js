import { AgentActions } from "../src/agents/agentActions.js";
import actionManager from "../src/actions/actionManager.js";
import { Dependencies, Config } from "../src/actions/Definitions.js";
actionManager.initialize(new Config, new Dependencies);

AgentActions.parseActions('action-execute createPlace { "id": "great-jura-forest-cliffside", "name": "Great Jura Forest Cliffside", "description": "A cliffside in the Great Jura Forest", "type": "location", "parentId": "great-jura-forest" }')

AgentActions.parseActions('action-execute connectPlaces {"source": "great-jura-forest-cliffside", "target": "acient-stone-tower", "type": "path" }')