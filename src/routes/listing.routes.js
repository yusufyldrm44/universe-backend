const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const auth = require('../middleware/auth.middleware');
const ctrl = require('../controllers/listing.controller');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `listing-${unique}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Sadece resim dosyaları yüklenebilir'), false);
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/', ctrl.getListings);
router.get('/:id', ctrl.getListingById);
router.post('/', auth, upload.array('images', 8), ctrl.createListing);
router.put('/:id', auth, ctrl.updateListing);
router.delete('/:id', auth, ctrl.deleteListing);

module.exports = router;
