// ===========================================
// ROUTES: ficheAnalyseRoutes.js
// RÔLE: Gestion des fiches d'analyses patient
// ===========================================
const express = require('express');
const FicheAnalyse = require('../models/FicheAnalyse');
const Analyse = require('../models/Analyse');
const Patient = require('../models/Patient');
const router = express.Router();

// ===========================================
// CRÉER une fiche d'analyse (POST)
// ===========================================
router.post('/', async (req, res) => {
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
router.get('/patient/:patientId', async (req, res) => {
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
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ===========================================
// OBTENIR une fiche par ID (GET)
// ===========================================
router.get('/:id', async (req, res) => {
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
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ===========================================
// METTRE À JOUR le statut d'une fiche (PATCH)
// ===========================================
router.patch('/:id/statut', async (req, res) => {
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
    res.status(500).json({
      success: false,
      message: error.message
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
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: fiches.length,
      fiches
    });

  } catch (error) {
    console.error('❌ Erreur listage fiches:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du chargement des fiches'
    });
  }
});

module.exports = router;