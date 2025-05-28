module.exports = async function chat(message, app) {
    const filter = response => response.author.id === message.author.id;
    const collector = message.channel.createMessageCollector({ filter, time: 6000000 });

    collector.on('collect', async (response) => {
        if (response.content === 'exit' || response.content === 'stop') {
            await message.channel.send('[INFO] Shutting down');
            collector.stop();
        } else if (response.content === 'context') {
            app.addContext(message.author.username, response.content);
        } else {
            try {
                let reply = await app.getService(response.content, message.author.username);
                if (reply.length > 2000) {
                    reducedReply = reply.split(' ').slice(0, 2000).join(' ') + '...';
                    for (let i = 0; i < reply.length; i += 2000) {
                        await message.channel.send(reducedReply.slice(i, i + 2000));
                    }
                }
                else { await message.channel.send(reply); }
                
            } catch (error) {
                console.error(error);
                await message.channel.send('[ERROR] Something went wrong. Please try again.');
            }
        }
    });

    collector.on('end', (collected, reason) => {
        if (reason === 'time') {
            message.channel.send('[INFO] Session timed out. Returning to main menu.');
        }
    });
}