const Service = require('./models');
const chat = require('./chatting')
const voicechat = require('./voicechat')

const app = new Service();
const { Client } = require('discord.js');

const client = new Client({ intents: ["Guilds", "GuildMessages", "DirectMessages", "MessageContent", "GuildVoiceStates"] });

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.content.startsWith('Cassi')) return chat(message, app);
    if (message.content.startsWith('VC')) return voicechat(message, app);
});

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.login(process.env.TOKEN); // Replace with your bot's token
