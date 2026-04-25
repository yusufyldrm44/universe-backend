const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const EDU_TR_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.edu\.tr$/;

const generateToken = (userId, email) => {
  return jwt.sign(
    { id: userId, email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

exports.register = async (req, res) => {
  try {
    const { full_name, university_email, password, university, department } = req.body;

    if (!full_name || !university_email || !password) {
      return res.status(400).json({ message: 'Ad, e-posta ve şifre zorunludur' });
    }

    if (!EDU_TR_REGEX.test(university_email)) {
      return res.status(400).json({ message: 'Sadece .edu.tr uzantılı üniversite e-postaları kabul edilir' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Şifre en az 6 karakter olmalıdır' });
    }

    const existing = await db.query(
      'SELECT id FROM users WHERE university_email = $1',
      [university_email]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'Bu e-posta zaten kayıtlı' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await db.query(
      `INSERT INTO users (full_name, university_email, password, university, department)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, full_name, university_email, university, department, created_at`,
      [full_name, university_email, hashedPassword, university || null, department || null]
    );

    const user = result.rows[0];
    const token = generateToken(user.id, user.university_email);

    res.status(201).json({
      message: 'Kayıt başarılı',
      token,
      user
    });
  } catch (err) {
    console.error('Register hatası:', err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
};

exports.login = async (req, res) => {
  try {
    const { university_email, password } = req.body;

    if (!university_email || !password) {
      return res.status(400).json({ message: 'E-posta ve şifre zorunludur' });
    }

    if (!EDU_TR_REGEX.test(university_email)) {
      return res.status(400).json({ message: 'Sadece .edu.tr uzantılı üniversite e-postaları kabul edilir' });
    }

    const result = await db.query(
      'SELECT * FROM users WHERE university_email = $1',
      [university_email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'E-posta veya şifre hatalı' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'E-posta veya şifre hatalı' });
    }

    const token = generateToken(user.id, user.university_email);

    delete user.password;

    res.json({
      message: 'Giriş başarılı',
      token,
      user
    });
  } catch (err) {
    console.error('Login hatası:', err);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
};
