// ===========================================
// ROUTES: rapportRoutes.js
// RÔLE: Gestion des rapports finaux
// VERSION: Finale avec unité et valeurs de référence
// ===========================================

const express = require('express');
const Rapport = require('../models/Rapport');
const FicheAnalyse = require('../models/FicheAnalyse');
const Patient = require('../models/Patient');
const { authenticate } = require('../middleware/auth');
const { checkPermission } = require('../middleware/checkPermission');
const router = express.Router();

// ===========================================
// ROUTES: rapportRoutes.js (extrait corrigé)
// ===========================================

// ===== CRÉER UN RAPPORT À PARTIR D'UNE FICHE =====
router.post('/from-fiche/:ficheId', authenticate, checkPermission('CREATE_RAPPORT'), async (req, res) => {
  try {
    const { ficheId } = req.params;
    const { validePar } = req.body;

    // Vérifier si un rapport existe déjà
    const existing = await Rapport.findOne({ ficheAnalyseId: ficheId });
    if (existing) {
      return res.status(200).json({ success: true, message: 'Rapport déjà existant', rapport: existing });
    }

    // Récupérer la fiche avec les analyses complètes
    const fiche = await FicheAnalyse.findById(ficheId)
      .populate('patientId')
      .populate({
        path: 'lignes.analyseId',
        model: 'Analyse'
      });

    if (!fiche) {
      return res.status(404).json({ success: false, message: 'Fiche non trouvée' });
    }

    console.log('📋 Fiche chargée:', {
      patient: fiche.patientId?.nom,
      analyses: fiche.lignes.length
    });

    // ===== PRÉPARER LES RÉSULTATS AVEC TOUTES LES DONNÉES =====
    const resultatsPreparés = fiche.lignes.map(ligne => {
      const analyse = ligne.analyseId;
      
      // Récupérer les valeurs de référence pour chaque sexe
      const valeursRef = {
        homme: analyse.valeursReference?.homme || { min: null, max: null, texte: '' },
        femme: analyse.valeursReference?.femme || { min: null, max: null, texte: '' },
        enfant: analyse.valeursReference?.enfant || { min: null, max: null, texte: '' }
      };

      console.log(`📊 Analyse ${analyse.code}:`, {
        unite: analyse.uniteMesure,
        normesHomme: valeursRef.homme,
        normesFemme: valeursRef.femme
      });

      return {
        analyseId: analyse._id,
        code: analyse.code,
        nom: analyse.nom?.fr || analyse.nom,
        valeur: 0,
        unite: analyse.uniteMesure || '',
        valeurReference: valeursRef,
        interpretation: 'normal',
        commentaire: ''
      };
    });

    const nouveauRapport = new Rapport({
      ficheAnalyseId: ficheId,
      patientId: fiche.patientId._id,
      espaceId: fiche.laboratoireId,
      resultats: resultatsPreparés,
      validePar,
      statut: 'brouillon'
    });

    await nouveauRapport.save();

    // Peupler les données pour la réponse
    await nouveauRapport.populate('patientId');
    await nouveauRapport.populate('validePar', 'nom prenom');

    console.log('✅ Rapport créé avec succès, patient:', nouveauRapport.patientId?.nom);

    res.status(201).json({ success: true, message: 'Rapport créé', rapport: nouveauRapport });
  } catch (error) {
    console.error('❌ Erreur création rapport:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ===== METTRE À JOUR LES RÉSULTATS =====
router.put('/:id/resultats', authenticate, checkPermission('UPDATE_RAPPORT'), async (req, res) => {
  try {
    const { resultats } = req.body;
    const rapport = await Rapport.findByIdAndUpdate(
      req.params.id,
      { $set: { resultats } },
      { new: true, runValidators: true }
    );
    if (!rapport) return res.status(404).json({ success: false, message: 'Rapport non trouvé' });
    res.json({ success: true, message: '✅ Résultats sauvegardés', rapport });
  } catch (error) {
    console.error('❌ Erreur mise à jour résultats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ===== VALIDER LE RAPPORT =====
router.patch('/:id/valider', authenticate, checkPermission('VALIDATE_RAPPORT'), async (req, res) => {
  try {
    const { signature, cachet } = req.body;
    const rapport = await Rapport.findById(req.params.id);
    if (!rapport) return res.status(404).json({ success: false, message: 'Rapport non trouvé' });

    rapport.statut = 'final';
    rapport.signature = signature;
    rapport.cachet = cachet;
    rapport.dateValidation = new Date();
    const qrData = `RAPPORT:${rapport._id}|PATIENT:${rapport.patientId}|DATE:${Date.now()}`;
    rapport.qrCode = Buffer.from(qrData).toString('base64');
    await rapport.save();

    res.json({ success: true, message: '✅ Rapport validé', rapport });
  } catch (error) {
    console.error('❌ Erreur validation:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ===== OBTENIR UN RAPPORT =====
router.get('/:id', authenticate, checkPermission('VIEW_RAPPORTS'), async (req, res) => {
  try {
    const rapport = await Rapport.findById(req.params.id)
      .populate('patientId')
      .populate('validePar', 'nom prenom')
      .populate('resultats.analyseId');
    if (!rapport) return res.status(404).json({ success: false, message: 'Rapport non trouvé' });
    res.json({ success: true, rapport });
  } catch (error) {
    console.error('❌ Erreur récupération rapport:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;