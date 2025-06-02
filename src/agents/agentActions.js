import { Actions } from "./Parameters.js";
import actionManager from "../actions/actionManager.js";
import agentManager from "./agentManager.js";

/**
 * Class for parsing and executing agent actions
 */
export class AgentActions {
    /**
     * Parse and extract action commands embedded in a string
     * @param {string} text 
     * @returns {string|null} Result of executing the command or null
     */
    static async parseActions(text) {
        const actionExecuteRegex = /action-execute\s+([a-zA-Z0-9_-]+)\s+({[\s\S]*?})/;
        const actionGetDetailsRegex = /action-getdetails\s+([a-zA-Z0-9_-]+)/;
        const agentGetDetailsRegex = /agent-getdetails\s+([a-zA-Z0-9_-]+)/;

        const actionExecuteRegex2 = /Action: \s+([a-zA-Z0-9_-]+)/;
        const actionParametersRegex = /Action Parameters: \s+({[\s\S]*?})/;
        const JSONRegex = /JSON: \s+({[\s\S]*?})/;

        let match;

        if ((match = text.match(actionExecuteRegex))) {
            const actionName = match[1];
            let args;
            try {
                args = JSON.parse(match[2]);
            } catch (e) {
                return `Invalid JSON for arguments: ${e.message}`;
            }
            return await actionManager.executeAction(actionName, args, args);
        } else

        if ((match = text.match(actionGetDetailsRegex))) {
            const actionName = match[1];
            return await actionManager.getAction(actionName);
        } else

        if ((match = text.match(agentGetDetailsRegex))) {
            const agentId = match[1];
            return agentManager.getAgent(agentId);
        } else

        if ((match = text.match(actionExecuteRegex2))) {
            const actionName = match[1];
            let args;
            try {
                args = JSON.parse(match[2]);
            } catch (e) {
                return `Invalid JSON for arguments: ${e.message}`;
            }
            return await actionManager.executeAction(actionName, args, args);
        } else

        // if ((match = text.match(actionParametersRegex))) {
        //     const actionName = match[1];
        //     let args;
        //     try {
        //         args = JSON.parse(match[2]);
        //     } catch (e) {
        //         return `Invalid JSON for arguments: ${e.message}`;
        //     }
        //     return await actionManager.executeAction(actionName, args, args);
        // } else

        // if ((match = text.match(JSONRegex))) {
        //     let args;
        //     try {
        //         args = JSON.parse(match[1]);
        //     } catch (e) {
        //         return `Invalid JSON for arguments: ${e.message}`;
        //     }
        //     return await actionManager.executeAction(Actions.JSON, args, args);
        // }

        return null;
    }
}

if (import.meta.filename === process.argv[1]) {
    actionManager.initialize();
    console.log(actionManager.getAllActions());
}