const router = require('express').Router();
const auth = require('../middleware/auth.middleware');
const admin = require('../middleware/admin.middleware');
const { dbQuery } = require('../utils/dbRetry');

router.get('/listings/pending', auth, admin, async (req, res) => {
  try {
    const result = await dbQuery(
      `SELECT l.*, u.full_name, u.university_email, u.university
       FROM listings l
       JOIN users u ON l.user_id = u.id
       WHERE l.status = 'pending'
       ORDER BY l.created_at DESC`
    );
    res.json({ listings: result.rows });
  } catch (err) {
    console.error('Admin listings/pending hatası:', err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

router.put('/listings/:id/approve', auth, admin, async (req, res) => {
  try {
    await dbQuery("UPDATE listings SET status = 'active' WHERE id = $1", [req.params.id]);
    res.json({ message: 'İlan onaylandı.' });
  } catch (err) {
    console.error('Admin listings/approve hatası:', err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

router.put('/listings/:id/reject', auth, admin, async (req, res) => {
  try {
    await dbQuery("UPDATE listings SET status = 'rejected' WHERE id = $1", [req.params.id]);
    res.json({ message: 'İlan reddedildi.' });
  } catch (err) {
    console.error('Admin listings/reject hatası:', err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

router.get('/events/pending', auth, admin, async (req, res) => {
  try {
    const result = await dbQuery(
      `SELECT e.*, u.full_name, u.university_email, u.university
       FROM events e
       JOIN users u ON e.user_id = u.id
       WHERE e.status = 'pending'
       ORDER BY e.created_at DESC`
    );
    res.json({ events: result.rows });
  } catch (err) {
    console.error('Admin events/pending hatası:', err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

router.put('/events/:id/approve', auth, admin, async (req, res) => {
  try {
    await dbQuery("UPDATE events SET status = 'active' WHERE id = $1", [req.params.id]);
    res.json({ message: 'Etkinlik onaylandı.' });
  } catch (err) {
    console.error('Admin events/approve hatası:', err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

router.put('/events/:id/reject', auth, admin, async (req, res) => {
  try {
    await dbQuery("UPDATE events SET status = 'rejected' WHERE id = $1", [req.params.id]);
    res.json({ message: 'Etkinlik reddedildi.' });
  } catch (err) {
    console.error('Admin events/reject hatası:', err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

router.put('/users/:id/make-admin', auth, admin, async (req, res) => {
  try {
    await dbQuery("UPDATE users SET role = 'admin' WHERE id = $1", [req.params.id]);
    res.json({ message: 'Kullanıcı admin yapıldı.' });
  } catch (err) {
    console.error('Admin make-admin hatası:', err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

router.get('/users', auth, admin, async (req, res) => {
  try {
    const result = await dbQuery(
      'SELECT id, full_name, university_email, university, role, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({ users: result.rows });
  } catch (err) {
    console.error('Admin users hatası:', err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

module.exports = router;
