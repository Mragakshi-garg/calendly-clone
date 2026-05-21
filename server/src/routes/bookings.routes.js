// GET /api/book/:slug/slots?date=2024-06-10

const express = require('express');
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();


router.get('/book/:slug/slots', async (req, res) => {
  const { slug } = req.params;
  const { date } = req.query; // "YYYY-MM-DD"

  const eventType = await prisma.eventType.findUnique({ where: { slug } });
  if (!eventType) return res.status(404).json({ error: 'Event type not found' });

  const dayOfWeek = new Date(date).getDay(); // 0-6
  const availability = await prisma.availability.findFirst({
    where: { userId: eventType.userId, dayOfWeek, isActive: true }
  });

  if (!availability) return res.json({ slots: [] });

  // Generate all slots
  const slots = generateSlots(date, availability.startTime, availability.endTime, eventType.duration);

  // Find existing bookings on this date
  const dayStart = new Date(`${date}T00:00:00`);
  const dayEnd   = new Date(`${date}T23:59:59`);
  const booked = await prisma.meeting.findMany({
    where: {
      eventTypeId: eventType.id,
      status: 'UPCOMING',
      startTime: { gte: dayStart, lte: dayEnd }
    }
  });

  const bookedTimes = booked.map(m => m.startTime.toISOString());

  const available = slots.filter(slot => !bookedTimes.includes(new Date(`${date}T${slot}:00`).toISOString()));

  return res.json({ slots: available });
});

// Helper
function generateSlots(date, startTime, endTime, durationMinutes) {
  const slots = [];
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM]     = endTime.split(':').map(Number);

  let current = startH * 60 + startM;
  const end   = endH * 60 + endM;

  while (current + durationMinutes <= end) {
    const h = String(Math.floor(current / 60)).padStart(2, '0');
    const m = String(current % 60).padStart(2, '0');
    slots.push(`${h}:${m}`);
    current += durationMinutes;
  }
  return slots;
}
module.exports = router;