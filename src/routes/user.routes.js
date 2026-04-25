const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth.middleware');

router.get('/me', auth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, full_name, university_email, university, department, avatar_url, bio, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

router.put('/me', auth, async (req, res) => {
  try {
    const { full_name, university, department, bio, avatar_url } = req.body;
    const result = await db.query(
      `UPDATE users
       SET full_name = COALESCE($1, full_name),
           university = COALESCE($2, university),
           department = COALESCE($3, department),
           bio = COALESCE($4, bio),
           avatar_url = COALESCE($5, avatar_url),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING id, full_name, university_email, university, department, avatar_url, bio`,
      [full_name, university, department, bio, avatar_url, req.user.id]
    );
    res.json({ message: 'Profil güncellendi', user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, full_name, university, department, avatar_url, bio, created_at FROM users WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

router.post('/:id/follow', auth, async (req, res) => {
  try {
    const followerId = req.user.id;
    const followingId = parseInt(req.params.id, 10);

    if (followerId === followingId) {
      return res.status(400).json({ message: 'Kendinizi takip edemezsiniz' });
    }

    await db.query(
      'INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [followerId, followingId]
    );
    res.json({ message: 'Takip edildi' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

router.delete('/:id/follow', auth, async (req, res) => {
  try {
    await db.query(
      'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2',
      [req.user.id, req.params.id]
    );
    res.json({ message: 'Takipten çıkıldı' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

module.exports = router;
