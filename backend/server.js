// ===========================================
// FICHIER: backend/server.js
// RÔLE: Point d'entrée principal du serveur
// VERSION: Optimisée avec vérification des imports
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
app.use(express.json({ limit: '10mb' })); // Limite de taille pour les requêtes
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
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

// Appliquer le rate limiting global (sauf routes sensibles)
app.use(limiter);

// ===== 7. IMPORTER LES ROUTES (UNE SEULE FOIS CHACUNE) =====
const userRoutes = require('./src/routes/userRoutes');
const laboratoireRoutes = require('./src/routes/laboratoireRoutes');
const patientRoutes = require('./src/routes/patientRoutes'); // ← UNE SEULE FOIS
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
app.use('/api/patients', patientRoutes); // ← UNE SEULE FOIS
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
    timestamp: new Date().toLocaleString()
  });
});

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

// Rendre io accessible dans les routes via app
app.set('io', io);

// Gestion des connexions Socket.IO
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
  console.error('❌ Erreur serveur:', err);
  
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
console.log('🔄 Tentative de connexion à MongoDB Atlas...');

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000 // Timeout après 5 secondes
})
  .then(() => {
    console.log('✅ CONNEXION MONGODB ATLAS RÉUSSIE !');
    console.log(`📊 Base de données: ${mongoose.connection.name}`);
    
    // Démarrer le serveur
    server.listen(PORT, () => {
      console.log('═══════════════════════════════════════════');
      console.log(`🚀 SERVEUR DÉMARRÉ AVEC SUCCÈS !`);
      console.log(`📡 URL: http://localhost:${PORT}`);
      console.log(`🔧 Mode: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📦 Routes chargées: ${app._router.stack.length}`);
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
    console.log('   4. Le réseau est accessible');
    process.exit(1);
  });

// ===== 15. GESTION DES ERREURS NON CAPTURÉES =====
process.on('uncaughtException', (error) => {
  console.error('🔥 Erreur non capturée:', error);
  console.error('💥 Arrêt du serveur...');
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('🔥 Promise non gérée:', error);
  console.error('💥 Arrêt du serveur...');
  process.exit(1);
});

// ===== 16. GESTION DE L'ARRÊT GRACIEUX =====
process.on('SIGTERM', () => {
  console.log('🛑 Signal SIGTERM reçu, arrêt gracieux...');
  server.close(() => {
    console.log('✅ Serveur arrêté');
    mongoose.connection.close(false, () => {
      console.log('✅ Connexion MongoDB fermée');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Signal SIGINT reçu, arrêt gracieux...');
  server.close(() => {
    console.log('✅ Serveur arrêté');
    mongoose.connection.close(false, () => {
      console.log('✅ Connexion MongoDB fermée');
      process.exit(0);
    });
  });
});