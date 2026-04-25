# UniVerse Backend

Üniversite öğrencileri için sosyal platform — Node.js + Express + PostgreSQL + Socket.io.

## Özellikler

- `.edu.tr` e-posta doğrulamalı kayıt/giriş (JWT, 7 gün geçerli)
- İlanlar (eşya, ev, ev arkadaşı, iş)
- Etkinlikler ve katılım yönetimi
- Haberler / duyurular
- Gerçek zamanlı mesajlaşma (Socket.io)
- Kullanıcı takip sistemi

## Kurulum

### 1. Bağımlılıkları yükle

```bash
npm install
```

### 2. Ortam değişkenlerini ayarla

`.env.example` dosyasını `.env` olarak kopyala ve değerleri doldur:

```bash
cp .env.example .env
```

```env
DATABASE_URL=postgresql://user:pass@ep-xxxx.neon.tech/universe_db?sslmode=require
JWT_SECRET=güçlü_bir_secret_key
PORT=5000
```

> Veritabanı için [Neon.tech](https://neon.tech) üzerinden ücretsiz bir PostgreSQL instance oluşturup connection string'i `DATABASE_URL`'ye yapıştır.

### 3. Veritabanı migration'ı çalıştır

```bash
npm run migrate
```

Bu komut `users`, `listings`, `events`, `news`, `messages`, `chat_rooms`, `follows`, `event_participants` tablolarını oluşturur.

### 4. Sunucuyu başlat

Geliştirme modu (nodemon ile auto-reload):
```bash
npm run dev
```

Production:
```bash
npm start
```

Sunucu varsayılan olarak `http://localhost:5000` adresinde çalışır.

## API Endpoint'leri

### Auth
- `POST /api/auth/register` — kayıt (sadece `.edu.tr`)
- `POST /api/auth/login` — giriş

### Kullanıcılar
- `GET /api/users/me` — kendi profili (auth)
- `PUT /api/users/me` — profil güncelle (auth)
- `GET /api/users/:id` — kullanıcı detayı
- `POST /api/users/:id/follow` — takip et (auth)
- `DELETE /api/users/:id/follow` — takipten çık (auth)

### İlanlar
- `GET /api/listings` — listele (`?type=item|house|roommate|job`, `?location=...`)
- `GET /api/listings/:id`
- `POST /api/listings` (auth)
- `PUT /api/listings/:id` (auth, sahibi)
- `DELETE /api/listings/:id` (auth, sahibi)

### Etkinlikler
- `GET /api/events`
- `GET /api/events/:id`
- `POST /api/events` (auth)
- `POST /api/events/:id/join` (auth)
- `DELETE /api/events/:id/join` (auth)
- `DELETE /api/events/:id` (auth, sahibi)

### Haberler
- `GET /api/news` (`?category=...`)
- `GET /api/news/:id`
- `POST /api/news` (auth)

### Mesajlaşma
- `GET /api/messages/rooms` (auth)
- `POST /api/messages/rooms` — `{ other_user_id }` (auth)
- `GET /api/messages/rooms/:roomId/messages` (auth)
- `POST /api/messages/rooms/:roomId/messages` (auth)

### Socket.io olayları

Bağlantı: `auth: { token: <JWT> }`

- `join_room` / `leave_room` → `roomId`
- `send_message` → `{ roomId, content }`
- `new_message` (sunucudan) — odadakilere
- `message_notification` (sunucudan) — karşı tarafa
- `typing` → `{ roomId }`
- `user_typing` (sunucudan)

## Klasör Yapısı

```
src/
  config/      → db.js, migrate.js
  middleware/  → auth.middleware.js
  controllers/ → auth, listing
  routes/      → auth, user, listing, event, news, message
  index.js     → Express + Socket.io ana giriş noktası
```
