// ===========================================
// FICHIER: src/routes/patientRoutes.js
// RÔLE: Routes pour la gestion des patients
// VERSION: Avec permissions, journalisation et validation renforcée
// ===========================================

const express = require('express');
const Patient = require('../models/Patient');
const AuditLog = require('../models/AuditLog');
const { checkPermission } = require('../middleware/checkPermission');
const router = express.Router();

// ===========================================
// CRÉER un patient (POST)
// ===========================================
router.post('/', checkPermission('CREATE_PATIENT'), async (req, res) => {
  try {
    const { 
      nom, prenom, dateNaissance, sexe, 
      telephone, email, adresse,
      numeroSecuriteSociale, groupeSanguin,
      allergies, observations,
      laboratoireId, createdBy 
    } = req.body;
    
    // === VALIDATION RENFORCÉE ===
    const missingFields = [];
    if (!nom?.trim()) missingFields.push('nom');
    if (!prenom?.trim()) missingFields.push('prenom');
    if (!dateNaissance) missingFields.push('dateNaissance');
    if (!sexe) missingFields.push('sexe');
    if (!telephone?.trim()) missingFields.push('telephone');
    if (!adresse?.trim()) missingFields.push('adresse');
    if (!laboratoireId) missingFields.push('laboratoireId');
    if (!createdBy) missingFields.push('createdBy');

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Champs obligatoires manquants',
        required: missingFields
      });
    }

    // Validation du format email (si fourni)
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Format email invalide'
      });
    }

    // Validation du téléphone (minimum 8 chiffres)
    if (!/^[0-9+\-\s]{8,}$/.test(telephone)) {
      return res.status(400).json({
        success: false,
        message: 'Format téléphone invalide (minimum 8 chiffres)'
      });
    }

    // Validation de la date de naissance (pas dans le futur)
    if (new Date(dateNaissance) > new Date()) {
      return res.status(400).json({
        success: false,
        message: 'La date de naissance ne peut pas être dans le futur'
      });
    }
    
    // Créer le patient
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
      laboratoireId,
      createdBy
    });
    
    await newPatient.save();

    // === JOURNALISATION ===
    await AuditLog.create({
      espaceId: laboratoireId,
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
// LISTER tous les patients d'un laboratoire (GET)
// ===========================================
router.get('/labo/:laboratoireId', checkPermission('VIEW_PATIENTS'), async (req, res) => {
  try {
    const { laboratoireId } = req.params;
    const { page = 1, limit = 50, search } = req.query;

    const query = { laboratoireId };
    
    // Recherche optionnelle
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
// RECHERCHER des patients (GET /search?q=texte)
// ===========================================
router.get('/search', checkPermission('VIEW_PATIENTS'), async (req, res) => {
  try {
    const { q, laboratoireId } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({ success: true, patients: [] });
    }
    
    const patients = await Patient.find({
      laboratoireId,
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
router.get('/:id', checkPermission('VIEW_PATIENTS'), async (req, res) => {
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
router.put('/:id', checkPermission('UPDATE_PATIENT'), async (req, res) => {
  try {
    const patient = await Patient.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient non trouvé'
      });
    }

    // === JOURNALISATION ===
    await AuditLog.create({
      espaceId: patient.laboratoireId,
      utilisateurId: req.user?._id,
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
router.delete('/:id', checkPermission('DELETE_PATIENT'), async (req, res) => {
  try {
    const patient = await Patient.findByIdAndDelete(req.params.id);
    
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient non trouvé'
      });
    }

    // === JOURNALISATION ===
    await AuditLog.create({
      espaceId: patient.laboratoireId,
      utilisateurId: req.user?._id,
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