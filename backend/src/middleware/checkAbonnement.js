// ===========================================
// MIDDLEWARE: checkAbonnement.js
// RÔLE: Vérifier que l'espace a un abonnement actif
// VERSION: Corrigée - utilise modèle Abonnement
// ===========================================

const Abonnement = require('../models/Abonnement');

const checkAbonnement = async (req, res, next) => {
  try {
    // Récupérer l'espaceId depuis l'utilisateur connecté
    const espaceId = req.user?.espaceId;

    if (!espaceId) {
      return res.status(400).json({
        success: false,
        message: 'Espace non identifié'
      });
    }

    // Chercher l'abonnement dans le modèle Abonnement
    const abonnement = await Abonnement.findOne({ espaceId });

    if (!abonnement) {
      return res.status(403).json({
        success: false,
        message: 'Aucun abonnement trouvé pour cet espace. Veuillez contacter l\'administrateur.'
      });
    }

    // Vérifier si l'abonnement est actif
    if (!abonnement.estActif()) {
      return res.status(403).json({
        success: false,
        message: 'Abonnement expiré. Veuillez renouveler pour continuer à utiliser LaboGes.',
        abonnement: {
          type: abonnement.type,
          dateFin: abonnement.dateFin,
          statut: abonnement.statut
        }
      });
    }

    // Ajouter l'abonnement à la requête pour usage ultérieur
    req.abonnement = abonnement;
    next();

  } catch (error) {
    console.error('❌ Erreur vérification abonnement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification de l\'abonnement'
    });
  }
};

module.exports = checkAbonnement;