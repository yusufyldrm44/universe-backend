const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth.middleware');

router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT e.*, u.full_name, u.avatar_url,
              (SELECT COUNT(*) FROM event_participants WHERE event_id = e.id) AS participant_count
       FROM events e
       JOIN users u ON e.user_id = u.id
       ORDER BY e.event_date ASC`
    );
    res.json({ events: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT e.*, u.full_name, u.avatar_url
       FROM events e
       JOIN users u ON e.user_id = u.id
       WHERE e.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Etkinlik bulunamadı' });
    }
    res.json({ event: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { title, description, location, event_date, capacity, image_url } = req.body;

    if (!title || !event_date) {
      return res.status(400).json({ message: 'Başlık ve tarih zorunludur' });
    }

    const result = await db.query(
      `INSERT INTO events (user_id, title, description, location, event_date, capacity, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.user.id, title, description || null, location || null, event_date, capacity || null, image_url || null]
    );
    res.status(201).json({ message: 'Etkinlik oluşturuldu', event: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

router.post('/:id/join', auth, async (req, res) => {
  try {
    await db.query(
      'INSERT INTO event_participants (event_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Etkinliğe katıldınız' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

router.delete('/:id/join', auth, async (req, res) => {
  try {
    await db.query(
      'DELETE FROM event_participants WHERE event_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Etkinlikten ayrıldınız' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const existing = await db.query('SELECT user_id FROM events WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Etkinlik bulunamadı' });
    }
    if (existing.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ message: 'Yetkiniz yok' });
    }
    await db.query('DELETE FROM events WHERE id = $1', [req.params.id]);
    res.json({ message: 'Etkinlik silindi' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

module.exports = router;
