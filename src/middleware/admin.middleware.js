const { dbQuery } = require('../utils/dbRetry');

module.exports = async (req, res, next) => {
  try {
    const result = await dbQuery(
      'SELECT role FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!result.rows.length || result.rows[0].role !== 'admin') {
      return res.status(403).json({ message: 'Bu işlem için admin yetkisi gerekiyor.' });
    }
    next();
  } catch (err) {
    console.error('Admin middleware hatası:', err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
};
