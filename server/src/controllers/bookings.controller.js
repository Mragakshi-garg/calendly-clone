// ============================================================
// FILE: server/src/controllers/bookings.controller.js
// 
// Only the createBooking function changed — added validateEmail
// call before any DB work. Everything else is identical.
// ============================================================

const prisma  = require('../prisma');
const { addMinutes, startOfDay, endOfDay, format } = require('date-fns');
const { sendBookingConfirmation } = require('../utils/email');   // your existing email util
const { validateEmail }           = require('../utils/email.validation'); // the new file

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

    const bookings = await prisma.meeting.findMany({
      where,
      orderBy: { startTime: 'asc' },
      include: { eventType: true },
    });

    res.json(bookings);
  } catch (error) {
    next(error);
  }
};

exports.createBooking = async (req, res, next) => {
  try {
    const { eventTypeId, inviteeName, inviteeEmail, startTime } = req.body;

    // ── Basic presence checks ──────────────────────────────
    if (!inviteeName?.trim())
      return res.status(400).json({ error: 'Your name is required.' });
    if (!inviteeEmail?.trim())
      return res.status(400).json({ error: 'Your email is required.' });

    // ── 4-layer email validation (format + domain + SMTP probe) ──
    const emailCheck = await validateEmail(inviteeEmail);
    if (!emailCheck.valid) {
      return res.status(400).json({ error: emailCheck.reason });
    }
    // Use the cleaned (trimmed + lowercased) email from here on
    const cleanEmail = emailCheck.email;

    if (!startTime)
      return res.status(400).json({ error: 'Start time is required.' });

    const start = new Date(startTime);
    if (isNaN(start.getTime()))
      return res.status(400).json({ error: 'Invalid start time.' });

    if (start < new Date())
      return res.status(400).json({ error: 'Cannot book a slot in the past.' });

    // ── Look up event type ─────────────────────────────────
    const eventType = await prisma.eventType.findUnique({
      where: { id: eventTypeId },
      include: { user: true },
    });
    if (!eventType)
      return res.status(404).json({ error: 'Event type not found.' });
    if (!eventType.isActive)
      return res.status(400).json({ error: 'This event type is no longer active.' });

    const end = addMinutes(start, eventType.duration);

    // ── Double-booking conflict check ──────────────────────
    const conflict = await prisma.meeting.findFirst({
      where: {
        eventType: { userId: eventType.userId },
        status: 'UPCOMING',
        OR: [
          { startTime: { lt: end,   gte: start } },
          { endTime:   { gt: start, lte: end   } },
          { startTime: { lte: start }, endTime: { gte: end } },
        ],
      },
    });

    if (conflict) {
      return res.status(409).json({
        error: 'This time slot is already booked. Please choose another time.',
      });
    }

    // ── Create booking ─────────────────────────────────────
    const booking = await prisma.meeting.create({
      data: {
        userId:       eventType.userId,
        eventTypeId,
        inviteeName:  inviteeName.trim(),
        inviteeEmail: cleanEmail,          // ← use validated+cleaned email
        startTime:    start,
        endTime:      end,
        status:       'UPCOMING',
      },
      include: {
        eventType: { include: { user: { select: { name: true, email: true } } } },
      },
    });

    // ── Send confirmation email (non-blocking) ─────────────
    sendBookingConfirmation({
      inviteeName:  inviteeName.trim(),
      inviteeEmail: cleanEmail,
      eventName:    eventType.name,
      hostName:     eventType.user?.name || 'Host',
      startTime:    format(start, 'hh:mm a'),
      endTime:      format(end,   'hh:mm a'),
      date:         format(start, 'EEEE, MMMM d, yyyy'),
      meetingLink:  null,
    }).catch((err) => console.error('Email error (non-fatal):', err.message));

    res.status(201).json(booking);
  } catch (error) {
    next(error);
  }
};

exports.cancelBooking = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id))
      return res.status(400).json({ error: 'Invalid booking id.' });

    const existing = await prisma.meeting.findUnique({ where: { id } });
    if (!existing)
      return res.status(404).json({ error: 'Booking not found.' });
    if (existing.status === 'CANCELLED')
      return res.status(400).json({ error: 'Booking is already cancelled.' });

    const booking = await prisma.meeting.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: { eventType: true },
    });
    res.json(booking);
  } catch (error) {
    next(error);
  }
};

exports.getAvailableSlots = async (req, res, next) => {
  try {
    const { slug, date } = req.query;
    if (!slug || !date)
      return res.status(400).json({ error: 'Missing slug or date.' });

    const targetDate = new Date(date);
    if (isNaN(targetDate))
      return res.status(400).json({ error: 'Invalid date' });

    const eventType = await prisma.eventType.findUnique({
      where: { slug },
      include: { user: true },
    });
    if (!eventType) return res.status(404).json({ error: 'Event type not found' });

    const dayOfWeek = targetDate.getDay();
    const availability = await prisma.availability.findFirst({
      where: { userId: eventType.userId, dayOfWeek },
    });
    if (!availability) return res.json([]);

    const [startHour, startMin] = availability.startTime.split(':').map(Number);
    const [endHour, endMin]     = availability.endTime.split(':').map(Number);

    const dayStart = startOfDay(targetDate);
    let cursor = new Date(dayStart);
    cursor.setHours(startHour, startMin, 0, 0);

    const dayEnd = new Date(dayStart);
    dayEnd.setHours(endHour, endMin, 0, 0);

    const existingBookings = await prisma.meeting.findMany({
      where: {
        userId: eventType.userId,
        status: 'UPCOMING',
        startTime: {
          gte: startOfDay(targetDate),
          lt:  endOfDay(targetDate),
        },
      },
    });

    const slots = [];
    const now = new Date();

    while (cursor.getTime() + eventType.duration * 60000 <= dayEnd.getTime()) {
      const slotEnd = addMinutes(cursor, eventType.duration);

      const isConflict = existingBookings.some((b) => {
        const bS = new Date(b.startTime).getTime();
        const bE = new Date(b.endTime).getTime();
        const sS = cursor.getTime();
        const sE = slotEnd.getTime();
        return Math.max(bS, sS) < Math.min(bE, sE);
      });

      if (!isConflict && cursor > now) {
        slots.push(format(cursor, 'HH:mm'));
      }

      cursor = addMinutes(cursor, eventType.duration);
    }

    res.json(slots);
  } catch (error) {
    next(error);
  }
};
