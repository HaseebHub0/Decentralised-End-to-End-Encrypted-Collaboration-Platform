import express from 'express';
import { WebSocketServer } from 'ws';
import http from 'http';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Store client connections by username
const clients = new Map();

// Heartbeat to detect stale connections
function heartbeat() {
  this.isAlive = true;
}

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', heartbeat);

  // Handle messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log('Received message type:', message.type);
      
      switch (message.type) {
        case 'register':
          // Register client with username
          if (message.username) {
            if (clients.has(message.username)) {
              // If username is taken, force disconnect old connection
              const existingClient = clients.get(message.username);
              existingClient.close();
              clients.delete(message.username);
            }
            console.log('Registering user:', message.username);
            clients.set(message.username, ws);
            ws.username = message.username;
            broadcastStatus();
          } else {
            console.warn('Register attempt without username');
          }
          break;

        case 'chat':
          // Forward encrypted message to recipient
          if (message.to && message.encryptedContent) {
            console.log(`Forwarding chat message: ${ws.username} -> ${message.to}`);
            const recipient = clients.get(message.to);
            if (recipient && recipient.readyState === 1) {
              const payload = JSON.stringify({
                type: 'chat',
                from: ws.username,
                encryptedContent: message.encryptedContent
              });
              recipient.send(payload);
              console.log('Message forwarded successfully');
            } else {
              console.warn(`Recipient ${message.to} not found or not ready`);
              // Notify sender that recipient is unavailable
              ws.send(JSON.stringify({
                type: 'error',
                error: 'Recipient offline or unavailable'
              }));
            }
          } else {
            console.warn('Invalid chat message format');
          }
          break;

        case 'keyexchange':
          // Forward key exchange messages
          if (message.to && message.publicKey) {
            console.log(`Forwarding key exchange: ${ws.username} -> ${message.to}`);
            const recipient = clients.get(message.to);
            if (recipient && recipient.readyState === 1) {
              const payload = JSON.stringify({
                type: 'keyexchange',
                from: ws.username,
                publicKey: message.publicKey
              });
              recipient.send(payload);
              console.log('Key exchange forwarded successfully');
            } else {
              console.warn(`Key exchange failed: recipient ${message.to} not available`);
              ws.send(JSON.stringify({
                type: 'error',
                error: 'Key exchange failed: recipient unavailable'
              }));
            }
          } else {
            console.warn('Invalid key exchange format');
          }
          break;
      }
    } catch (err) {
      console.error('Failed to parse message:', err);
    }
  });

  // Handle disconnection
  ws.on('close', () => {
    if (ws.username) {
      clients.delete(ws.username);
      broadcastStatus();
    }
  });
});

// Broadcast online status to all clients
function broadcastStatus() {
  const onlineUsers = Array.from(clients.keys());
  const status = JSON.stringify({
    type: 'status',
    users: onlineUsers
  });

  for (const client of clients.values()) {
    if (client.readyState === 1) {
      client.send(status);
    }
  }
}

// Check for stale connections
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      if (ws.username) {
        clients.delete(ws.username);
        broadcastStatus();
      }
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(interval);
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});