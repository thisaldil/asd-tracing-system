const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const connectDB = require('./src/db');

// Load environment variables from .env file
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Security and parsing middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' })); // 10mb to allow touch path arrays

// Routes (we will create these files next)
app.use('/api/auth',      require('./src/routes/authRoutes'));
app.use('/api/children',  require('./src/routes/childRoutes'));
app.use('/api/trials',    require('./src/routes/trialRoutes'));
app.use('/api/sessions',  require('./src/routes/sessionRoutes'));
app.use('/api/cognitive', require('./src/routes/cognitiveRoutes'));
app.use('/api/dashboard', require('./src/routes/dashboardRoutes'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'ASD Tracing API is running' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong', details: err.message });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});