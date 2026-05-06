require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const db = require('./config/db');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const listingRoutes = require('./routes/listing.routes');
const eventRoutes = require('./routes/event.routes');
const newsRoutes = require('./routes/news.routes');
const messageRoutes = require('./routes/message.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

app.get('/', (req, res) => {
  res.json({ message: 'UniVerse API çalışıyor', version: '1.0.0' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint bulunamadı' });
});

app.use((err, req, res, next) => {
  console.error('--- Sunucu Hatası ---');
  console.error('URL:', req.method, req.originalUrl);
  console.error('Mesaj:', err.message);
  console.error('Kod:', err.code || 'yok');
  console.error('Stack:', err.stack);
  console.error('---------------------');

  const isProd = process.env.NODE_ENV === 'production';
  const payload = {
    message: 'Sunucuda beklenmeyen bir hata oluştu, lütfen tekrar deneyin'
  };
  if (!isProd) {
    payload.error = err.message;
    payload.stack = err.stack;
  }
  res.status(err.status || 500).json(payload);
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Token gerekli'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch (err) {
    next(new Error('Geçersiz token'));
  }
});

io.on('connection', (socket) => {
  console.log(`Socket bağlandı: user=${socket.userId}`);

  socket.join(`user_${socket.userId}`);

  socket.on('join_room', (roomId) => {
    socket.join(`room_${roomId}`);
    console.log(`User ${socket.userId} joined room ${roomId}`);
  });

  socket.on('leave_room', (roomId) => {
    socket.leave(`room_${roomId}`);
  });

  socket.on('send_message', async ({ roomId, content }) => {
    try {
      const room = await db.query(
        'SELECT * FROM chat_rooms WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)',
        [roomId, socket.userId]
      );
      if (room.rows.length === 0) {
        socket.emit('error', { message: 'Odaya erişim yok' });
        return;
      }

      const result = await db.query(
        `INSERT INTO messages (room_id, sender_id, content)
         VALUES ($1, $2, $3) RETURNING *`,
        [roomId, socket.userId, content]
      );

      const message = result.rows[0];
      io.to(`room_${roomId}`).emit('new_message', message);

      const otherUserId = room.rows[0].user1_id === socket.userId
        ? room.rows[0].user2_id
        : room.rows[0].user1_id;
      io.to(`user_${otherUserId}`).emit('message_notification', message);
    } catch (err) {
      console.error('Socket send_message hatası:', err);
      socket.emit('error', { message: 'Mesaj gönderilemedi' });
    }
  });

  socket.on('typing', ({ roomId }) => {
    socket.to(`room_${roomId}`).emit('user_typing', { userId: socket.userId });
  });

  socket.on('disconnect', () => {
    console.log(`Socket ayrıldı: user=${socket.userId}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
  console.log(`UniVerse backend ${PORT} portunda çalışıyor`);

  try {
    await db.query('SELECT 1');
    console.log('DB warmup tamam');
  } catch (err) {
    console.error('DB warmup başarısız:', err.message);
  }

  setInterval(async () => {
    try {
      await db.query('SELECT 1');
    } catch (err) {
      console.error('DB keepalive başarısız:', err.message);
    }
  }, 5 * 60 * 1000);
});

module.exports = { app, io };
