# Schedulr – Calendly Clone

A fullstack Calendly clone built with **Next.js** (App Router), **Tailwind CSS**, **Node.js/Express**, and **PostgreSQL** (via Prisma ORM).

## Project Structure

```
/client   → Next.js frontend (port 3001)
/server   → Express backend  (port 5000)
  /prisma → Prisma schema & seed data
  /src    → Routes, controllers, middlewares
```

## Quick Start

### 1. Clone & Install

```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 2. Database Setup

1. Install PostgreSQL and create a new database.
2. Update `/server/.env` with your connection string:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/your_database?schema=public"
   PORT=5000
   ```
3. Generate the Prisma client and run migrations:
   ```bash
   cd server
   npx prisma generate
   npx prisma migrate dev --name init
   ```
4. Seed the database with sample data:
   ```bash
   npx prisma db seed
   ```

### 3. Environment Variables

**Client** (`/client/.env`):
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

**Server** (`/server/.env`):
```env
DATABASE_URL="postgresql://username:password@localhost:5432/your_database?schema=public"
PORT=5000
```

### 4. Run

```bash
# Terminal 1 – Backend
cd server
npm run dev        # runs on http://localhost:5000

# Terminal 2 – Frontend
cd client
npm run dev -- -p 3001   # runs on http://localhost:3001
```

Open **http://localhost:3001** → you'll be redirected to the Event Types dashboard.

## Features

- **Event Types CRUD** – Create, edit, delete event types with auto-generated slugs
- **Availability Management** – Set weekly working hours (Mon–Fri)
- **Public Booking Page** – Shareable `/book/:slug` pages with calendar & time slot picker
- **Conflict Detection** – Backend prevents double-bookings
- **Google Calendar Integration** – "Add to Google Calendar" link on confirmation
- **Toast Notifications** – Real-time success/error feedback via react-hot-toast
- **Responsive Design** – Mobile hamburger menu, adaptive layouts
- **Seed Data** – Pre-populated with 3 event types, availability, and 5 sample bookings
