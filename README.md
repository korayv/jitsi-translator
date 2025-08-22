# Jitsi Meet Gerçek Zamanlı Çeviri Sistemi

Bu proje, Jitsi Meet video konferans platformuna gerçek zamanlı çeviri özelliği ekler.

## Özellikler

- **Gerçek Zamanlı Çeviri**: Konuşmalar anında farklı dillere çevrilir
- **Çok Dilli Destek**: 13 farklı dil desteği
- **Sesli Okuma (TTS)**: Çevrilen metinler sesli olarak okunabilir
- **Canlı Transkripsiyon**: Konuşmalar metin olarak görüntülenir
- **Çoklu Kullanıcı**: Aynı odada birden fazla kullanıcı farklı dillerde konuşabilir

## Kurulum

### 1. Gereksinimler
- Node.js (v14 veya üzeri)
- Chrome tabanlı tarayıcı (Web Speech Recognition için)

### 2. Projeyi İndirin
```bash
git clone <repo-url>
cd jitsi-translator
```

### 3. Bağımlılıkları Yükleyin
```bash
npm install
```

### 4. Sunucuyu Başlatın
```bash
npm start
```

### 5. Tarayıcıda Açın
http://localhost:3000 adresine gidin

## Kullanım

### İlk Kullanıcı (İngilizce Konuşan):
1. "My Language" olarak "English (US)" seçin
2. "Target Language" olarak "Türkçe" seçin
3. "Start Transcription" butonuna tıklayın
4. İngilizce konuşun

### İkinci Kullanıcı (Türkçe Konuşan):
1. Aynı oda adını kullanarak katılın
2. "My Language" olarak "Türkçe" seçin
3. "Target Language" olarak "English (US)" seçin
4. "Start Transcription" butonuna tıklayın
5. Türkçe konuşun

## Gelişmiş Kurulum (Google Translate API)

Daha iyi çeviri kalitesi için Google Translate API kullanabilirsiniz:

### 1. Google Cloud Console'da Proje Oluşturun
- https://console.cloud.google.com/ adresine gidin
- Yeni proje oluşturun
- Translation API'yi etkinleştirin

### 2. Servis Hesabı Oluşturun
- IAM & Admin > Service Accounts
- Yeni servis hesabı oluşturun
- JSON key dosyasını indirin

### 3. Ortam Değişkenlerini Ayarlayın
```bash
export GOOGLE_APPLICATION_CREDENTIALS="path/to/your/key.json"
export GOOGLE_CLOUD_PROJECT_ID="your-project-id"
```

### 4. server.js Dosyasını Güncelleyin
```javascript
// Bu satırların yorumunu kaldırın:
const translate = new Translate({
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});
```

## Desteklenen Diller

- Türkçe (tr-TR)
- İngilizce (en-US, en-GB)
- İspanyolca (es-ES)
- Fransızca (fr-FR)
- Almanca (de-DE)
- İtalyanca (it-IT)
- Portekizce (pt-BR)
- Rusça (ru-RU)
- Çince (zh-CN)
- Japonca (ja-JP)
- Korece (ko-KR)
- Arapça (ar-SA)
- Hintçe (hi-IN)

## Sorun Giderme

### "Browser not supported" Hatası
- Chrome, Edge veya Chromium tabanlı tarayıcı kullanın
- HTTPS bağlantısı gerekebilir (production için)

### Ses Tanıma Çalışmıyor
- Mikrofon izinlerini kontrol edin
- Tarayıcı ayarlarından mikrofon erişimini etkinleştirin

### Çeviri Çalışmıyor
- Sunucunun çalıştığından emin olun
- Console'da hata mesajlarını kontrol edin
- Google Translate API ayarlarını kontrol edin

## Geliştirme

### Yeni Dil Eklemek
1. `client.html` dosyasında dil seçicilerine yeni seçenek ekleyin
2. `server.js` dosyasında çeviri mantığını güncelleyin

### Çeviri Kalitesini Artırmak
- Google Translate API veya Azure Translator kullanın
- Özel çeviri modelleri entegre edin
- Dil algılama özelliği ekleyin

## Lisans

MIT License
