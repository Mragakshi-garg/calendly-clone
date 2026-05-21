const prisma = require('../prisma');

async function getDefaultUserId() {
  const user = await prisma.user.findFirst();
  if (!user) throw new Error('No default user found');
  return user.id;
}

exports.getAvailability = async (req, res, next) => {
  try {
    const userId = await getDefaultUserId();
    const availability = await prisma.availability.findMany({
      where: { userId },
      orderBy: { dayOfWeek: 'asc' }
    });
    res.json(availability);
  } catch (error) {
    next(error);
  }
};

exports.updateAvailability = async (req, res, next) => {
  try {
    const userId = await getDefaultUserId();
    const { availability } = req.body; 

    if (!Array.isArray(availability)) {
      return res.status(400).json({ error: 'Availability must be an array' });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.availability.deleteMany({ where: { userId } });
      
      const newSlots = await Promise.all(
        availability.map(slot => 
          tx.availability.create({
            data: {
              userId,
              dayOfWeek: slot.dayOfWeek,
              startTime: slot.startTime,
              endTime: slot.endTime
            }
          })
        )
      );
      
      return newSlots;
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};
