// ===========================================
// ROUTES: ficheAnalyseRoutes.js
// RÔLE: Gestion des fiches d'analyses patient
// VERSION: Finale avec suppression fonctionnelle
// ===========================================

const express = require('express');
const FicheAnalyse = require('../models/FicheAnalyse');
const Analyse = require('../models/Analyse');
const Patient = require('../models/Patient');
const AuditLog = require('../models/AuditLog');
const { authenticate } = require('../middleware/auth');
const { checkPermission } = require('../middleware/checkPermission');
const router = express.Router();

// ===========================================
// CRÉER une fiche d'analyse (POST)
// ===========================================
router.post('/', authenticate, checkPermission('CREATE_FICHE'), async (req, res) => {
  try {
    const { patientId, laboratoireId, createdBy, lignes, devise, notes } = req.body;

    // Vérifications de base
    if (!patientId || !laboratoireId || !createdBy || !lignes || lignes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Données incomplètes',
        required: ['patientId', 'laboratoireId', 'createdBy', 'lignes']
      });
    }

    // Vérifier que le patient existe
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient non trouvé'
      });
    }

    // Calculer les totaux pour chaque ligne
    const lignesTraitees = lignes.map(ligne => {
      const prixTotal = ligne.prixUnitaire * ligne.quantite;
      return {
        ...ligne,
        prixTotal
      };
    });

    // Calculer le total général
    const totalGeneral = lignesTraitees.reduce((sum, ligne) => sum + ligne.prixTotal, 0);

    // Créer la fiche
    const nouvelleFiche = new FicheAnalyse({
      patientId,
      laboratoireId,
      createdBy,
      lignes: lignesTraitees,
      totalGeneral,
      devise: devise || 'EUR',
      notes,
      statut: 'brouillon'
    });

    await nouvelleFiche.save();

    res.status(201).json({
      success: true,
      message: 'Fiche d\'analyse créée avec succès',
      fiche: nouvelleFiche
    });

  } catch (error) {
    console.error('❌ Erreur création fiche analyse:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur'
    });
  }
});

// ===========================================
// LISTER les fiches d'un patient (GET)
// ===========================================
router.get('/patient/:patientId', authenticate, checkPermission('VIEW_FICHES'), async (req, res) => {
  try {
    const fiches = await FicheAnalyse.find({ 
      patientId: req.params.patientId 
    })
    .populate('createdBy', 'nom prenom')
    .sort({ dateCreation: -1 });

    res.json({
      success: true,
      count: fiches.length,
      fiches
    });

  } catch (error) {
    console.error('❌ Erreur listage fiches patient:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur'
    });
  }
});

// ===========================================
// LISTER les fiches d'un laboratoire (GET)
// ===========================================
router.get('/labo/:espaceId', authenticate, checkPermission('VIEW_FICHES'), async (req, res) => {
  try {
    const { espaceId } = req.params;
    
    const fiches = await FicheAnalyse.find({ laboratoireId: espaceId })
      .populate('patientId', 'nom prenom telephone')
      .populate('createdBy', 'nom prenom')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: fiches.length,
      fiches
    });

  } catch (error) {
    console.error('❌ Erreur listage fiches labo:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du chargement des fiches'
    });
  }
});

// ===========================================
// OBTENIR une fiche par ID (GET)
// ===========================================
router.get('/:id', authenticate, checkPermission('VIEW_FICHES'), async (req, res) => {
  try {
    const fiche = await FicheAnalyse.findById(req.params.id)
      .populate('patientId')
      .populate('createdBy', 'nom prenom')
      .populate('lignes.analyseId');

    if (!fiche) {
      return res.status(404).json({
        success: false,
        message: 'Fiche non trouvée'
      });
    }

    res.json({
      success: true,
      fiche
    });

  } catch (error) {
    console.error('❌ Erreur récupération fiche:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'ID de fiche invalide'
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur'
    });
  }
});

// ===========================================
// METTRE À JOUR le statut d'une fiche (PATCH)
// ===========================================
router.patch('/:id/statut', authenticate, checkPermission('UPDATE_FICHE'), async (req, res) => {
  try {
    const { statut } = req.body;
    
    const fiche = await FicheAnalyse.findByIdAndUpdate(
      req.params.id,
      { 
        statut,
        dateValidation: statut === 'valide' ? new Date() : undefined
      },
      { new: true }
    );

    if (!fiche) {
      return res.status(404).json({
        success: false,
        message: 'Fiche non trouvée'
      });
    }

    res.json({
      success: true,
      message: `Statut mis à jour : ${statut}`,
      fiche
    });

  } catch (error) {
    console.error('❌ Erreur mise à jour statut:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur'
    });
  }
});

// ===========================================
// SUPPRIMER une fiche d'analyse (DELETE)
// ===========================================
router.delete('/:id', authenticate, checkPermission('DELETE_FICHE'), async (req, res) => {
  try {
    const fiche = await FicheAnalyse.findByIdAndDelete(req.params.id);
    
    if (!fiche) {
      return res.status(404).json({
        success: false,
        message: 'Fiche non trouvée'
      });
    }

    // Journalisation (optionnelle)
    await AuditLog.create({
      espaceId: fiche.laboratoireId,
      utilisateurId: req.user._id,
      action: 'DELETE_FICHE',
      cible: {
        type: 'FicheAnalyse',
        id: fiche._id
      },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: '🗑️ Fiche supprimée définitivement'
    });

  } catch (error) {
    console.error('❌ Erreur suppression fiche:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression'
    });
  }
});

module.exports = router;