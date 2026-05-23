const prisma = require('../prisma');

// Helper to get default user for MVP
async function getDefaultUserId() {
  const user = await prisma.user.findFirst();
  if (!user) throw new Error('No default user found');
  return user.id;
}

exports.getAllEventTypes = async (req, res, next) => {
  try {
    const eventTypes = await prisma.eventType.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(eventTypes);
  } catch (error) {
    next(error);
  }
};

exports.getEventTypeBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const eventType = await prisma.eventType.findUnique({
      where: { slug },
      include: {
        user: {
          select: { name: true, email: true, timezone: true }
        }
      }
    });
    if (!eventType) return res.status(404).json({ error: 'Event type not found' });
    res.json(eventType);
  } catch (error) {
    next(error);
  }
};

exports.createEventType = async (req, res, next) => {
  try {
    const { name, duration, slug, description, isActive } = req.body;
    const userId = await getDefaultUserId();

    const eventType = await prisma.eventType.create({
      data: {
        userId,
        name,
        duration,
        slug,
        description,
        isActive
      }
    });
    res.status(201).json(eventType);
  } catch (error) {
    next(error);
  }
};

exports.updateEventType = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const data = req.body;
    const eventType = await prisma.eventType.update({
      where: { id },
      data
    });
    res.json(eventType);
  } catch (error) {
    next(error);
  }
};

exports.deleteEventType = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.eventType.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};
