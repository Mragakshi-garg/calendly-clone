const prisma = require('../prisma');
const { addMinutes, startOfDay, endOfDay, format } = require('date-fns');

exports.getBookings = async (req, res, next) => {
  try {
    const { status } = req.query;
    const now = new Date();
    
    const where = {};
    if (status === 'upcoming') {
      where.startTime = { gte: now };
    } else if (status === 'past') {
      where.startTime = { lt: now };
    }

    const bookings = await prisma.booking.findMany({
      where,
      orderBy: { startTime: 'asc' },
      include: { eventType: true }
    });

    res.json(bookings);
  } catch (error) {
    next(error);
  }
};

exports.createBooking = async (req, res, next) => {
  try {
    const { eventTypeId, inviteeName, inviteeEmail, startTime } = req.body;

    const eventType = await prisma.eventType.findUnique({ where: { id: eventTypeId } });
    if (!eventType) return res.status(404).json({ error: 'Event type not found' });

    const start = new Date(startTime);
    const end = addMinutes(start, eventType.duration);

    // Conflict check for all bookings belonging to the same user
    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        eventType: { userId: eventType.userId },
        status: 'CONFIRMED',
        OR: [
          { startTime: { lt: end, gte: start } },
          { endTime: { gt: start, lte: end } },
          { startTime: { lte: start }, endTime: { gte: end } }
        ]
      }
    });

    if (conflictingBooking) {
      return res.status(409).json({ error: 'Time slot is not available' });
    }

    const booking = await prisma.booking.create({
      data: {
        eventTypeId,
        inviteeName,
        inviteeEmail,
        startTime: start,
        endTime: end,
        status: 'CONFIRMED'
      }
    });

    res.status(201).json(booking);
  } catch (error) {
    next(error);
  }
};

exports.cancelBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const booking = await prisma.booking.update({
      where: { id },
      data: { status: 'CANCELLED' }
    });
    res.json(booking);
  } catch (error) {
    next(error);
  }
};

exports.getAvailableSlots = async (req, res, next) => {
  try {
    const { slug, date } = req.query;
    if (!slug || !date) return res.status(400).json({ error: 'Missing slug or date' });

    const targetDate = new Date(date);
    if (isNaN(targetDate)) return res.status(400).json({ error: 'Invalid date' });

    const eventType = await prisma.eventType.findUnique({
      where: { slug },
      include: { user: true }
    });
    if (!eventType) return res.status(404).json({ error: 'Event type not found' });

    const dayOfWeek = targetDate.getDay(); // 0 (Sun) to 6 (Sat)
    
    const availability = await prisma.availability.findFirst({
      where: { userId: eventType.userId, dayOfWeek }
    });

    if (!availability) {
      return res.json([]); // No availability on this day
    }

    const [startHour, startMin] = availability.startTime.split(':').map(Number);
    const [endHour, endMin] = availability.endTime.split(':').map(Number);

    const dayStart = startOfDay(targetDate);
    let currentSlot = new Date(dayStart);
    currentSlot.setHours(startHour, startMin, 0, 0);
    
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(endHour, endMin, 0, 0);

    const existingBookings = await prisma.booking.findMany({
      where: {
        eventType: { userId: eventType.userId },
        status: 'CONFIRMED',
        startTime: { gte: startOfDay(targetDate), lt: endOfDay(targetDate) }
      }
    });

    const slots = [];
    const now = new Date();
    
    while (currentSlot.getTime() + eventType.duration * 60000 <= dayEnd.getTime()) {
      const slotEnd = addMinutes(currentSlot, eventType.duration);
      
      const isConflict = existingBookings.some(b => {
        const bStart = new Date(b.startTime).getTime();
        const bEnd = new Date(b.endTime).getTime();
        const curStart = currentSlot.getTime();
        const curEnd = slotEnd.getTime();
        return Math.max(bStart, curStart) < Math.min(bEnd, curEnd);
      });

      if (!isConflict && currentSlot > now) {
        slots.push(format(currentSlot, "HH:mm"));
      }
      
      currentSlot = addMinutes(currentSlot, eventType.duration); // or we could do 15min increments, but let's stick to duration increments
    }

    res.json(slots);
  } catch (error) {
    next(error);
  }
};
