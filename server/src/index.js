
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const eventTypesRoutes = require('./routes/eventTypes.routes');
const availabilityRoutes = require('./routes/availability.routes');
const bookingsRoutes = require('./routes/bookings.routes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(cors({
  origin: "*",
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/event-types', eventTypesRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/bookings', bookingsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
