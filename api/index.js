const express = require('express');
const path = require('path');
const { Translate } = require('@google-cloud/translate').v2;
const { ElevenLabsClient } = require("elevenlabs");

const app = express();

// Google Translate setup
let translate;
try {
    if (process.env.GOOGLE_CLOUD_PROJECT_ID && process.env.GOOGLE_API_KEY) {
        translate = new Translate({
            projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
            key: process.env.GOOGLE_API_KEY
        });
    }
} catch (error) {
    console.log('Google Translate not configured:', error.message);
}

// ElevenLabs setup
let elevenlabs;
try {
    if (process.env.ELEVENLABS_API_KEY) {
        elevenlabs = new ElevenLabsClient({
            apiKey: process.env.ELEVENLABS_API_KEY
        });
    }
} catch (error) {
    console.log('ElevenLabs not configured:', error.message);
}

// Translation function
async function translateText(text, fromLang, toLang) {
    try {
        if (!translate) {
            throw new Error('Google Translate not configured');
        }
        const [translation] = await translate.translate(text, {
            from: fromLang.substring(0, 2),
            to: toLang.substring(0, 2)
        });
        return translation;
    } catch (error) {
        console.error('Translation error:', error);
        return text; // Return original text if translation fails
    }
}

// TTS function
async function generateTTS(text, voiceId = 'pNInz6obpgDQGcFmaJgB') {
    try {
        if (!elevenlabs) {
            throw new Error('ElevenLabs not configured');
        }
        const audio = await elevenlabs.textToSpeech.convert(voiceId, {
            text: text,
            modelId: 'eleven_turbo_v2',
            outputFormat: 'mp3_22050_32'
        });

        const chunks = [];
        for await (const chunk of audio) {
            chunks.push(chunk);
        }
        
        return Buffer.concat(chunks);
    } catch (error) {
        console.error('TTS error:', error);
        throw error;
    }
}

// Serve static files
app.use(express.static(path.join(__dirname, '..')));
app.use(express.json());

// Main route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client.html'));
});

// API endpoints for translation and TTS
app.post('/api/translate', async (req, res) => {
    try {
        const { text, fromLanguage, toLanguage } = req.body;
        const translatedText = await translateText(text, fromLanguage, toLanguage);
        res.json({ translatedText });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/tts', async (req, res) => {
    try {
        const { text, voiceId } = req.body;
        const audioBuffer = await generateTTS(text, voiceId);
        res.json({ audioBuffer: audioBuffer.toString('base64') });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/voices', async (req, res) => {
    try {
        if (!elevenlabs) {
            return res.json({ voices: [] });
        }
        const voices = await elevenlabs.voices.getAll();
        res.json({ voices: voices.voices });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = app;