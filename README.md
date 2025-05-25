# GlobalPingdom

A powerful website monitoring utility that provides real-time monitoring and beautiful visualizations for tracking website performance and availability across the globe.

## Features

- 🌐 Global Website Monitoring
- 📊 Real-time Performance Visualization
- 📈 Historical Data Tracking
- 🔔 Instant Notifications
- 📱 Responsive Web Interface
- 🔄 WebSocket-based Live Updates

## Tech Stack

### Backend
- Node.js
- Express.js
- SQLite3
- Socket.IO
- node-cron (for scheduled monitoring)

### Frontend
- React
- TypeScript
- Socket.IO Client
- Modern UI Components

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Docker (optional, for containerized deployment)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/GlobalPingdom.git
   cd GlobalPingdom
   ```

2. Install dependencies:
   ```bash
   # Install server dependencies
   npm install

   # Install client dependencies (this happens automatically with postinstall)
   ```

## Development

Run the development server:
```bash
npm run dev
```

This will start:
- Backend server on http://localhost:3000
- Frontend development server on http://localhost:3001

## Production Deployment

### Using Docker

1. Build and run using Docker Compose:
   ```bash
   docker-compose up --build
   ```

### Manual Deployment

1. Build the client:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
PORT=3000
NODE_ENV=development
# Add any other environment variables
```

## Project Structure

```
GlobalPingdom/
├── client/                 # Frontend React application
│   ├── src/               # Source files
│   ├── public/            # Static files
│   └── package.json       # Frontend dependencies
├── server.js              # Main server file
├── database.js            # Database configuration
├── docker-compose.yml     # Docker compose configuration
├── Dockerfile             # Docker configuration
└── package.json           # Backend dependencies
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Author

Your Name

## Acknowledgments

- Thanks to all contributors
- Inspired by the need for a robust, global website monitoring solution
