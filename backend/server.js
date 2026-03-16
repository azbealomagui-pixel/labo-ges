// ===========================================
// FICHIER: backend/server.js
// RÔLE: Point d'entrée principal du serveur
// VERSION: Ultra-stable (sans erreur stack)
// ===========================================

// ===== 1. IMPORTER LES MODULES =====
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIo = require('socket.io');

// ===== 2. CHARGER LES VARIABLES D'ENVIRONNEMENT =====
dotenv.config();

// ===== 3. CRÉER L'APPLICATION EXPRESS =====
const app = express();

// ===== 4. CONFIGURATION DU PORT =====
const PORT = process.env.PORT || 5000;

// ===== 5. MIDDLEWARES GLOBAUX =====
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

// ===== 6. CONFIGURATION DU RATE LIMITING =====
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requêtes par IP
  message: {
    success: false,
    message: 'Trop de requêtes, veuillez réessayer plus tard'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 5, // 5 tentatives max
  message: {
    success: false,
    message: 'Trop de tentatives, compte temporairement bloqué'
  }
});

// Appliquer le rate limiting global
app.use(limiter);

// ===== 7. IMPORTER LES ROUTES =====
const userRoutes = require('./src/routes/userRoutes');
const laboratoireRoutes = require('./src/routes/laboratoireRoutes');
const patientRoutes = require('./src/routes/patientRoutes');
const analyseRoutes = require('./src/routes/analyseRoutes');
const devisRoutes = require('./src/routes/devisRoutes');
const statsRoutes = require('./src/routes/statsRoutes');
const ficheAnalyseRoutes = require('./src/routes/ficheAnalyseRoutes');
const espaceRoutes = require('./src/routes/espaceRoutes');
const rapportRoutes = require('./src/routes/rapportRoutes');
const messageRoutes = require('./src/routes/messageRoutes');
const abonnementRoutes = require('./src/routes/abonnementRoutes');

// ===== 8. APPLIQUER LE RATE LIMITING STRICT =====
app.use('/api/users/login', authLimiter);
app.use('/api/users/register', authLimiter);

// ===== 9. UTILISER LES ROUTES =====
app.use('/api/users', userRoutes);
app.use('/api/laboratoires', laboratoireRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/analyses', analyseRoutes);
app.use('/api/devis', devisRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/fiches-analyses', ficheAnalyseRoutes);
app.use('/api/espaces', espaceRoutes);
app.use('/api/rapports', rapportRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/abonnements', abonnementRoutes);

// ===== 10. ROUTES DE TEST =====
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API Labo-ges',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Connexion à l\'API réussie',
    date: new Date().toISOString()
  });
});

// ===== 11. CRÉER LE SERVEUR HTTP =====
const server = http.createServer(app);

// ===== 12. CONFIGURER SOCKET.IO =====
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.set('io', io);

io.on('connection', (socket) => {
  console.log('🔌 Nouvelle connexion socket:', socket.id);

  socket.on('join-espace', (espaceId) => {
    socket.join(espaceId);
    console.log(`👥 Socket ${socket.id} a rejoint l'espace ${espaceId}`);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Déconnexion socket:', socket.id);
  });
});

// ===== 13. MIDDLEWARE DE GESTION DES ERREURS =====
app.use((err, req, res, next) => {
  console.error('❌ Erreur:', err.message);
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      message: 'Token invalide ou expiré'
    });
  }

  res.status(500).json({
    success: false,
    message: 'Erreur interne du serveur'
  });
});

// ===== 14. CONNEXION À MONGODB ATLAS =====
console.log('🔄 Connexion MongoDB...');

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connecté');
    
    // DÉMARRER LE SERVEUR APRÈS LA CONNEXION RÉUSSIE
    server.listen(PORT, '0.0.0.0', () => {
      console.log('═══════════════════════════════════════════');
      console.log(`🚀 SERVEUR PRÊT`);
      console.log(`📡 Port: ${PORT}`);
      console.log(`🔧 Mode: ${process.env.NODE_ENV || 'development'}`);
      console.log(`⏱️  ${new Date().toISOString()}`);
      console.log('═══════════════════════════════════════════');
    });
  })
  .catch((error) => {
    console.error('❌ MongoDB erreur:', error.message);
    console.error('💡 Vérifiez votre MONGODB_URI');
    process.exit(1);
  });

// ===== 15. GESTION DES ERREURS NON CAPTURÉES =====
process.on('uncaughtException', (error) => {
  console.error('🔥 Exception non capturée:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('🔥 Rejet non géré:', error.message);
  process.exit(1);
});

// ===== 16. ARRÊT GRACIEUX =====
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM reçu');
  server.close(() => {
    mongoose.connection.close();
    console.log('✅ Arrêt terminé');
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT reçu');
  server.close(() => {
    mongoose.connection.close();
    console.log('✅ Arrêt terminé');
    process.exit(0);
  });
});