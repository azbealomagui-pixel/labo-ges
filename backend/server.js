// ===========================================
// FICHIER: backend/server.js
// RÔLE: Point d'entrée principal du serveur
// VERSION: Finale avec Socket.IO et cron job
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
const superAdminRoutes = require('./src/routes/superAdminRoutes');

// ===== 8. IMPORTER LE CRON (avec gestion d'erreur) =====
let checkExpiredSubscriptions;
try {
  checkExpiredSubscriptions = require('./cron/checkExpiredSubscriptions');
  console.log('✅ Module cron chargé avec succès');
} catch (err) {
  console.warn('⚠️ Module cron non trouvé, désactivation de la vérification automatique');
  console.warn('   Erreur:', err.message);
  checkExpiredSubscriptions = null;
}

// ===== 9. APPLIQUER LE RATE LIMITING STRICT =====
app.use('/api/users/login', authLimiter);
app.use('/api/users/register', authLimiter);

// ===== 10. UTILISER LES ROUTES =====
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
app.use('/api/super-admin', superAdminRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ===== 11. ROUTES DE TEST =====
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
      abonnements: '/api/abonnements',
      superAdmin: '/api/super-admin'
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

// ===== 12. CRÉER LE SERVEUR HTTP =====
const server = http.createServer(app);

// ===== 13. CONFIGURER SOCKET.IO =====
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

// ===== 14. CONNEXION À MONGODB ATLAS =====
console.log('🔄 Tentative de connexion à MongoDB Atlas...');

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ CONNEXION MONGODB ATLAS RÉUSSIE !');
    console.log(`📊 Base de données: ${mongoose.connection.name || 'laboratoire'}`);

    // ===== DÉMARRAGE DU CRON JOB (uniquement si disponible) =====
    if (checkExpiredSubscriptions) {
      // Exécution initiale après 5 secondes
      setTimeout(async () => {
        console.log('🔄 Exécution initiale du cron job...');
        try {
          const result = await checkExpiredSubscriptions(io);
          if (result && !result.error) {
            console.log(`📊 Cron initial: ${result.expired || 0} expirés, ${result.expiringSoon || 0} expirent bientôt`);
          } else if (result?.error) {
            console.warn(`⚠️ Cron initial: ${result.error}`);
          }
        } catch (err) {
          console.warn('⚠️ Erreur lors de l\'exécution initiale du cron:', err.message);
        }
      }, 5000);

      // Exécution périodique toutes les 24 heures
      setInterval(async () => {
        console.log('🔄 Exécution périodique du cron job...');
        try {
          const result = await checkExpiredSubscriptions(io);
          if (result && !result.error) {
            console.log(`📊 Cron: ${result.expired || 0} expirés, ${result.expiringSoon || 0} expirent bientôt`);
          }
        } catch (err) {
          console.warn('⚠️ Erreur lors de l\'exécution du cron:', err.message);
        }
      }, 24 * 60 * 60 * 1000); // 24 heures
    } else {
      console.log('ℹ️ Cron job désactivé (module non trouvé)');
    }

    // ===== DÉMARRAGE DU SERVEUR =====
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
    console.error('❌ ERREUR DE CONNEXION MONGODB ATLAS');
    console.error('📝 Détail:', error.message);
    console.log('💡 Vérifiez que:');
    console.log('   1. Le mot de passe dans .env est correct');
    console.log('   2. Votre IP est autorisée dans MongoDB Atlas');
    console.log('   3. L\'URL est bien copiée');
    process.exit(1);
  });

// ===== 15. GESTION DES ERREURS NON CAPTURÉES =====
process.on('uncaughtException', (error) => {
  console.error('🔥 Erreur non capturée:', error);
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (error) => {
  console.error('🔥 Promise non gérée:', error);
  setTimeout(() => process.exit(1), 1000);
});

// ===== 16. SIGNAL DE FERMETURE GRACIEUSE =====
process.on('SIGTERM', () => {
  console.log('🛑 Réception de SIGTERM, arrêt gracieux...');
  server.close(() => {
    console.log('✅ Serveur arrêté');
    mongoose.connection.close(false, () => {
      console.log('✅ Connexion MongoDB fermée');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Réception de SIGINT, arrêt gracieux...');
  server.close(() => {
    console.log('✅ Serveur arrêté');
    mongoose.connection.close(false, () => {
      console.log('✅ Connexion MongoDB fermée');
      process.exit(0);
    });
  });
});