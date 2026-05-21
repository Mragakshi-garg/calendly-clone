import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1 default user
  const user = await prisma.user.create({
    data: {
      name: 'John Doe',
      email: 'john.doe@example.com',
      timezone: 'America/New_York',
    },
  });

  // 3 event types
  const event15 = await prisma.eventType.create({
    data: {
      userId: user.id,
      name: '15 Min Meeting',
      duration: 15,
      slug: '15-min-meeting',
      description: 'Quick catch up',
      isActive: true,
    },
  });

  const event30 = await prisma.eventType.create({
    data: {
      userId: user.id,
      name: '30 Min Meeting',
      duration: 30,
      slug: '30-min-meeting',
      description: 'Standard meeting',
      isActive: true,
    },
  });

  const event60 = await prisma.eventType.create({
    data: {
      userId: user.id,
      name: '60 Min Meeting',
      duration: 60,
      slug: '60-min-meeting',
      description: 'Deep dive discussion',
      isActive: true,
    },
  });

  // Availability for Monday–Friday 9AM–5PM (1 to 5)
  for (let i = 1; i <= 5; i++) {
    await prisma.availability.create({
      data: {
        userId: user.id,
        dayOfWeek: i,
        startTime: '09:00',
        endTime: '17:00',
      },
    });
  }

  // 3 sample upcoming bookings
  const now = new Date();
  
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  await prisma.meeting.create({
    data: {
      userId: user.id,
      eventTypeId: event15.id,
      inviteeName: 'Alice Smith',
      inviteeEmail: 'alice@example.com',
      startTime: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 10, 0, 0),
      endTime: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 10, 15, 0),
      status: 'UPCOMING',
    },
  });

  await prisma.meeting.create({
    data: {
      userId: user.id,
      eventTypeId: event30.id,
      inviteeName: 'Bob Johnson',
      inviteeEmail: 'bob@example.com',
      startTime: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 11, 0, 0),
      endTime: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 11, 30, 0),
      status: 'UPCOMING',
    },
  });

  const dayAfter = new Date(now);
  dayAfter.setDate(dayAfter.getDate() + 2);

  await prisma.meeting.create({
    data: {
      userId: user.id,
      eventTypeId: event60.id,
      inviteeName: 'Charlie Brown',
      inviteeEmail: 'charlie@example.com',
      startTime: new Date(dayAfter.getFullYear(), dayAfter.getMonth(), dayAfter.getDate(), 14, 0, 0),
      endTime: new Date(dayAfter.getFullYear(), dayAfter.getMonth(), dayAfter.getDate(), 15, 0, 0),
      status: 'UPCOMING',
    },
  });

  // 2 past bookings
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  await prisma.meeting.create({
    data: {
      userId: user.id,
      eventTypeId: event15.id,
      inviteeName: 'Diana Prince',
      inviteeEmail: 'diana@example.com',
      startTime: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 9, 0, 0),
      endTime: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 9, 15, 0),
      status: 'UPCOMING',
    },
  });

  await prisma.meeting.create({
    data: {
      userId: user.id,
      eventTypeId: event30.id,
      inviteeName: 'Eve Adams',
      inviteeEmail: 'eve@example.com',
      startTime: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 16, 0, 0),
      endTime: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 16, 30, 0),
      status: 'UPCOMING',
    },
  });

  console.log('Seed data inserted successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
