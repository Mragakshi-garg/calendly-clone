const express = require('express');
const router = express.Router();
const eventTypesController = require('../controllers/eventTypes.controller');

router.get('/', eventTypesController.getAllEventTypes);
router.post('/', eventTypesController.createEventType);
router.put('/:id', eventTypesController.updateEventType);
router.delete('/:id', eventTypesController.deleteEventType);
router.get('/:slug', eventTypesController.getEventTypeBySlug);

module.exports = router;
