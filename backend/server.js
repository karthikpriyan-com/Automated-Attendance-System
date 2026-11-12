// Automated Attendance System - API server
const express = require('express');
const cors = require('cors');
const path = require('path');
require('./db'); // creates tables and demo data

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' })); // room for face images in base64

app.use('/api/auth', require('./routes/auth'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api', require('./routes/admin'));
app.use('/api', require('./routes/attendance'));

// Optional: serve the frontend folder from the same server (../frontend)
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.use('/api', (req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
