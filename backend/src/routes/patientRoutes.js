// ===========================================
// FICHIER: src/routes/patientRoutes.js
// RÔLE: Routes pour la gestion des patients
// VERSION: Accepte laboratoireId OU espaceId
// ===========================================

const express = require('express');
const Patient = require('../models/Patient');
const AuditLog = require('../models/AuditLog');
const { authenticate } = require('../middleware/auth');
const { checkPermission } = require('../middleware/checkPermission');
const router = express.Router();

// ===========================================
// CRÉER un patient (POST)
// ===========================================
router.post('/', authenticate, checkPermission('CREATE_PATIENT'), async (req, res) => {
  try {
    const { 
      nom, prenom, dateNaissance, sexe, 
      telephone, email, adresse,
      numeroSecuriteSociale, groupeSanguin,
      allergies, observations,
      laboratoireId, espaceId
    } = req.body;
    
    // L'utilisateur authentifié devient le créateur
    const createdBy = req.user._id;

    // === SOLUTION : Accepter laboratoireId OU espaceId ===
    const espace = laboratoireId || espaceId;

    // === VALIDATION ===
    const missingFields = [];
    if (!nom?.trim()) missingFields.push('nom');
    if (!prenom?.trim()) missingFields.push('prenom');
    if (!dateNaissance) missingFields.push('dateNaissance');
    if (!sexe) missingFields.push('sexe');
    if (!telephone?.trim()) missingFields.push('telephone');
    if (!adresse?.trim()) missingFields.push('adresse');
    if (!espace) missingFields.push('laboratoireId ou espaceId');

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Champs obligatoires manquants',
        required: missingFields
      });
    }

    // Validation email
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Format email invalide'
      });
    }

    // Validation téléphone
    if (!/^[0-9+\-\s]{8,}$/.test(telephone)) {
      return res.status(400).json({
        success: false,
        message: 'Format téléphone invalide (minimum 8 chiffres)'
      });
    }

    // Validation date naissance
    if (new Date(dateNaissance) > new Date()) {
      return res.status(400).json({
        success: false,
        message: 'La date de naissance ne peut pas être dans le futur'
      });
    }
    
    // Création du patient (avec espace au lieu de laboratoireId)
    const newPatient = new Patient({
      nom: nom.trim(),
      prenom: prenom.trim(),
      dateNaissance,
      sexe,
      telephone: telephone.trim(),
      email: email?.trim().toLowerCase() || '',
      adresse: adresse.trim(),
      numeroSecuriteSociale: numeroSecuriteSociale?.trim() || '',
      groupeSanguin: groupeSanguin || 'Inconnu',
      allergies: allergies || [],
      observations: observations?.trim() || '',
      laboratoireId: espace,
      createdBy
    });
    
    await newPatient.save();

    // Journalisation (utilise espace pour AuditLog)
    await AuditLog.create({
      espaceId: espace,
      utilisateurId: createdBy,
      action: 'CREATE_PATIENT',
      cible: {
        type: 'Patient',
        id: newPatient._id,
        nom: `${newPatient.prenom} ${newPatient.nom}`
      },
      details: { sexe: newPatient.sexe },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.status(201).json({
      success: true,
      message: '✅ Patient créé avec succès',
      patient: newPatient
    });
    
  } catch (error) {
    console.error('❌ Erreur création patient:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Ce numéro de sécurité sociale existe déjà'
      });
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: Object.keys(error.errors).map(key => ({
          field: key,
          message: error.errors[key].message
        }))
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du patient'
    });
  }
});

// ===========================================
// LISTER tous les patients (GET)
// ===========================================
router.get('/labo/:espaceId', authenticate, checkPermission('VIEW_PATIENTS'), async (req, res) => {
  try {
    const { espaceId } = req.params;
    const { page = 1, limit = 50, search } = req.query;

    // CORRECTION : Utilisez laboratoireId dans la requête (c'est le nom du champ dans la base)
    const query = { laboratoireId: espaceId };
    
    if (search && search.length >= 2) {
      query.$or = [
        { nom: { $regex: search, $options: 'i' } },
        { prenom: { $regex: search, $options: 'i' } },
        { telephone: { $regex: search, $options: 'i' } },
        { numeroSecuriteSociale: { $regex: search, $options: 'i' } }
      ];
    }

    const patients = await Patient.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const total = await Patient.countDocuments(query);

    res.json({
      success: true,
      count: patients.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      patients
    });
    
  } catch (error) {
    console.error('❌ Erreur listage patients:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du chargement des patients'
    });
  }
});

// ===========================================
// RECHERCHER des patients (GET /search)
// ===========================================
router.get('/search', authenticate, checkPermission('VIEW_PATIENTS'), async (req, res) => {
  try {
    const { q, espaceId } = req.query;
    
    if (!q || q.length < 2 || !espaceId) {
      return res.json({ success: true, patients: [] });
    }
    
    const patients = await Patient.find({
      laboratoireId: espaceId,
      $or: [
        { nom: { $regex: q, $options: 'i' } },
        { prenom: { $regex: q, $options: 'i' } },
        { telephone: { $regex: q, $options: 'i' } },
        { numeroSecuriteSociale: { $regex: q, $options: 'i' } }
      ]
    }).limit(20);
    
    res.json({
      success: true,
      count: patients.length,
      patients
    });
    
  } catch (error) {
    console.error('❌ Erreur recherche patients:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la recherche'
    });
  }
});

// ===========================================
// OBTENIR un patient par ID (GET /:id)
// ===========================================
router.get('/:id', authenticate, checkPermission('VIEW_PATIENTS'), async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient non trouvé'
      });
    }
    
    res.json({
      success: true,
      patient
    });
    
  } catch (error) {
    console.error('❌ Erreur récupération patient:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'ID patient invalide'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du patient'
    });
  }
});

// ===========================================
// METTRE À JOUR un patient (PUT /:id)
// ===========================================
router.put('/:id', authenticate, checkPermission('UPDATE_PATIENT'), async (req, res) => {
  try {
    // Préparer les données à mettre à jour
    const updates = { ...req.body };
    
    // CORRECTION : Si espaceId est envoyé mais que le modèle attend laboratoireId
    if (updates.espaceId && !updates.laboratoireId) {
      updates.laboratoireId = updates.espaceId;
      delete updates.espaceId;
    }
    
    const patient = await Patient.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );
    
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient non trouvé'
      });
    }

    // Journalisation
    await AuditLog.create({
      espaceId: patient.laboratoireId,
      utilisateurId: req.user._id,
      action: 'UPDATE_PATIENT',
      cible: {
        type: 'Patient',
        id: patient._id,
        nom: `${patient.prenom} ${patient.nom}`
      },
      details: { modifications: Object.keys(req.body) },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.json({
      success: true,
      message: '✅ Patient mis à jour',
      patient
    });
    
  } catch (error) {
    console.error('❌ Erreur mise à jour patient:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: Object.keys(error.errors).map(key => ({
          field: key,
          message: error.errors[key].message
        }))
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour'
    });
  }
});

// ===========================================
// SUPPRIMER un patient (DELETE /:id)
// ===========================================
router.delete('/:id', authenticate, checkPermission('DELETE_PATIENT'), async (req, res) => {
  try {
    const patient = await Patient.findByIdAndDelete(req.params.id);
    
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient non trouvé'
      });
    }

    // Journalisation
    await AuditLog.create({
      espaceId: patient.espaceId,
      utilisateurId: req.user._id,
      action: 'DELETE_PATIENT',
      cible: {
        type: 'Patient',
        id: patient._id,
        nom: `${patient.prenom} ${patient.nom}`
      },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: '🗑️ Patient supprimé définitivement'
    });

  } catch (error) {
    console.error('❌ Erreur suppression patient:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression'
    });
  }
});

module.exports = router;