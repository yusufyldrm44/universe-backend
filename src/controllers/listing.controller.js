const db = require('../config/db');
const { dbQuery } = require('../utils/dbRetry');

const VALID_TYPES = ['item', 'house', 'roommate', 'job', 'internship'];

exports.createListing = async (req, res) => {
  try {
    const { type, title, description, price, location, city, condition, extra_data, images } = req.body;
    const userId = req.user.id;

    if (!type || !title) {
      return res.status(400).json({ message: 'Tip ve başlık zorunludur' });
    }

    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ message: `Tip şunlardan biri olmalı: ${VALID_TYPES.join(', ')}` });
    }

    const uploadedImages = req.files && req.files.length > 0
      ? req.files.map((f) => f.path.replace(/\\/g, '/'))
      : (images || null);

    let parsedExtraData = null;
    if (extra_data) {
      parsedExtraData = typeof extra_data === 'string' ? JSON.parse(extra_data) : extra_data;
    }

    const result = await dbQuery(
      `INSERT INTO listings
         (user_id, type, title, description, price, location, city, condition, extra_data, images, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
       RETURNING *`,
      [
        userId, type, title,
        description || null,
        price || null,
        location || null,
        city || null,
        condition || null,
        parsedExtraData || null,
        uploadedImages
      ]
    );

    res.status(201).json({
      message: 'İlan oluşturuldu',
      listing: result.rows[0],
      uploadedImages
    });
  } catch (err) {
    console.error('Listing create hatası:', err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
};

exports.getListings = async (req, res) => {
  try {
    const { type, search, city, university } = req.query;

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

    if (search) {
      params.push(`%${search}%`);
      const n = params.length;
      query += ` AND (l.title ILIKE $${n} OR l.description ILIKE $${n})`;
    }

    if (city) {
      params.push(`%${city}%`);
      query += ` AND l.city ILIKE $${params.length}`;
    }

    if (university) {
      params.push(`%${university}%`);
      query += ` AND u.university ILIKE $${params.length}`;
    }

    query += ' ORDER BY l.created_at DESC';

    const result = await dbQuery(query, params);
    res.json({ listings: result.rows });
  } catch (err) {
    console.error('Listing get hatası:', err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
};

exports.getListingById = async (req, res) => {
  try {
    const { id } = req.params;

    await dbQuery(
      'UPDATE listings SET view_count = view_count + 1 WHERE id = $1',
      [id]
    );

    const result = await dbQuery(
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
    const { title, description, price, location, city, condition, extra_data, images, status } = req.body;

    const existing = await dbQuery('SELECT user_id FROM listings WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'İlan bulunamadı' });
    }
    if (existing.rows[0].user_id !== userId) {
      return res.status(403).json({ message: 'Bu ilanı düzenleme yetkiniz yok' });
    }

    let parsedExtraData;
    if (extra_data !== undefined) {
      parsedExtraData = typeof extra_data === 'string' ? JSON.parse(extra_data) : extra_data;
    }

    const result = await dbQuery(
      `UPDATE listings
       SET title       = COALESCE($1, title),
           description = COALESCE($2, description),
           price       = COALESCE($3, price),
           location    = COALESCE($4, location),
           city        = COALESCE($5, city),
           condition   = COALESCE($6, condition),
           extra_data  = COALESCE($7, extra_data),
           images      = COALESCE($8, images),
           status      = COALESCE($9, status),
           updated_at  = CURRENT_TIMESTAMP
       WHERE id = $10
       RETURNING *`,
      [title, description, price, location, city, condition, parsedExtraData ?? null, images, status, id]
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

    const existing = await dbQuery('SELECT user_id FROM listings WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'İlan bulunamadı' });
    }
    if (existing.rows[0].user_id !== userId) {
      return res.status(403).json({ message: 'Bu ilanı silme yetkiniz yok' });
    }

    await dbQuery('DELETE FROM listings WHERE id = $1', [id]);
    res.json({ message: 'İlan silindi' });
  } catch (err) {
    console.error('Listing delete hatası:', err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
};
