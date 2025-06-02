/**
 * Class representing a message
 */
export class Message {
    constructor() {
        this.content = '';
        this.fromAgentId = '';
        this.toAgentId = '';
        this.type = 'message';
        this.metadata = {};
    }
}

/**
 * Class representing agent data
 */
export class AgentData {
    constructor() {
        this.name = '';
        this.description = ''
        this.personality = {
            openness: 50,
            conscientiousness: 50,
            extraversion: 50,
            agreeableness: 50,
            neuroticism: 50
        };
        this.appearance = '';
        this.backstory = '';
        this.locationId = 'default';

        this.inventory = [];
        this.goals = [];

        this.traits = {};
        this.state = {
            mood: 'neutral',
            energy: 100,
            busy: false
        };

        this.isActive = true;
        this.emotions = new EmotionalState({});
        
        this.createdAt = new Date();
        this.updatedAt = new Date();
        this.metadata = {};
    }
}

/**
 * Class representing context data
 */
export class Context {
    constructor() {
        this.message = '';

        this.toAgentId = '';
        this.fromAgentId = '';
        
        this.additionalContext = [
            { context: '', role: '' }
        ];
        this.metadata = {};
    }
}

/**
 * Class representing actions parsed from user input
 */
export class Actions {
    constructor() {
        this.input = '';

        this.command = this.input.split('-')[0].trim() || 'action';
        this.subcommand = this.input.split('-')[1]?.trim() || 'getdetails' || 'execute';

        this.parameters = this.subcommand.split(' ')[1]?.trim() || '<actionName>';
        this.arguments = this.subcommand.split(' ')[2]?.trim() || '<JSON>';
    }
}