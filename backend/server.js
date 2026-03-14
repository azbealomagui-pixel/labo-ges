// ===========================================
// FICHIER: backend/server.js
// RÔLE: Point d'entrée principal du serveur
// VERSION: Finale avec rate limiting et sécurité
// ===========================================

// ===== 1. IMPORTER LES MODULES =====
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// ===== 2. CHARGER LES VARIABLES D'ENVIRONNEMENT =====
dotenv.config();

// ===== 3. CRÉER L'APPLICATION EXPRESS =====
const app = express();

// ===== 4. CONFIGURATION DU PORT =====
const PORT = process.env.PORT || 5000;

// ===== 5. MIDDLEWARES GLOBAUX =====
// Permet de lire le JSON dans les requêtes
app.use(express.json());

// Permet de lire les données de formulaires
app.use(express.urlencoded({ extended: true }));

// Autorise les requêtes depuis d'autres domaines (React)
app.use(cors());

// ===== 6. CONFIGURATION DU RATE LIMITING =====
// Limiteur global pour toutes les routes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requêtes max par IP
  message: {
    success: false,
    message: 'Trop de requêtes, veuillez réessayer plus tard'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Limiteur strict pour les routes sensibles (login/register)
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 5, // 5 tentatives max par heure
  message: {
    success: false,
    message: 'Trop de tentatives, compte temporairement bloqué'
  }
});

// Appliquer le rate limiting global à toutes les routes
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

// ===== 8. APPLIQUER LE RATE LIMITING STRICT AUX ROUTES SENSIBLES =====
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

// ===== 10. ROUTES DE TEST =====
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API LaboGest',
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

// ===== 11. CONNEXION À MONGODB ATLAS =====
console.log('🔄 Tentative de connexion à MongoDB Atlas...');

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ CONNEXION MONGODB ATLAS RÉUSSIE !');
    console.log(`📊 Base de données: laboratoire`);
    
    // Démarrer le serveur
    app.listen(PORT, () => {
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

// ===== 12. GESTION DES ERREURS NON CAPTURÉES =====
process.on('uncaughtException', (error) => {
  console.error('🔥 Erreur non capturée:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('🔥 Promise non gérée:', error);
  process.exit(1);
});