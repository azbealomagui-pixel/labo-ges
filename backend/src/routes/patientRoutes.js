// ===========================================
// FICHIER: src/routes/patientRoutes.js
// RÔLE: Routes pour la gestion des patients
// ===========================================

const express = require('express');
const Patient = require('../models/Patient');
const router = express.Router();

// CRÉER un patient (POST)
router.post('/', async (req, res) => {
  try {
    const { 
      nom, prenom, dateNaissance, sexe, 
      telephone, email, adresse,
      numeroSecuriteSociale, groupeSanguin,
      allergies, observations,
      laboratoireId, createdBy 
    } = req.body;
    
    // Vérifier les champs obligatoires
    if (!nom || !prenom || !dateNaissance || !sexe || !telephone || !adresse || !laboratoireId || !createdBy) {
      return res.status(400).json({
        success: false,
        message: 'Champs obligatoires manquants',
        required: ['nom', 'prenom', 'dateNaissance', 'sexe', 'telephone', 'adresse', 'laboratoireId', 'createdBy']
      });
    }
    
    // Créer le patient
    const newPatient = new Patient({
      nom, prenom, dateNaissance, sexe,
      telephone, email, adresse,
      numeroSecuriteSociale,
      groupeSanguin: groupeSanguin || 'Inconnu',
      allergies: allergies || [],
      observations,
      laboratoireId,
      createdBy
    });
    
    await newPatient.save();
    
    res.status(201).json({
      success: true,
      message: 'Patient créé avec succès',
      patient: newPatient
    });
    
  } catch (error) {
    console.error('Erreur création patient:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Ce numéro de sécurité sociale existe déjà'
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// LISTER tous les patients d'un laboratoire (GET)
router.get('/labo/:laboratoireId', async (req, res) => {
  try {
    const patients = await Patient.find({ 
      laboratoireId: req.params.laboratoireId 
    }).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: patients.length,
      patients
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// RECHERCHER des patients (GET /search?q=texte)
router.get('/search', async (req, res) => {
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
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// OBTENIR un patient par ID (GET /:id)
router.get('/:id', async (req, res) => {
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
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// METTRE À JOUR un patient (PUT /:id)
router.put('/:id', async (req, res) => {
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
    
    res.json({
      success: true,
      message: 'Patient mis à jour',
      patient
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ===== SUPPRESSION PHYSIQUE D'UN PATIENT =====
router.delete('/:id', async (req, res) => {
  try {
    const patient = await Patient.findByIdAndDelete(req.params.id);
    
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient non trouvé'
      });
    }

    res.json({
      success: true,
      message: 'Patient supprimé définitivement'
    });

  } catch (err) {
    console.error('Erreur suppression patient:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la suppression'
    });
  }
});

module.exports = router;