require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const { app, connectDB } = require('./app');
const socketHandler = require('./socket/handlers');

const PORT = process.env.PORT || 3000;

/**
 * Création du serveur HTTP et Socket.io
 */
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Initialiser les handlers WebSocket
socketHandler(io);

/**
 * Démarrage du serveur
 */
const startServer = async () => {
  try {
    // Connexion à la base de données
    await connectDB();

    // Démarrer le serveur
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

// Gestion de l'arrêt propre
process.on('SIGINT', async () => {
  console.log('\n⚠ Arrêt du serveur...');
  server.close(() => {
    console.log('✓ Serveur arrêté');
    process.exit(0);
  });
});

// Démarrer le serveur si ce n'est pas un import
if (require.main === module) {
  startServer();
}

module.exports = { server, io };
