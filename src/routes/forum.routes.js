const router = require('express').Router();
const path = require('path');
const multer = require('multer');
const auth = require('../middleware/auth.middleware');
const { dbQuery } = require('../utils/dbRetry');

const storage = multer.diskStorage({
  destination: 'uploads/forum/',
  filename: (req, file, cb) => {
    cb(null, `forum-${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Desteklenmeyen dosya türü'));
  }
});

router.get('/topics', auth, async (req, res) => {
  try {
    const { category } = req.query;
    const where = category ? 'WHERE t.category = $1' : '';
    const params = category ? [category] : [];

    const result = await dbQuery(`
      SELECT t.*,
        u.full_name, u.university, u.avatar_url,
        COUNT(DISTINCT r.id) AS reply_count,
        COUNT(DISTINCT l.user_id) AS like_count,
        EXISTS(
          SELECT 1 FROM forum_likes
          WHERE topic_id = t.id AND user_id = $${params.length + 1}
        ) AS is_liked
      FROM forum_topics t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN forum_replies r ON r.topic_id = t.id
      LEFT JOIN forum_likes l ON l.topic_id = t.id
      ${where}
      GROUP BY t.id, u.full_name, u.university, u.avatar_url
      ORDER BY t.is_pinned DESC, t.created_at DESC
    `, [...params, req.user.id]);

    res.json({ topics: result.rows });
  } catch (err) {
    console.error('Forum topics hatası:', err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

router.get('/topics/:id', auth, async (req, res) => {
  try {
    await dbQuery(
      'UPDATE forum_topics SET view_count = view_count + 1 WHERE id = $1',
      [req.params.id]
    );

    const topic = await dbQuery(`
      SELECT t.*, u.full_name, u.university, u.avatar_url,
        COUNT(DISTINCT l.user_id) AS like_count,
        EXISTS(
          SELECT 1 FROM forum_likes
          WHERE topic_id = t.id AND user_id = $2
        ) AS is_liked
      FROM forum_topics t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN forum_likes l ON l.topic_id = t.id
      WHERE t.id = $1
      GROUP BY t.id, u.full_name, u.university, u.avatar_url
    `, [req.params.id, req.user.id]);

    if (!topic.rows.length) {
      return res.status(404).json({ message: 'Konu bulunamadı.' });
    }

    const replies = await dbQuery(`
      SELECT r.*, u.full_name, u.university, u.avatar_url
      FROM forum_replies r
      JOIN users u ON r.user_id = u.id
      WHERE r.topic_id = $1
      ORDER BY r.created_at ASC
    `, [req.params.id]);

    res.json({ topic: topic.rows[0], replies: replies.rows });
  } catch (err) {
    console.error('Forum topic detay hatası:', err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

router.post('/topics', auth, upload.array('attachments', 5), async (req, res) => {
  try {
    const { category, title, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ message: 'Başlık ve içerik zorunludur.' });
    }

    const attachments = req.files?.map(f => ({
      name: f.originalname,
      path: f.path.replace(/\\/g, '/'),
      mimetype: f.mimetype,
      size: f.size
    })) || [];

    const result = await dbQuery(`
      INSERT INTO forum_topics (user_id, category, title, content, attachments)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [req.user.id, category || 'genel', title, content, JSON.stringify(attachments)]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Forum topic oluşturma hatası:', err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

router.post('/topics/:id/reply', auth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ message: 'Yorum boş olamaz.' });
    }

    const result = await dbQuery(`
      INSERT INTO forum_replies (topic_id, user_id, content)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [req.params.id, req.user.id, content]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Forum reply hatası:', err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

router.post('/topics/:id/like', auth, async (req, res) => {
  try {
    const existing = await dbQuery(
      'SELECT 1 FROM forum_likes WHERE user_id = $1 AND topic_id = $2',
      [req.user.id, req.params.id]
    );

    if (existing.rows.length) {
      await dbQuery(
        'DELETE FROM forum_likes WHERE user_id = $1 AND topic_id = $2',
        [req.user.id, req.params.id]
      );
      res.json({ liked: false });
    } else {
      await dbQuery(
        'INSERT INTO forum_likes (user_id, topic_id) VALUES ($1, $2)',
        [req.user.id, req.params.id]
      );
      res.json({ liked: true });
    }
  } catch (err) {
    console.error('Forum like hatası:', err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

router.delete('/topics/:id', auth, async (req, res) => {
  try {
    const topic = await dbQuery(
      'SELECT user_id FROM forum_topics WHERE id = $1',
      [req.params.id]
    );

    if (!topic.rows.length) {
      return res.status(404).json({ message: 'Konu bulunamadı.' });
    }

    const isOwner = topic.rows[0].user_id === req.user.id;

    const userResult = await dbQuery(
      'SELECT role FROM users WHERE id = $1',
      [req.user.id]
    );
    const isAdmin = userResult.rows[0]?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Yetki yok.' });
    }

    await dbQuery('DELETE FROM forum_topics WHERE id = $1', [req.params.id]);
    res.json({ message: 'Konu silindi.' });
  } catch (err) {
    console.error('Forum topic silme hatası:', err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

module.exports = router;
