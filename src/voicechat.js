const spawn = require('child_process').spawn
const prism = require('prism-media');
const ffmpeg = require('ffmpeg-static');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, getVoiceConnection, AudioPlayerStatus } = require('@discordjs/voice')
const fs = require('fs');
const Groq = require('groq-sdk');

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

async function transcribe(wavPath) {    
    const resp = await groq.audio.transcriptions.create({
        'file': fs.createReadStream(wavPath),
        'model': 'whisper-large-v3',
        'language': 'en',
    })

    return resp.text.trim() || null;
}

module.exports = async function voicechat(message, app) {
    const { channel } = message.member.voice;
    if (!channel) return message.reply('You must be in a VC.');

    const connection = joinVoiceChannel({
        selfDeaf: false,
        selfMute: false,
        channelId: channel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator
    });

    const userId = message.author.id;

    message.channel.send('Starting voice chat. Say "End the call" to stop.');

    async function listenLoop() {
        const receiver = connection.receiver;
        const audioStream = receiver.subscribe(userId, {
            end: { behavior: 'silence', duration: 1000 }
        });

        const oggStream = new prism.opus.Decoder({ rate: 48000, channels: 2, frameSize: 960 });

        const outputFile = `./output/data/audio_${userId}.pcm`;
        if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
        const writeStream = fs.createWriteStream(outputFile);
        audioStream.pipe(oggStream).pipe(writeStream);

        // Wait 7 seconds to capture speech
        await new Promise(resolve => setTimeout(resolve, 7000));
        writeStream.end();

        // Convert PCM to WAV
        const wavOutput = `./output/data/audio_${userId}.wav`;
        if (fs.existsSync(wavOutput)) fs.unlinkSync(wavOutput);

        await new Promise(resolve => {
            spawn(ffmpeg, ['-f', 's16le', '-ar', '48000', '-ac', '2', '-i', outputFile, wavOutput])
                .on('exit', resolve);
        });

        // Transcribe
        const transcription = await transcribe(wavOutput);
        if (!transcription) {
            await message.channel.send('Could not understand.');
            return listenLoop(); // Continue
        }

        if (transcription.toLowerCase().includes('end the call')) {
            getVoiceConnection(message.guild.id)?.destroy();
            return message.channel.send('Call ended.');
        }

        await message.channel.send(`You said: **${transcription}**`);

        const reply = await app.getService(transcription, message.author.username);
        await message.channel.send(`Groq: ${reply}`);
            
        // Convert Groq response to speech
        const url = await groq.audio.speech.create({
            'input': reply,
            'model': 'playai-tts',
            'response_format': 'wav',
            'voice': 'Arista-PlayAI'
        })
        const speechFilePath = `./config/speech_${userId}.wav`;
        const audio = Buffer.from(await url.arrayBuffer());
        await fs.promises.writeFile(speechFilePath, audio);

        // Play reply in VC
        const audioPlayer = createAudioPlayer();
        const resource = createAudioResource(fs.createReadStream(speechFilePath));
        audioPlayer.play(resource);
        connection.subscribe(audioPlayer);

        // Wait for playback to finish before looping
        audioPlayer.once(AudioPlayerStatus.Idle, () => listenLoop());
    }

    listenLoop();
}