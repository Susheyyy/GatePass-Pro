const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/db');
const residentRoutes = require('./routes/residentRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

app.use(cors());
app.use(express.json()); 


app.use('/api/residents', residentRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: "GatePass Pro Backend API Online" });
});

app.listen(PORT, () => {
  console.log(`Server running successfully on port ${PORT}`);
});