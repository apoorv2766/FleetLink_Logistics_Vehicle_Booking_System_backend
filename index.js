// src/server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const { connectDB } = require('./src/db');
const vehiclesRouter = require('./controllers/vehicles');
const bookingsRouter = require('./controllers/bookings');

const app = express();
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.use('/api/vehicles', vehiclesRouter);
app.use('/api/bookings', bookingsRouter);


app.use((err, req, res, next) => {
  console.error(err);
  return res.status(500).json({ message: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 4000;

if (require.main === module) {
  (async () => {
    try {
      await connectDB();
      app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    } catch (err) {
      console.error('Failed to start server', err);
    }
  })();
}

module.exports = app; // export for tests
