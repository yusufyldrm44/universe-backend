const db = require('../config/db');

const VALID_TYPES = ['item', 'house', 'roommate', 'job'];

exports.createListing = async (req, res) => {
  try {
    const { type, title, description, price, location, images } = req.body;
    const userId = req.user.id;

    if (!type || !title) {
      return res.status(400).json({ message: 'Tip ve başlık zorunludur' });
    }

    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ message: `Tip şunlardan biri olmalı: ${VALID_TYPES.join(', ')}` });
    }

    const result = await db.query(
      `INSERT INTO listings (user_id, type, title, description, price, location, images)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, type, title, description || null, price || null, location || null, images || null]
    );

    res.status(201).json({ message: 'İlan oluşturuldu', listing: result.rows[0] });
  } catch (err) {
    console.error('Listing create hatası:', err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
};

exports.getListings = async (req, res) => {
  try {
    const { type, location } = req.query;
    let query = `
      SELECT l.*, u.full_name, u.university, u.avatar_url
      FROM listings l
      JOIN users u ON l.user_id = u.id
      WHERE l.status = 'active'
    `;
    const params = [];

    if (type) {
      params.push(type);
      query += ` AND l.type = $${params.length}`;
    }
    if (location) {
      params.push(`%${location}%`);
      query += ` AND l.location ILIKE $${params.length}`;
    }

    query += ' ORDER BY l.created_at DESC';

    const result = await db.query(query, params);
    res.json({ listings: result.rows });
  } catch (err) {
    console.error('Listing get hatası:', err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
};

exports.getListingById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT l.*, u.full_name, u.university, u.avatar_url
       FROM listings l
       JOIN users u ON l.user_id = u.id
       WHERE l.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'İlan bulunamadı' });
    }

    res.json({ listing: result.rows[0] });
  } catch (err) {
    console.error('Listing getById hatası:', err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
};

exports.updateListing = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { title, description, price, location, images, status } = req.body;

    const existing = await db.query('SELECT user_id FROM listings WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'İlan bulunamadı' });
    }
    if (existing.rows[0].user_id !== userId) {
      return res.status(403).json({ message: 'Bu ilanı düzenleme yetkiniz yok' });
    }

    const result = await db.query(
      `UPDATE listings
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           price = COALESCE($3, price),
           location = COALESCE($4, location),
           images = COALESCE($5, images),
           status = COALESCE($6, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [title, description, price, location, images, status, id]
    );

    res.json({ message: 'İlan güncellendi', listing: result.rows[0] });
  } catch (err) {
    console.error('Listing update hatası:', err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
};

exports.deleteListing = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const existing = await db.query('SELECT user_id FROM listings WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'İlan bulunamadı' });
    }
    if (existing.rows[0].user_id !== userId) {
      return res.status(403).json({ message: 'Bu ilanı silme yetkiniz yok' });
    }

    await db.query('DELETE FROM listings WHERE id = $1', [id]);
    res.json({ message: 'İlan silindi' });
  } catch (err) {
    console.error('Listing delete hatası:', err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
};
