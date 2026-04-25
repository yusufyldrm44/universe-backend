const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth.middleware');

router.get('/rooms', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT cr.*,
              CASE WHEN cr.user1_id = $1 THEN cr.user2_id ELSE cr.user1_id END AS other_user_id,
              u.full_name AS other_user_name,
              u.avatar_url AS other_user_avatar,
              (SELECT content FROM messages WHERE room_id = cr.id ORDER BY created_at DESC LIMIT 1) AS last_message,
              (SELECT created_at FROM messages WHERE room_id = cr.id ORDER BY created_at DESC LIMIT 1) AS last_message_at
       FROM chat_rooms cr
       JOIN users u ON u.id = (CASE WHEN cr.user1_id = $1 THEN cr.user2_id ELSE cr.user1_id END)
       WHERE cr.user1_id = $1 OR cr.user2_id = $1
       ORDER BY last_message_at DESC NULLS LAST`,
      [req.user.id]
    );
    res.json({ rooms: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

router.post('/rooms', auth, async (req, res) => {
  try {
    const { other_user_id } = req.body;
    if (!other_user_id) {
      return res.status(400).json({ message: 'other_user_id zorunludur' });
    }

    const userId = req.user.id;
    const u1 = Math.min(userId, other_user_id);
    const u2 = Math.max(userId, other_user_id);

    if (u1 === u2) {
      return res.status(400).json({ message: 'Kendinizle konuşamazsınız' });
    }

    const existing = await db.query(
      'SELECT * FROM chat_rooms WHERE user1_id = $1 AND user2_id = $2',
      [u1, u2]
    );

    if (existing.rows.length > 0) {
      return res.json({ room: existing.rows[0] });
    }

    const result = await db.query(
      'INSERT INTO chat_rooms (user1_id, user2_id) VALUES ($1, $2) RETURNING *',
      [u1, u2]
    );
    res.status(201).json({ room: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

router.get('/rooms/:roomId/messages', auth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await db.query(
      'SELECT * FROM chat_rooms WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)',
      [roomId, req.user.id]
    );
    if (room.rows.length === 0) {
      return res.status(403).json({ message: 'Bu odaya erişim yetkiniz yok' });
    }

    const result = await db.query(
      `SELECT m.*, u.full_name AS sender_name, u.avatar_url AS sender_avatar
       FROM messages m JOIN users u ON m.sender_id = u.id
       WHERE m.room_id = $1
       ORDER BY m.created_at ASC`,
      [roomId]
    );
    res.json({ messages: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

router.post('/rooms/:roomId/messages', auth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ message: 'İçerik zorunludur' });
    }

    const room = await db.query(
      'SELECT * FROM chat_rooms WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)',
      [roomId, req.user.id]
    );
    if (room.rows.length === 0) {
      return res.status(403).json({ message: 'Bu odaya erişim yetkiniz yok' });
    }

    const result = await db.query(
      `INSERT INTO messages (room_id, sender_id, content)
       VALUES ($1, $2, $3) RETURNING *`,
      [roomId, req.user.id, content]
    );
    res.status(201).json({ message: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

module.exports = router;
