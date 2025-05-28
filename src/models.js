require('dotenv').config({ path: './.env' });
const fs = require('fs')
const { Groq } = require('groq-sdk');

// Initialize the Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

module.exports = class Service {
  constructor() {
    this.memory = fs.readFileSync('./src/tokens/memory.txt', 'utf8');
    this.context = ''
  }

  async addMessage(message, author = 'Cas') {
    const timestamp = new Date().toISOString();
    const contextSummary = await context.generateSummary(this.context);
    const memoryList = memory.getRelevant(this.context);

    const systemPrompt = `
Time: ${timestamp}
Current Scenario: ${JSON.stringify(scenario.get())}

Summary: ${contextSummary}
Relevant Memories:\n${memoryList.map(m => `- ${m}`).join('\n')}

Characters: ${character.listCharacters()}
Location: ${environment.getCurrentLocation()}
`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', name: author, content: message },
      ],
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    });

    const response = chatCompletion.choices[0].message.content;

    // Save everything
    memory.save(message, response, author);
    this.context.push({ message, author, timestamp });
    scenario.updateFromMessage(message, response);
    character.updateFromMessage(message, response);
    environment.syncFromMessage(message, response);

    return response;
  }

  async getService(message, author, image) {
    const contextFormat = this.context.map((c) => `- ${c}`).join('\n');

    fs.appendFileSync('./src/tokens/memory.txt', contextFormat);
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `

Memory: [${this.memory}]

This is the current context of the situation.
Context: [${this.context}]`,
        },
        {
          role: 'user',
          name: 'Cas',
          content: message,
        },
      ],
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    });

    fs.appendFileSync('./src/tokens/memory.txt', `${chatCompletion.choices[0].message.content}\n\n`);
    return chatCompletion.choices[0].message.content;
  }
};