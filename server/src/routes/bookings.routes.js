const express = require('express');
const router = express.Router();
const bookingsController = require('../controllers/bookings.controller');

router.get('/', bookingsController.getBookings);
router.post('/', bookingsController.createBooking);
router.patch('/:id/cancel', bookingsController.cancelBooking);
router.get('/slots', bookingsController.getAvailableSlots);

module.exports = router;