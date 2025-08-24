const { ElevenLabsClient } = require("elevenlabs");
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { Translate } = require('@google-cloud/translate').v2;
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    transports: ['polling', 'websocket'],
    allowEIO3: true
});

// Google Translate setup
const translate = new Translate({
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});

// ElevenLabs setup
const elevenlabs = new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY
});

// Çeviri fonksiyonu
async function translateText(text, fromLang, toLang) {
    try {
        // Google Translate API kullan
        const [translation] = await translate.translate(text, {
            from: fromLang.substring(0, 2), // 'tr-TR' -> 'tr'
            to: toLang.substring(0, 2)      // 'en-US' -> 'en'
        });
        return translation;
    } catch (error) {
        console.error('Google Translate error:', error);
        throw error;
    }
}

// TTS fonksiyonu with streaming optimization
async function generateTTS(text, voiceId = 'pNInz6obpgDQGcFmaJgB') {
    try {
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
        console.error('ElevenLabs TTS error:', error);
        throw error;
    }
}
// Statik dosyaları servis et
app.use(express.static(path.join(__dirname)));

// Ana sayfa
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'client.html'));
});

// Oda yönetimi
const rooms = new Map();

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Odaya katılma
    socket.on('join-room', (data) => {
        const { roomName, userId, language, selectedVoiceId } = data;
        
        socket.join(roomName);
        socket.userId = userId;
        socket.roomName = roomName;
        socket.language = language;
        socket.selectedVoiceId = selectedVoiceId || 'pNInz6obpgDQGcFmaJgB';

        // Oda bilgisini güncelle
        if (!rooms.has(roomName)) {
            rooms.set(roomName, new Map());
        }
        
        rooms.get(roomName).set(userId, {
            socketId: socket.id,
            language: language,
            joinTime: new Date()
        });

        console.log(`User ${userId} joined room ${roomName} with language ${language}`);
        
        // Odadaki diğer kullanıcılara bildir
        socket.to(roomName).emit('user-joined', {
            userId: userId,
            language: language
        });
    });

    // Konuşma girişi
    socket.on('speech-input', async (data) => {
        const { text, fromLanguage, toLanguage, roomName, userId } = data;
        
        console.log(`Speech from ${userId} (${fromLanguage}): ${text}`);

        try {
            // Metni çevir
            const translatedText = await translateText(text, fromLanguage, toLanguage);
            
            console.log(`Translated to ${toLanguage}: ${translatedText}`);

            // Send text immediately, generate TTS in parallel
            socket.to(roomName).emit('translated-message', {
                originalText: text,
                translatedText: translatedText,
                fromLanguage: fromLanguage,
                toLanguage: toLanguage,
                fromUserId: userId,
                timestamp: new Date(),
                audioBuffer: null // Send text first
            });

            // Send translated text to all clients - let each client generate TTS with their preferred voice
            socket.to(roomName).emit('generate-tts', {
                translatedText: translatedText,
                fromUserId: userId,
                timestamp: new Date()
            });

        } catch (error) {
            console.error('Translation error:', error);
            socket.emit('translation-error', {
                message: 'Translation failed',
                error: error.message
            });
        }
    });

    // Bağlantı kopması
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        
        if (socket.roomName && socket.userId) {
            const room = rooms.get(socket.roomName);
            if (room) {
                room.delete(socket.userId);
                if (room.size === 0) {
                    rooms.delete(socket.roomName);
                }
            }
            
            // Odadaki diğer kullanıcılara bildir
            socket.to(socket.roomName).emit('user-left', {
                userId: socket.userId
            });
        }
    });

    // Get available voices
    socket.on('get-voices', async () => {
        try {
            const voices = await elevenlabs.voices.getAll();
            socket.emit('voices-list', voices.voices);
        } catch (error) {
            console.error('Error fetching voices:', error);
            socket.emit('voices-error', { error: error.message });
        }
    });

    // Generate TTS for specific client
    socket.on('generate-tts-for-me', async (data) => {
        try {
            const audioBuffer = await generateTTS(data.text, data.voiceId);
            socket.emit('tts-audio', {
                audioBuffer: audioBuffer.toString('base64'),
                translatedText: data.text
            });
        } catch (error) {
            console.error('TTS generation failed:', error);
        }
    });
});

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'production') {
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Open http://localhost:${PORT} to start using the translator`);
    });
}

// Export for Vercel
module.exports = app;
