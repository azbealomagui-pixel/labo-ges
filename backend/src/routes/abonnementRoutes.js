// ===========================================
// ROUTES: abonnementRoutes.js
// RÔLE: Gestion des abonnements
// VERSION: Finale avec conversion USD
// ===========================================

const express = require('express');
const Abonnement = require('../models/Abonnement');
const Espace = require('../models/Espace');
const { authenticate } = require('../middleware/auth');
const { checkPermission } = require('../middleware/checkPermission');
const { convertirVersUSD } = require('../config/currencies');
const router = express.Router();

// ===== OBTENIR L'ABONNEMENT DE L'ESPACE DE L'UTILISATEUR =====
router.get('/mon-abonnement', authenticate, async (req, res) => {
  try {
    const espaceId = req.user.espaceId;
    
    if (!espaceId) {
      return res.status(400).json({
        success: false,
        message: 'Aucun espace associé à cet utilisateur'
      });
    }

    let abonnement = await Abonnement.findOne({ espaceId });

    if (!abonnement) {
      abonnement = await Abonnement.creerEssai(espaceId);
    }

    res.json({
      success: true,
      abonnement
    });

  } catch (error) {
    console.error('❌ Erreur récupération abonnement:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur'
    });
  }
});

// ===== OBTENIR L'ABONNEMENT D'UN ESPACE (pour super admin) =====
router.get('/espace/:espaceId', authenticate, checkPermission('VIEW_SETTINGS'), async (req, res) => {
  try {
    const abonnement = await Abonnement.findOne({ espaceId: req.params.espaceId });

    if (!abonnement) {
      return res.status(404).json({
        success: false,
        message: 'Abonnement non trouvé'
      });
    }

    res.json({
      success: true,
      abonnement
    });

  } catch (error) {
    console.error('❌ Erreur récupération abonnement:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur'
    });
  }
});

// ===== RENOUVELER L'ABONNEMENT =====
router.post('/renouveler', authenticate, async (req, res) => {
  try {
    const { type, devise, montant } = req.body;
    const espaceId = req.user.espaceId;

    if (!type || !['mensuel', 'annuel'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Type d\'abonnement invalide (mensuel ou annuel)'
      });
    }

    let abonnement = await Abonnement.findOne({ espaceId });

    if (!abonnement) {
      abonnement = await Abonnement.creerEssai(espaceId);
    }

    const devisePaiement = devise || 'USD';
    const abonnementRenouvele = await Abonnement.renouveler(
      abonnement._id, 
      type, 
      devisePaiement, 
      montant
    );

    res.json({
      success: true,
      message: 'Abonnement renouvelé avec succès',
      abonnement: abonnementRenouvele
    });

  } catch (error) {
    console.error('❌ Erreur renouvellement:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur'
    });
  }
});

// ===== ENREGISTRER UN PAIEMENT (AVEC CONVERSION USD) =====
router.post('/paiement', authenticate, async (req, res) => {
  try {
    const { montant, methode, transactionId, devise } = req.body;
    const espaceId = req.user.espaceId;

    if (!montant) {
      return res.status(400).json({
        success: false,
        message: 'Montant requis'
      });
    }

    const espace = await Espace.findById(espaceId);
    const devisePaiement = devise || espace?.deviseParDefaut || 'USD';

    const montantUSD = convertirVersUSD(montant, devisePaiement);

    const abonnement = await Abonnement.findOne({ espaceId });
    if (!abonnement) {
      return res.status(404).json({
        success: false,
        message: 'Abonnement non trouvé'
      });
    }

    abonnement.paiements.push({
      montant,
      devise: devisePaiement,
      montantUSD,
      methode: methode || 'carte',
      transactionId: transactionId || `TXN-${Date.now()}`,
      statut: 'reussi'
    });

    await abonnement.save();

    res.json({
      success: true,
      message: 'Paiement enregistré',
      abonnement: {
        _id: abonnement._id,
        type: abonnement.type,
        statut: abonnement.statut,
        paiements: abonnement.paiements
      }
    });

  } catch (error) {
    console.error('❌ Erreur paiement:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur'
    });
  }
});

// ===== SUSPENDRE UN ABONNEMENT (super admin) =====
router.patch('/:id/suspendre', authenticate, checkPermission('UPDATE_SETTINGS'), async (req, res) => {
  try {
    const abonnement = await Abonnement.findByIdAndUpdate(
      req.params.id,
      { statut: 'suspendu' },
      { new: true }
    );

    if (!abonnement) {
      return res.status(404).json({
        success: false,
        message: 'Abonnement non trouvé'
      });
    }

    res.json({
      success: true,
      message: 'Abonnement suspendu',
      abonnement
    });

  } catch (error) {
    console.error('❌ Erreur suspension:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur'
    });
  }
});

// ===== TÂCHE CRON POUR VÉRIFIER LES EXPIRATIONS =====
router.post('/cron/verifier', async (req, res) => {
  try {
    const maintenant = new Date();
    const dans7Jours = new Date(maintenant);
    dans7Jours.setDate(dans7Jours.getDate() + 7);

    const expireBientot = await Abonnement.find({
      dateFin: { $lte: dans7Jours, $gte: maintenant },
      statut: 'actif'
    });

    const expireResult = await Abonnement.updateMany(
      { dateFin: { $lt: maintenant }, statut: 'actif' },
      { statut: 'expire' }
    );

    res.json({
      success: true,
      message: `${expireBientot.length} abonnements expirent bientôt, ${expireResult.modifiedCount} expirés`,
      expireBientot
    });

  } catch (error) {
    console.error('❌ Erreur cron:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur'
    });
  }
});

module.exports = router;