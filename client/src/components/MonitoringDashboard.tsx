import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { format } from 'date-fns';
import { Paper, Grid, Typography, Box, Alert } from '@mui/material';
import io from 'socket.io-client';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix Leaflet's default icon issue
let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface Location {
  name: string;
  lat: number;
  lng: number;
  responseTime: number;
  success: boolean;
}

interface Stats {
  responseTime: {
    avg: number;
    median: number;
    p95: number;
    p99: number;
    min: number;
    max: number;
  };
  uptime: number;
  outages: Array<{
    location: string;
    timestamp: string;
    error: string;
  }>;
}

const MonitoringDashboard: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let socket: any;
    
    try {
      socket = io('http://localhost:5511');

      socket.on('connect_error', (err: Error) => {
        setError(`Connection error: ${err.message}`);
      });

      // Connect to WebSocket for real-time updates
      socket.on('monitoring-update', (result: any) => {
        setLocations(prev => {
          const updated = prev.filter(loc => loc.name !== result.location);
          return [...updated, result];
        });
      });

      socket.on('monitoring-summary', (summary: Stats) => {
        setStats(summary);
      });

      // Fetch initial data
      const fetchData = async () => {
        try {
          const [locationsRes, statsRes, historyRes] = await Promise.all([
            fetch('http://localhost:5511/api/latest-results'),
            fetch('http://localhost:5511/api/summary-stats'),
            fetch('http://localhost:5511/api/historical-data')
          ]);

          if (!locationsRes.ok || !statsRes.ok || !historyRes.ok) {
            throw new Error('One or more API requests failed');
          }

          const locationsData = await locationsRes.json();
          const statsData = await statsRes.json();
          const historyData = await historyRes.json();

          setLocations(locationsData);
          setStats(statsData);
          setHistoricalData(historyData);
          setError(null);
        } catch (error) {
          console.error('Error fetching data:', error);
          setError(`Failed to fetch data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      };

      fetchData();
    } catch (error) {
      console.error('Error setting up WebSocket:', error);
      setError(`WebSocket setup error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  const getMarkerColor = (success: boolean, responseTime: number) => {
    if (!success) return '#ff0000';
    if (responseTime > 1000) return '#ffa500';
    return '#00ff00';
  };

  return (
    <Box sx={{ p: 3 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Grid container spacing={3}>
        {/* World Map */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, height: '500px' }}>
            <Typography variant="h6" gutterBottom>
              Global Monitoring Map
            </Typography>
            <MapContainer
              center={[20, 0]}
              zoom={2}
              style={{ height: 'calc(100% - 40px)', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              {locations.map((location) => (
                <CircleMarker
                  key={location.name}
                  center={[location.lat, location.lng]}
                  radius={10}
                  fillColor={getMarkerColor(location.success, location.responseTime)}
                  color="#000"
                  weight={1}
                  fillOpacity={0.7}
                >
                  <Popup>
                    <div>
                      <strong>{location.name}</strong>
                      <br />
                      Status: {location.success ? 'Online' : 'Offline'}
                      <br />
                      Response Time: {location.responseTime}ms
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </Paper>
        </Grid>

        {/* Statistics */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Response Time Statistics
            </Typography>
            {stats && (
              <Box>
                <Typography>Average: {stats.responseTime.avg}ms</Typography>
                <Typography>Median: {stats.responseTime.median}ms</Typography>
                <Typography>95th Percentile: {stats.responseTime.p95}ms</Typography>
                <Typography>99th Percentile: {stats.responseTime.p99}ms</Typography>
                <Typography>Min: {stats.responseTime.min}ms</Typography>
                <Typography>Max: {stats.responseTime.max}ms</Typography>
                <Typography>Uptime: {stats.uptime.toFixed(2)}%</Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Recent Outages */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Recent Outages
            </Typography>
            {stats?.outages.map((outage, index) => (
              <Box key={index} sx={{ mb: 1 }}>
                <Typography>
                  {outage.location} - {format(new Date(outage.timestamp), 'PPpp')}
                </Typography>
                <Typography color="error">{outage.error}</Typography>
              </Box>
            ))}
          </Paper>
        </Grid>

        {/* Response Time Chart */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Response Time History
            </Typography>
            <LineChart
              width={1200}
              height={300}
              data={historicalData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(timestamp: string) => format(new Date(timestamp), 'HH:mm')}
              />
              <YAxis />
              <Tooltip
                labelFormatter={(timestamp: string) => format(new Date(timestamp), 'PPpp')}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="responseTime"
                stroke="#8884d8"
                name="Response Time (ms)"
              />
            </LineChart>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default MonitoringDashboard; 