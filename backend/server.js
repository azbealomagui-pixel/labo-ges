// ===========================================
// FICHIER: backend/server.js
// RÔLE: Point d'entrée principal du serveur
// VERSION: Standard (avec require)
// ===========================================

// 1. IMPORTER LES MODULES
// -----------------------
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

// 2. CHARGER LES VARIABLES D'ENVIRONNEMENT
// ----------------------------------------
dotenv.config();

// 3. CRÉER L'APPLICATION EXPRESS
// -----------------------------
const app = express();

// 4. DÉFINIR LE PORT
// -----------------
const PORT = process.env.PORT || 5000; // 8080 ou 5000 selon préférence

// 5. MIDDLEWARES (traitent les requêtes avant les routes)
// -------------------------------------------------------
// Permet de lire le JSON dans les requêtes
app.use(express.json());

// Permet de lire les données de formulaires
app.use(express.urlencoded({ extended: true }));

// Autorise les requêtes depuis d'autres domaines (React)
app.use(cors());


// ===== ROUTES DE TEST =====
// 1. IMPORTER les routes utilisateurs
const userRoutes = require('./src/routes/userRoutes');
const laboratoireRoutes = require('./src/routes/laboratoireRoutes'); 
const patientRoutes = require('./src/routes/patientRoutes');
const analyseRoutes = require('./src/routes/analyseRoutes');
const devisRoutes = require('./src/routes/devisRoutes');
const statsRoutes = require('./src/routes/statsRoutes');
const ficheAnalyseRoutes = require('./src/routes/ficheAnalyseRoutes');
const espaceRoutes = require('./src/routes/espaceRoutes');





// 2. UTILISER les routes
app.use('/api/users', userRoutes);
app.use('/api/laboratoires', laboratoireRoutes); // NOUVEAU
app.use('/api/patients', patientRoutes);
app.use('/api/analyses', analyseRoutes);
app.use('/api/devis', devisRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/fiches-analyses', ficheAnalyseRoutes);
app.use('/api/espaces', espaceRoutes);



// 6. ROUTE DE TEST (pour vérifier que le serveur fonctionne)
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API LaboGest',
    version: '1.0.0',
    timestamp: new Date().toLocaleString()
  });
});

// Route de test supplémentaire
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Connexion à l\'API réussie',
    date: new Date().toLocaleString()
  });
});

// 7. CONNEXION À MONGODB ATLAS
console.log('Tentative de connexion à MongoDB Atlas...');

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('CONNEXION MONGODB ATLAS RÉUSSIE !');
    console.log(`Base de données: laboratoire`);
    
    // 8. DÉMARRER LE SERVEUR (une fois connecté à la DB)
    app.listen(PORT, () => {
      console.log('═══════════════════════════════════════════');
      console.log(`SERVEUR DÉMARRÉ AVEC SUCCÈS !`);
      console.log(`URL: http://localhost:${PORT}`);
      console.log(`Mode: ${process.env.NODE_ENV || 'development'}`);
      console.log(`${new Date().toLocaleString()}`);
      console.log('═══════════════════════════════════════════');
    });
  })
  .catch((error) => {
    console.log('ERREUR DE CONNEXION MONGODB ATLAS');
    console.log('Détail:', error.message);
    console.log('Vérifiez que:');
    console.log(' 1. Le mot de passe dans .env est correct');
    console.log(' 2. Votre IP est autorisée dans MongoDB Atlas');
    console.log(' 3. L\'URL est bien copiée');
    process.exit(1); // Arrête le processus si pas de DB
  });

// 9. GESTION DES ERREURS NON CAPTURÉES
// ------------------------------------
process.on('uncaughtException', (error) => {
  console.error('Erreur non capturée:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('Promise non gérée:', error);
  process.exit(1);
});