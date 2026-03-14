// ===========================================
// ROUTES: rapportRoutes.js
// RÔLE: Gestion des rapports finaux
// ===========================================

const express = require('express');
const Rapport = require('../models/Rapport');
const FicheAnalyse = require('../models/FicheAnalyse');
const Analyse = require('../models/Analyse');
const Patient = require('../models/Patient');
const User = require('../models/User');
const router = express.Router();

// ===== CRÉER UN RAPPORT À PARTIR D'UNE FICHE =====
router.post('/from-fiche/:ficheId', async (req, res) => {
  try {
    const { ficheId } = req.params;
    const { validePar, resultats } = req.body;

    // Récupérer la fiche d'analyse
    const fiche = await FicheAnalyse.findById(ficheId)
      .populate('patientId')
      .populate('lignes.analyseId');

    if (!fiche) {
      return res.status(404).json({
        success: false,
        message: 'Fiche d\'analyse non trouvée'
      });
    }

    // Préparer les résultats
    const resultatsPreparés = fiche.lignes.map(ligne => ({
      analyseId: ligne.analyseId._id,
      code: ligne.analyseId.code,
      nom: ligne.analyseId.nom?.fr || ligne.analyseId.nom,
      valeur: 0, // À saisir plus tard
      unite: ligne.analyseId.uniteMesure || '',
      valeurReference: ligne.analyseId.valeursReference || {},
      interpretation: 'normal',
      commentaire: ''
    }));

    // Créer le rapport
    const nouveauRapport = new Rapport({
      ficheAnalyseId: ficheId,
      patientId: fiche.patientId._id,
      espaceId: fiche.laboratoireId,
      resultats: resultats || resultatsPreparés,
      validePar,
      statut: 'brouillon'
    });

    await nouveauRapport.save();

    res.status(201).json({
      success: true,
      message: 'Rapport créé',
      rapport: nouveauRapport
    });

  } catch (error) {
    console.error('❌ Erreur création rapport:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ===== METTRE À JOUR LES RÉSULTATS =====
router.put('/:id/resultats', async (req, res) => {
  try {
    const { resultats } = req.body;
    const rapport = await Rapport.findById(req.params.id);

    if (!rapport) {
      return res.status(404).json({
        success: false,
        message: 'Rapport non trouvé'
      });
    }

    rapport.resultats = resultats;
    await rapport.save();

    res.json({
      success: true,
      message: 'Résultats mis à jour',
      rapport
    });

  } catch (error) {
    console.error('❌ Erreur mise à jour résultats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ===== VALIDER LE RAPPORT =====
router.patch('/:id/valider', async (req, res) => {
  try {
    const { signature, cachet } = req.body;
    const rapport = await Rapport.findById(req.params.id);

    if (!rapport) {
      return res.status(404).json({
        success: false,
        message: 'Rapport non trouvé'
      });
    }

    rapport.statut = 'final';
    rapport.signature = signature;
    rapport.cachet = cachet;
    rapport.dateValidation = new Date();

    // Générer un QR code simple
    const qrData = `RAPPORT:${rapport._id}|PATIENT:${rapport.patientId}|DATE:${Date.now()}`;
    rapport.qrCode = Buffer.from(qrData).toString('base64');

    await rapport.save();

    res.json({
      success: true,
      message: 'Rapport validé',
      rapport
    });

  } catch (error) {
    console.error('❌ Erreur validation:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ===== OBTENIR UN RAPPORT =====
router.get('/:id', async (req, res) => {
  try {
    const rapport = await Rapport.findById(req.params.id)
      .populate('patientId')
      .populate('validePar', 'nom prenom')
      .populate('resultats.analyseId');

    if (!rapport) {
      return res.status(404).json({
        success: false,
        message: 'Rapport non trouvé'
      });
    }

    res.json({
      success: true,
      rapport
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;