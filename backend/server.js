//===========================================
// FICHIER: backend/server.js
// RÔLE: Point d'entrée principal du serveur
// VERSION: Finale avec Socket.IO intégré
// ===========================================

// ===== 1. IMPORTER LES MODULES =====
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

// ===== 2. CHARGER LES VARIABLES D'ENVIRONNEMENT =====
dotenv.config();

// ===== 3. CRÉER L'APPLICATION EXPRESS =====
const app = express();

// ===== 4. CONFIGURATION DU PORT =====
const PORT = process.env.PORT || 5000;

// ===== 5. MIDDLEWARES GLOBAUX =====
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// ===== 6. CONFIGURATION DU RATE LIMITING =====
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Trop de requêtes, veuillez réessayer plus tard'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Trop de tentatives, compte temporairement bloqué'
  }
});

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
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ===== 10. ROUTES DE TEST =====
// Route racine
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API LaboGes',
    version: '1.0.0',
    timestamp: new Date().toLocaleString()
  });
});

// Route /api (pour que le frontend puisse vérifier)
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'API LaboGes opérationnelle',
    endpoints: {
      users: '/api/users',
      patients: '/api/patients',
      analyses: '/api/analyses',
      devis: '/api/devis',
      espaces: '/api/espaces',
      rapports: '/api/rapports',
      messages: '/api/messages',
      abonnements: '/api/abonnements'
    },
    timestamp: new Date().toLocaleString()
  });
});

// Route de test /api/test
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Connexion à l\'API réussie',
    date: new Date().toLocaleString()
  });
});

// ===== 11. CRÉER LE SERVEUR HTTP =====
const server = http.createServer(app);

// ===== 12. CONFIGURER SOCKET.IO =====
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
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

// ===== 13. CONNEXION À MONGODB ATLAS =====
console.log('🔄 Tentative de connexion à MongoDB Atlas...');

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ CONNEXION MONGODB ATLAS RÉUSSIE !');
    console.log(`📊 Base de données: laboratoire`);

    server.listen(PORT, () => {
      console.log('═══════════════════════════════════════════');
      console.log(`🚀 SERVEUR DÉMARRÉ AVEC SUCCÈS !`);
      console.log(`📡 URL: http://localhost:${PORT}`);
      console.log(`🔧 Mode: ${process.env.NODE_ENV || 'development'}`);
      console.log(`⏱️  ${new Date().toLocaleString()}`);
      console.log('═══════════════════════════════════════════');
    });
  })
  .catch((error) => {
    console.log('❌ ERREUR DE CONNEXION MONGODB ATLAS');
    console.log('📝 Détail:', error.message);
    console.log('💡 Vérifiez que:');
    console.log('   1. Le mot de passe dans .env est correct');
    console.log('   2. Votre IP est autorisée dans MongoDB Atlas');
    console.log('   3. L\'URL est bien copiée');
    process.exit(1);
  });

// ===== 14. GESTION DES ERREURS NON CAPTURÉES =====
process.on('uncaughtException', (error) => {
  console.error('🔥 Erreur non capturée:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('🔥 Promise non gérée:', error);
  process.exit(1);
});