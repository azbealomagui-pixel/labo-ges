// ===========================================
// FICHIER: src/routes/devisRoutes.js 
// RÔLE: Routes pour la gestion des devis
// VERSION: Corrigée avec auth, permissions et audit
// ===========================================

const express = require('express');
const Devis = require('../models/Devis');
const Patient = require('../models/Patient');
const Analyse = require('../models/Analyse');
const AuditLog = require('../models/AuditLog');
const { authenticate } = require('../middleware/auth');
const { checkPermission } = require('../middleware/checkPermission');
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

// ===========================================
// CRÉER UN DEVIS (POST)
// ===========================================
router.post('/', authenticate, checkPermission('CREATE_DEVIS'), async (req, res) => {
  try {
    const { 
      laboratoireId, espaceId,
      patientId, 
      lignes, 
      remiseGlobale, 
      notes, 
      devise 
    } = req.body;
    
    const espace = laboratoireId || espaceId;
    const createdBy = req.user._id;

    // ===== VALIDATIONS =====
    if (!espace || !patientId || !lignes || lignes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Données manquantes',
        required: ['laboratoireId/espaceId', 'patientId', 'lignes']
      });
    }
    
    // Vérifier que le patient existe
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Client non trouvé'
      });
    }

    // ===== TRAITEMENT DES LIGNES AVEC CALCUL DES TOTAUX =====
    let sousTotal = 0;
    const lignesTraitees = [];

    for (const ligne of lignes) {
      const analyse = await Analyse.findById(ligne.analyseId);
      
      if (!analyse) {
        return res.status(404).json({
          success: false,
          message: `Analyse avec ID ${ligne.analyseId} non trouvée`
        });
      }

      const prixUnitaire = ligne.prixUnitaire || analyse.prix?.valeur || 0;
      const quantite = ligne.quantite || 1;
      const prixTotal = prixUnitaire * quantite;
      
      sousTotal += prixTotal;

      lignesTraitees.push({
        analyseId: analyse._id,
        code: analyse.code,
        nom: analyse.nom?.fr || analyse.nom,
        categorie: analyse.categorie,
        prixUnitaire,
        devise: ligne.devise || analyse.prix?.devise || 'EUR',
        quantite,
        prixTotal,
        observations: ligne.observations || ''
      });
    }

    // ===== CALCUL DU TOTAL AVEC REMISE =====
    const remise = remiseGlobale || 0;
    const total = sousTotal * (1 - remise / 100);

    // ===== CRÉATION DU DEVIS =====
    const nouveauDevis = new Devis({
      numero: await genererNumero(),
      laboratoireId: espace,
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
      dateValidite: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });
    
    await nouveauDevis.save();

    // ===== JOURNALISATION =====
    await AuditLog.create({
      espaceId: espace,
      utilisateurId: createdBy,
      action: 'CREATE_DEVIS',
      cible: {
        type: 'Devis',
        id: nouveauDevis._id,
        nom: `${patient.prenom} ${patient.nom}`
      },
      details: { montant: total, devise: devise || 'EUR' },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    // Peupler les références pour la réponse
    await nouveauDevis.populate('patientId', 'nom prenom telephone');
    await nouveauDevis.populate('createdBy', 'nom prenom');
    
    res.status(201).json({
      success: true,
      message: 'Devis créé avec succès',
      devis: nouveauDevis
    });
    
  } catch (error) {
    console.error('Erreur création devis:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur'
    });
  }
});

// ===========================================
// LISTER LES DEVIS D'UN ESPACE (GET)
// ===========================================
router.get('/labo/:espaceId', authenticate, checkPermission('VIEW_DEVIS'), async (req, res) => {
  try {
    const { espaceId } = req.params;
    
    const devis = await Devis.find({ laboratoireId: espaceId })
      .populate('patientId', 'nom prenom')
      .populate('createdBy', 'nom prenom')
      .sort({ dateEmission: -1 });
    
    res.json({
      success: true,
      count: devis.length,
      devis
    });
    
  } catch (error) {
    console.error('Erreur listage devis:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur'
    });
  }
});

// ===========================================
// OBTENIR UN DEVIS PAR ID (GET)
// ===========================================
router.get('/:id', authenticate, checkPermission('VIEW_DEVIS'), async (req, res) => {
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
    console.error('Erreur récupération devis:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur'
    });
  }
});

// ===========================================
// METTRE À JOUR UN DEVIS (PUT)
// ===========================================
router.put('/:id', authenticate, checkPermission('UPDATE_DEVIS'), async (req, res) => {
  try {
    const { id } = req.params;
    const { patientId, lignes, remiseGlobale, notes, devise } = req.body;

    const devis = await Devis.findById(id);
    if (!devis) {
      return res.status(404).json({
        success: false,
        message: 'Devis non trouvé'
      });
    }

    if (devis.statut === 'paye' || devis.statut === 'annule') {
      return res.status(400).json({
        success: false,
        message: 'Un devis payé ou annulé ne peut pas être modifié'
      });
    }

    // Recalculer les totaux
    let sousTotal = 0;
    const lignesTraitees = [];

    for (const ligne of lignes) {
      const analyse = await Analyse.findById(ligne.analyseId);
      if (!analyse) {
        return res.status(404).json({
          success: false,
          message: `Analyse avec ID ${ligne.analyseId} non trouvée`
        });
      }

      const prixUnitaire = ligne.prixUnitaire || analyse.prix?.valeur || 0;
      const quantite = ligne.quantite || 1;
      const prixTotal = prixUnitaire * quantite;
      
      sousTotal += prixTotal;

      lignesTraitees.push({
        analyseId: analyse._id,
        code: analyse.code,
        nom: analyse.nom?.fr || analyse.nom,
        categorie: analyse.categorie,
        prixUnitaire,
        devise: ligne.devise || analyse.prix?.devise || 'EUR',
        quantite,
        prixTotal,
        observations: ligne.observations || ''
      });
    }

    const remise = remiseGlobale || 0;
    const total = sousTotal * (1 - remise / 100);

    // Mettre à jour le devis
    devis.patientId = patientId || devis.patientId;
    devis.lignes = lignesTraitees;
    devis.remiseGlobale = remise;
    devis.notes = notes || devis.notes;
    devis.devise = devise || devis.devise;
    devis.sousTotal = { valeur: Number(sousTotal.toFixed(2)), devise: devis.devise };
    devis.total = { valeur: Number(total.toFixed(2)), devise: devis.devise };

    // Ajouter à l'historique
    if (typeof devis.ajouterHistorique === 'function') {
      devis.ajouterHistorique('MODIFICATION', req.user._id, {
        date: new Date(),
        modifications: req.body
      });
    }

    await devis.save();

    // ===== JOURNALISATION =====
    await AuditLog.create({
      espaceId: devis.laboratoireId,
      utilisateurId: req.user._id,
      action: 'UPDATE_DEVIS',
      cible: {
        type: 'Devis',
        id: devis._id,
        nom: `Devis ${devis.numero}`
      },
      details: { modifications: Object.keys(req.body) },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: 'Devis mis à jour',
      devis
    });

  } catch (error) {
    console.error('Erreur mise à jour devis:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur'
    });
  }
});

// ===========================================
// SUPPRIMER UN DEVIS (DELETE)
// ===========================================
router.delete('/:id', authenticate, checkPermission('DELETE_DEVIS'), async (req, res) => {
  try {
    const devis = await Devis.findByIdAndDelete(req.params.id);
    
    if (!devis) {
      return res.status(404).json({
        success: false,
        message: 'Devis non trouvé'
      });
    }

    // ===== JOURNALISATION =====
    await AuditLog.create({
      espaceId: devis.laboratoireId,
      utilisateurId: req.user._id,
      action: 'DELETE_DEVIS',
      cible: {
        type: 'Devis',
        id: devis._id,
        nom: `Devis ${devis.numero}`
      },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: '🗑️ Devis supprimé définitivement'
    });

  } catch (error) {
    console.error('Erreur suppression devis:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la suppression'
    });
  }
});

// ===========================================
// CHANGER LE STATUT D'UN DEVIS (PATCH)
// ===========================================
router.patch('/:id/statut', authenticate, checkPermission('UPDATE_DEVIS'), async (req, res) => {
  try {
    const { statut } = req.body;
    const { id } = req.params;

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
      devis.ajouterHistorique('CHANGEMENT_STATUT', req.user._id, {
        ancien: ancienStatut,
        nouveau: statut
      });
    }

    await devis.save();

    // ===== JOURNALISATION =====
    await AuditLog.create({
      espaceId: devis.laboratoireId,
      utilisateurId: req.user._id,
      action: 'UPDATE_DEVIS',
      cible: {
        type: 'Devis',
        id: devis._id,
        nom: `Devis ${devis.numero}`
      },
      details: { ancienStatut, nouveauStatut: statut },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: `Statut mis à jour : ${statut}`,
      devis
    });

  } catch (error) {
    console.error('Erreur changement statut:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur'
    });
  }
});

module.exports = router;