const express = require('express');
const router = express.Router();
const availabilityController = require('../controllers/availability.controller');

router.get('/', availabilityController.getAvailability);
router.put('/', availabilityController.updateAvailability);

module.exports = router;
