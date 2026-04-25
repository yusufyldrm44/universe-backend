const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth.middleware');

router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    let query = `
      SELECT n.*, u.full_name, u.avatar_url
      FROM news n
      LEFT JOIN users u ON n.user_id = u.id
    `;
    const params = [];
    if (category) {
      params.push(category);
      query += ` WHERE n.category = $${params.length}`;
    }
    query += ' ORDER BY n.created_at DESC';

    const result = await db.query(query, params);
    res.json({ news: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT n.*, u.full_name, u.avatar_url
       FROM news n LEFT JOIN users u ON n.user_id = u.id
       WHERE n.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Haber bulunamadı' });
    }
    res.json({ news: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { title, content, category, image_url } = req.body;
    if (!title || !content) {
      return res.status(400).json({ message: 'Başlık ve içerik zorunludur' });
    }
    const result = await db.query(
      `INSERT INTO news (user_id, title, content, category, image_url)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.id, title, content, category || null, image_url || null]
    );
    res.status(201).json({ message: 'Haber oluşturuldu', news: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

module.exports = router;
