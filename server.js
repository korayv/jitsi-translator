const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { Translate } = require('@google-cloud/translate').v2;

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Google Translate setup (isteğe bağlı - API key gerekli)
// const translate = new Translate({
//     projectId: 'your-google-project-id',
//     keyFilename: 'path/to/service-account-key.json'
// });

// Basit çeviri fonksiyonu (demo için)
async function translateText(text, fromLang, toLang) {
    // Gerçek projede Google Translate API veya Azure Translator kullanın
    // Şimdilik basit bir mock çeviri
    const translations = {
        'en-US': {
            'tr-TR': {
                'hello': 'merhaba',
                'how are you': 'nasılsın',
                'good morning': 'günaydın',
                'thank you': 'teşekkür ederim',
                'yes': 'evet',
                'no': 'hayır'
            }
        },
        'tr-TR': {
            'en-US': {
                'merhaba': 'hello',
                'nasılsın': 'how are you',
                'günaydın': 'good morning',
                'teşekkür ederim': 'thank you',
                'evet': 'yes',
                'hayır': 'no'
            }
        }
    };

    const lowerText = text.toLowerCase();
    const langPair = translations[fromLang]?.[toLang];
    
    if (langPair) {
        for (const [source, target] of Object.entries(langPair)) {
            if (lowerText.includes(source)) {
                return text.replace(new RegExp(source, 'gi'), target);
            }
        }
    }
    
    // Çeviri bulunamazsa orijinal metni döndür
    return `[${toLang}] ${text}`;
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
        const { roomName, userId, language } = data;
        
        socket.join(roomName);
        socket.userId = userId;
        socket.roomName = roomName;
        socket.language = language;

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

            // Odadaki diğer kullanıcılara çeviriyi gönder
            socket.to(roomName).emit('translated-message', {
                originalText: text,
                translatedText: translatedText,
                fromLanguage: fromLanguage,
                toLanguage: toLanguage,
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
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} to start using the translator`);
});
