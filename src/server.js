const { ENV, PORT, DB_URI, JWT_SECRET } = require('./config');
const http = require('http');
const { Server } = require('socket.io');
const { app, connectDB } = require('./app');
const socketHandler = require('./socket/handlers');

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

socketHandler(io);

const startServer = async () => {
  try {
    await connectDB();

    server.listen(PORT, () => {
      console.log(`✓ Serveur démarré sur le port ${PORT}`);
      console.log(`✓ API REST: http://localhost:${PORT}/api`);
      console.log(`✓ WebSocket: ws://localhost:${PORT}`);
      console.log(`✓ Frontend: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('✗ Erreur démarrage serveur:', error);
    process.exit(1);
  }
};

process.on('SIGINT', async () => {
  console.log('\n⚠ Arrêt du serveur...');
  server.close(() => {
    console.log('✓ Serveur arrêté');
    process.exit(0);
  });
});

if (require.main === module) {
  startServer();
}

module.exports = { server, io };
