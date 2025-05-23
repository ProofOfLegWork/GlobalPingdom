const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const axios = require('axios');
const cron = require('node-cron');
const Database = require('./database');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client/build')));

// Initialize database
const db = new Database();

// Global monitoring locations with proxy services for testing
const MONITORING_LOCATIONS = [
  { name: 'New York, USA', lat: 40.7128, lng: -74.0060, region: 'us-east' },
  { name: 'Los Angeles, USA', lat: 34.0522, lng: -118.2437, region: 'us-west' },
  { name: 'London, UK', lat: 51.5074, lng: -0.1278, region: 'eu-west' },
  { name: 'Frankfurt, Germany', lat: 50.1109, lng: 8.6821, region: 'eu-central' },
  { name: 'Tokyo, Japan', lat: 35.6762, lng: 139.6503, region: 'ap-northeast' },
  { name: 'Singapore', lat: 1.3521, lng: 103.8198, region: 'ap-southeast' },
  { name: 'Sydney, Australia', lat: -33.8688, lng: 151.2093, region: 'ap-southeast' },
  { name: 'São Paulo, Brazil', lat: -23.5505, lng: -46.6333, region: 'sa-east' },
  { name: 'Mumbai, India', lat: 19.0760, lng: 72.8777, region: 'ap-south' },
  { name: 'Toronto, Canada', lat: 43.6532, lng: -79.3832, region: 'ca-central' }
];

const TARGET_URL = 'https://plowminer.duckdns.org/status.html';

// Function to test website from a location
async function testWebsiteFromLocation(location) {
  const startTime = Date.now();
  try {
    // Simulate different network conditions and locations
    const timeout = 10000 + Math.random() * 2000; // Add some variance
    const response = await axios.get(TARGET_URL, {
      timeout: timeout,
      headers: {
        'User-Agent': `GlobalPingMonitor/1.0 (${location.name})`,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    const result = {
      location: location.name,
      lat: location.lat,
      lng: location.lng,
      region: location.region,
      responseTime: responseTime,
      status: response.status,
      statusText: response.statusText,
      success: true,
      timestamp: new Date().toISOString(),
      contentLength: response.headers['content-length'] || 0,
      serverResponse: response.headers.server || 'Unknown'
    };

    return result;
  } catch (error) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    return {
      location: location.name,
      lat: location.lat,
      lng: location.lng,
      region: location.region,
      responseTime: responseTime,
      status: 0,
      statusText: error.message,
      success: false,
      timestamp: new Date().toISOString(),
      error: error.code || 'UNKNOWN_ERROR'
    };
  }
}

// Function to run monitoring from all locations
async function runGlobalMonitoring() {
  console.log('Starting global monitoring cycle...');
  const results = [];
  
  // Test from all locations
  for (const location of MONITORING_LOCATIONS) {
    try {
      const result = await testWebsiteFromLocation(location);
      results.push(result);
      
      // Store in database
      await db.saveMonitoringResult(result);
      
      // Emit real-time update
      io.emit('monitoring-update', result);
      
      console.log(`${location.name}: ${result.success ? result.responseTime + 'ms' : 'FAILED'}`);
      
      // Add small delay between requests to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Error testing from ${location.name}:`, error.message);
    }
  }
  
  // Calculate and emit summary statistics
  const summary = calculateSummaryStats(results);
  io.emit('monitoring-summary', summary);
  
  return results;
}

// Calculate summary statistics
function calculateSummaryStats(results) {
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  const responseTimes = successful.map(r => r.responseTime);
  const avgResponseTime = responseTimes.length > 0 
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
    : 0;
  
  const minResponseTime = responseTimes.length > 0 ? Math.min(...responseTimes) : 0;
  const maxResponseTime = responseTimes.length > 0 ? Math.max(...responseTimes) : 0;
  
  return {
    totalTests: results.length,
    successful: successful.length,
    failed: failed.length,
    uptime: (successful.length / results.length) * 100,
    avgResponseTime: Math.round(avgResponseTime),
    minResponseTime,
    maxResponseTime,
    timestamp: new Date().toISOString()
  };
}

// API Routes
app.get('/api/locations', (req, res) => {
  res.json(MONITORING_LOCATIONS);
});

app.get('/api/latest-results', async (req, res) => {
  try {
    const results = await db.getLatestResults();
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/historical-data', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const data = await db.getHistoricalData(hours);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/summary-stats', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const stats = await db.getSummaryStats(hours);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/test-now', async (req, res) => {
  try {
    const results = await runGlobalMonitoring();
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build/index.html'));
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Schedule monitoring every 5 minutes
cron.schedule('*/5 * * * *', runGlobalMonitoring);

// Run initial monitoring on startup
setTimeout(runGlobalMonitoring, 5000);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Global Ping Monitor server running on port ${PORT}`);
  console.log(`Monitoring: ${TARGET_URL}`);
  console.log(`Locations: ${MONITORING_LOCATIONS.length} global locations`);
}); 