// ==================================
// FICHIER: src/routes/devisRoutes.js 
// AVEC: Calcul automatique des totaux
// ==================================

const express = require('express');
const Devis = require('../models/Devis');
const Patient = require('../models/Patient');
const Analyse = require('../models/Analyse');
const router = express.Router();

// ===== FONCTION POUR GÉNÉRER UN NUMÉRO DE DEVIS =====
const genererNumero = async () => {
  const date = new Date();
  const annee = date.getFullYear();
  const mois = String(date.getMonth() + 1).padStart(2, '0');
  const jour = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `DEV-${annee}${mois}${jour}-${random}`;
};

// ===== POST CRÉER UN DEVIS (AVEC CALCULS) =====
router.post('/', async (req, res) => {
  try {
    const { 
      laboratoireId, 
      patientId, 
      createdBy, 
      lignes, 
      remiseGlobale, 
      notes, 
      devise 
    } = req.body;
    
    // ===== VALIDATIONS =====
    if (!laboratoireId || !patientId || !createdBy || !lignes || lignes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Données manquantes',
        required: ['laboratoireId', 'patientId', 'createdBy', 'lignes']
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

    // ===== TRAITEMENT DES LIGNES AVEC CALCUL DES TOTAUX =====
    let sousTotal = 0;
    const lignesTraitees = [];

    for (const ligne of lignes) {
      // Récupérer l'analyse complète pour avoir le prix
      const analyse = await Analyse.findById(ligne.analyseId);
      
      if (!analyse) {
        return res.status(404).json({
          success: false,
          message: `Analyse avec ID ${ligne.analyseId} non trouvée`
        });
      }

      const prixUnitaire = analyse.prix?.valeur || 0;
      const quantite = ligne.quantite || 1;
      const prixTotal = prixUnitaire * quantite;
      
      sousTotal += prixTotal;

      lignesTraitees.push({
        analyseId: analyse._id,
        code: analyse.code,
        nom: analyse.nom?.fr || analyse.nom,
        categorie: analyse.categorie,
        prixUnitaire: prixUnitaire,
        devise: ligne.devise || analyse.prix?.devise || 'EUR',
        quantite: quantite,
        prixTotal: prixTotal,
        observations: ligne.observations || ''
      });
    }

    // ===== CALCUL DU TOTAL AVEC REMISE =====
    const remise = remiseGlobale || 0;
    const total = sousTotal * (1 - remise / 100);

    // ===== CRÉATION DU DEVIS =====
    const nouveauDevis = new Devis({
      numero: await genererNumero(),
      laboratoireId,
      patientId,
      createdBy,
      devise: devise || 'EUR',
      lignes: lignesTraitees,
      sousTotal: { 
        valeur: Number(sousTotal.toFixed(2)), 
        devise: devise || 'EUR' 
      },
      total: { 
        valeur: Number(total.toFixed(2)), 
        devise: devise || 'EUR' 
      },
      remiseGlobale: remise,
      notes: notes || '',
      statut: 'brouillon',
      dateEmission: new Date(),
      dateValidite: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // +30 jours
    });
    
    await nouveauDevis.save();
    
    // Peupler les références pour la réponse
    await nouveauDevis.populate('patientId', 'nom prenom telephone');
    await nouveauDevis.populate('createdBy', 'nom prenom');
    
    res.status(201).json({
      success: true,
      message: 'Devis créé avec succès',
      devis: nouveauDevis
    });
    
  } catch (error) {
    console.error('❌ Erreur création devis:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur'
    });
  }
});

// ===== GET TOUS LES DEVIS D'UN LABORATOIRE =====
router.get('/labo/:laboratoireId', async (req, res) => {
  try {
    const devis = await Devis.find({ laboratoireId: req.params.laboratoireId })
      .populate('patientId', 'nom prenom')
      .populate('createdBy', 'nom prenom')
      .sort({ dateEmission: -1 });
    
    res.json({
      success: true,
      count: devis.length,
      devis
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ===== GET UN DEVIS PAR ID =====
router.get('/:id', async (req, res) => {
  try {
    const devis = await Devis.findById(req.params.id)
      .populate('patientId')
      .populate('createdBy')
      .populate('lignes.analyseId');
    
    if (!devis) {
      return res.status(404).json({
        success: false,
        message: 'Devis non trouvé'
      });
    }
    
    res.json({
      success: true,
      devis
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ===== SUPPRESSION LOGIQUE D'UN DEVIS =====
router.delete('/:id', async (req, res) => {
  try {
    const devis = await Devis.findById(req.params.id);
    
    if (!devis) {
      return res.status(404).json({
        success: false,
        message: 'Devis non trouvé'
      });
    }

    // Suppression logique (changer le statut)
    devis.statut = 'annule';
    devis.actif = false;
    
    // Ajouter à l'historique si la méthode existe
    if (typeof devis.ajouterHistorique === 'function') {
      devis.ajouterHistorique('SUPPRESSION', req.body.userId, { 
        date: new Date(),
        raison: 'Suppression manuelle'
      });
    }
    
    await devis.save();

    res.json({
      success: true,
      message: 'Devis annulé avec succès'
    });

  } catch (err) {
    console.error('❌ Erreur suppression devis:', err);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression'
    });
  }
});

// ===== CHANGER LE STATUT D'UN DEVIS =====
router.patch('/:id/statut', async (req, res) => {
  try {
    const { statut, userId } = req.body;
    const { id } = req.params;

    // Validation du statut
    const statutsValides = ['brouillon', 'envoye', 'accepte', 'refuse', 'paye', 'annule'];
    if (!statutsValides.includes(statut)) {
      return res.status(400).json({
        success: false,
        message: 'Statut invalide'
      });
    }

    const devis = await Devis.findById(id);
    if (!devis) {
      return res.status(404).json({
        success: false,
        message: 'Devis non trouvé'
      });
    }

    // Logique métier
    if (devis.statut === 'paye' && statut !== 'paye') {
      return res.status(400).json({
        success: false,
        message: 'Un devis payé ne peut pas changer de statut'
      });
    }

    if (devis.statut === 'annule') {
      return res.status(400).json({
        success: false,
        message: 'Un devis annulé ne peut pas être modifié'
      });
    }

    const ancienStatut = devis.statut;
    devis.statut = statut;
    
    if (statut === 'paye') {
      devis.datePaiement = new Date();
    }

    // Ajouter à l'historique
    if (typeof devis.ajouterHistorique === 'function') {
      devis.ajouterHistorique(
        'CHANGEMENT_STATUT',
        userId,
        { ancien: ancienStatut, nouveau: statut }
      );
    }

    await devis.save();

    res.json({
      success: true,
      message: `Statut mis à jour : ${statut}`,
      devis
    });

  } catch (error) {
    console.error('❌ Erreur changement statut:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

module.exports = router;