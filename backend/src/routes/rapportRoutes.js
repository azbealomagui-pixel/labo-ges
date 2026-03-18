// ===========================================
// ROUTES: rapportRoutes.js
// RÔLE: Gestion des rapports finaux
// VERSION: Finale avec sauvegarde persistante
// ===========================================

const express = require('express');
const Rapport = require('../models/Rapport');
const FicheAnalyse = require('../models/FicheAnalyse');
const Analyse = require('../models/Analyse');
const Patient = require('../models/Patient');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { checkPermission } = require('../middleware/checkPermission');
const router = express.Router();

// ===== CRÉER UN RAPPORT À PARTIR D'UNE FICHE =====
router.post('/from-fiche/:ficheId', authenticate, checkPermission('CREATE_RAPPORT'), async (req, res) => {
  try {
    const { ficheId } = req.params;
    const { validePar, resultats } = req.body;

    // Vérifier si un rapport existe déjà
    const existingRapport = await Rapport.findOne({ ficheAnalyseId: ficheId });
    if (existingRapport) {
      console.log('📋 Rapport déjà existant, renvoi de l\'existant');
      return res.status(200).json({
        success: true,
        message: 'Rapport déjà existant',
        rapport: existingRapport
      });
    }

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
      valeur: 0,
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
    console.log('✅ Nouveau rapport créé:', nouveauRapport._id);

    res.status(201).json({
      success: true,
      message: 'Rapport créé avec succès',
      rapport: nouveauRapport
    });

  } catch (error) {
    console.error('❌ Erreur création rapport:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Erreur serveur' 
    });
  }
});

// ===== METTRE À JOUR LES RÉSULTATS (VERSION CORRIGÉE) =====
router.put('/:id/resultats', authenticate, checkPermission('UPDATE_RAPPORT'), async (req, res) => {
  try {
    const { resultats } = req.body;
    const rapportId = req.params.id;
    
    console.log(`📥 Sauvegarde de ${resultats?.length || 0} résultats pour le rapport ${rapportId}`);
    console.log('📦 Données reçues:', JSON.stringify(resultats).substring(0, 200) + '...');

    // Utiliser findByIdAndUpdate avec l'opérateur $set pour forcer la mise à jour
    const rapport = await Rapport.findByIdAndUpdate(
      rapportId,
      { $set: { resultats: resultats } },
      { new: true, runValidators: true }
    );

    if (!rapport) {
      return res.status(404).json({
        success: false,
        message: 'Rapport non trouvé'
      });
    }

    console.log(`✅ ${resultats?.length || 0} résultats sauvegardés en base`);
    console.log('📤 Rapport après sauvegarde:', {
      id: rapport._id,
      statut: rapport.statut,
      nbResultats: rapport.resultats?.length,
      premierResultat: rapport.resultats?.[0] ? {
        valeur: rapport.resultats[0].valeur,
        interpretation: rapport.resultats[0].interpretation
      } : null
    });

    res.json({
      success: true,
      message: '✅ Résultats sauvegardés',
      rapport
    });

  } catch (error) {
    console.error('❌ Erreur mise à jour résultats:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Erreur serveur' 
    });
  }
});

// ===== VALIDER LE RAPPORT =====
router.patch('/:id/valider', authenticate, checkPermission('VALIDATE_RAPPORT'), async (req, res) => {
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
    console.log('✅ Rapport validé:', rapport._id);

    res.json({
      success: true,
      message: '✅ Rapport validé',
      rapport
    });

  } catch (error) {
    console.error('❌ Erreur validation:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Erreur serveur' 
    });
  }
});

// ===== OBTENIR UN RAPPORT =====
router.get('/:id', authenticate, checkPermission('VIEW_RAPPORTS'), async (req, res) => {
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

    console.log(`📤 Rapport ${rapport._id} chargé avec ${rapport.resultats?.length || 0} résultats`);
    if (rapport.resultats?.length > 0) {
      console.log('📊 Premier résultat:', {
        valeur: rapport.resultats[0].valeur,
        interpretation: rapport.resultats[0].interpretation
      });
    }

    res.json({
      success: true,
      rapport
    });

  } catch (error) {
    console.error('❌ Erreur récupération rapport:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'ID de rapport invalide'
      });
    }

    res.status(500).json({ 
      success: false, 
      message: error.message || 'Erreur serveur' 
    });
  }
});

module.exports = router;