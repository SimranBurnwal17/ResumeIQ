require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const scanRoutes = require('./routes/scans');

const app = express();

app.use(cors({
  origin: ['http://localhost:3000', process.env.CLIENT_URL].filter(Boolean),
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/scans', scanRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error('ERROR: MONGODB_URI not set in .env file');
  process.exit(1);
}

mongoose
  .connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    connectTimeoutMS: 10000,
    serverSelectionTimeoutMS: 10000,
  })
  .then(() => {
    console.log('MongoDB connected successfully');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    console.error('Connection URI:', mongoUri.replace(/:[^:@]+@/, ':***@'));
    process.exit(1);
  });

module.exports = app;