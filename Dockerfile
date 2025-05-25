FROM node:18-slim

WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json ./
COPY client/package*.json ./client/
RUN npm install
RUN cd client && npm install

# Copy source code
COPY . .

# Build React frontend
RUN cd client && npm run build

# Expose the application port
EXPOSE 5511

# Start the application
CMD ["node", "server.js"] 