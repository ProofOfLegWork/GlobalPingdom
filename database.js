const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = new sqlite3.Database(path.join(__dirname, 'monitoring.db'));
    this.init();
  }

  init() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS monitoring_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        location TEXT NOT NULL,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        region TEXT NOT NULL,
        response_time INTEGER NOT NULL,
        status INTEGER NOT NULL,
        status_text TEXT,
        success BOOLEAN NOT NULL,
        timestamp TEXT NOT NULL,
        content_length INTEGER DEFAULT 0,
        server_response TEXT,
        error TEXT
      )
    `;

    const createIndexQuery = `
      CREATE INDEX IF NOT EXISTS idx_timestamp ON monitoring_results(timestamp);
    `;

    const createLocationIndexQuery = `
      CREATE INDEX IF NOT EXISTS idx_location ON monitoring_results(location);
    `;

    this.db.serialize(() => {
      this.db.run(createTableQuery);
      this.db.run(createIndexQuery);
      this.db.run(createLocationIndexQuery);
    });
  }

  async saveMonitoringResult(result) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO monitoring_results 
        (location, lat, lng, region, response_time, status, status_text, success, timestamp, content_length, server_response, error)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        result.location,
        result.lat,
        result.lng,
        result.region,
        result.responseTime,
        result.status,
        result.statusText,
        result.success ? 1 : 0,
        result.timestamp,
        result.contentLength || 0,
        result.serverResponse || null,
        result.error || null
      ];

      this.db.run(query, values, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  async getLatestResults() {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM monitoring_results
        WHERE timestamp = (
          SELECT MAX(timestamp) FROM monitoring_results
        )
        ORDER BY location
      `;

      this.db.all(query, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const results = rows.map(row => ({
            location: row.location,
            lat: row.lat,
            lng: row.lng,
            region: row.region,
            responseTime: row.response_time,
            status: row.status,
            statusText: row.status_text,
            success: row.success === 1,
            timestamp: row.timestamp,
            contentLength: row.content_length,
            serverResponse: row.server_response,
            error: row.error
          }));
          resolve(results);
        }
      });
    });
  }

  async getHistoricalData(hours = 24) {
    return new Promise((resolve, reject) => {
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      
      const query = `
        SELECT 
          location,
          response_time,
          success,
          timestamp,
          status
        FROM monitoring_results
        WHERE timestamp >= ?
        ORDER BY timestamp DESC, location
      `;

      this.db.all(query, [cutoffTime], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const results = rows.map(row => ({
            location: row.location,
            responseTime: row.response_time,
            success: row.success === 1,
            timestamp: row.timestamp,
            status: row.status
          }));
          resolve(results);
        }
      });
    });
  }
  //WIll work once the global solution exists
  async getSummaryStats(hours = 24) {
    return new Promise((resolve, reject) => {
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      
      const query = `
        SELECT 
          location,
          COUNT(*) as total_tests,
          SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_tests,
          AVG(CASE WHEN success = 1 THEN response_time ELSE NULL END) as avg_response_time,
          MIN(CASE WHEN success = 1 THEN response_time ELSE NULL END) as min_response_time,
          MAX(CASE WHEN success = 1 THEN response_time ELSE NULL END) as max_response_time,
          (SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as uptime_percentage
        FROM monitoring_results
        WHERE timestamp >= ?
        GROUP BY location
        ORDER BY location
      `;

      this.db.all(query, [cutoffTime], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const stats = rows.map(row => ({
            location: row.location,
            totalTests: row.total_tests,
            successfulTests: row.successful_tests,
            avgResponseTime: Math.round(row.avg_response_time || 0),
            minResponseTime: row.min_response_time || 0,
            maxResponseTime: row.max_response_time || 0,
            uptimePercentage: parseFloat((row.uptime_percentage || 0).toFixed(2))
          }));
          resolve(stats);
        }
      });
    });
  }

  async getResponseTimeHistory(hours = 24) {
    return new Promise((resolve, reject) => {
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      
      const query = `
        SELECT 
          timestamp,
          location,
          response_time,
          success
        FROM monitoring_results
        WHERE timestamp >= ? AND success = 1
        ORDER BY timestamp ASC
      `;

      this.db.all(query, [cutoffTime], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async getUptimeHistory(hours = 24) {
    return new Promise((resolve, reject) => {
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      
      const query = `
        SELECT 
          strftime('%Y-%m-%d %H:00:00', timestamp) as hour,
          COUNT(*) as total_tests,
          SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_tests,
          (SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as uptime_percentage
        FROM monitoring_results
        WHERE timestamp >= ?
        GROUP BY strftime('%Y-%m-%d %H:00:00', timestamp)
        ORDER BY hour ASC
      `;

      this.db.all(query, [cutoffTime], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const results = rows.map(row => ({
            hour: row.hour,
            totalTests: row.total_tests,
            successfulTests: row.successful_tests,
            uptimePercentage: parseFloat((row.uptime_percentage || 0).toFixed(2))
          }));
          resolve(results);
        }
      });
    });
  }

  close() {
    this.db.close();
  }
}

module.exports = Database; 