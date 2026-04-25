const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const ctrl = require('../controllers/listing.controller');

router.get('/', ctrl.getListings);
router.get('/:id', ctrl.getListingById);
router.post('/', auth, ctrl.createListing);
router.put('/:id', auth, ctrl.updateListing);
router.delete('/:id', auth, ctrl.deleteListing);

module.exports = router;
