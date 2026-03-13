// ===========================================
// ROUTES: espaceRoutes.js
// RÔLE: Gestion des espaces (CRUD complet)
// ===========================================

const express = require('express');
const Espace = require('../models/Espace');
const User = require('../models/User');
const router = express.Router();

// ===== MIDDLEWARE D'AUTHENTIFICATION (à importer) =====
// const { protect } = require('../middleware/auth');

// ===========================================
// CRÉER UN ESPACE (POST)
// ===========================================
router.post('/', async (req, res) => {
  try {
    const { 
      nom, adresse, telephone, email, 
      numeroLicence, numeroFiscal,
      deviseParDefaut, langueParDefaut,
      createdBy 
    } = req.body;

    // ===== VALIDATIONS =====
    const missingFields = [];
    if (!nom) missingFields.push('nom');
    if (!adresse) missingFields.push('adresse');
    if (!telephone) missingFields.push('telephone');
    if (!email) missingFields.push('email');
    if (!numeroLicence) missingFields.push('numeroLicence');
    if (!createdBy) missingFields.push('createdBy');

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Champs obligatoires manquants',
        required: missingFields
      });
    }

    // Vérifier si le nom existe déjà
    const existingNom = await Espace.findOne({ nom });
    if (existingNom) {
      return res.status(409).json({
        success: false,
        message: 'Ce nom d\'espace est déjà utilisé'
      });
    }

    // Vérifier si la licence existe déjà
    const existingLicence = await Espace.findOne({ numeroLicence });
    if (existingLicence) {
      return res.status(409).json({
        success: false,
        message: 'Ce numéro de licence existe déjà'
      });
    }

    // Vérifier si l'email existe déjà
    const existingEmail = await Espace.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: 'Cet email est déjà utilisé'
      });
    }

    // ===== CRÉATION DE L'ESPACE =====
    const nouvelEspace = new Espace({
      nom,
      adresse,
      telephone,
      email,
      numeroLicence,
      numeroFiscal: numeroFiscal || '',
      deviseParDefaut: deviseParDefaut || 'EUR',
      langueParDefaut: langueParDefaut || 'fr',
      createdBy,
      abonnement: {
        type: 'gratuit',
        dateDebut: new Date(),
        statut: 'actif'
      }
    });

    await nouvelEspace.save();

    // ===== METTRE À JOUR L'UTILISATEUR =====
    await User.findByIdAndUpdate(createdBy, {
      espaceId: nouvelEspace._id,
      estProprietaire: true
    });

    // ===== RÉPONSE =====
    res.status(201).json({
      success: true,
      message: 'Espace créé avec succès',
      espace: nouvelEspace
    });

  } catch (error) {
    console.error('❌ Erreur création espace:', error);
    
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
      message: error.message || 'Erreur serveur'
    });
  }
});

// ===========================================
// LISTER TOUS LES ESPACES (GET)
// ===========================================
router.get('/', async (req, res) => {
  try {
    const espaces = await Espace.find()
      .populate('createdBy', 'nom prenom email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: espaces.length,
      espaces
    });

  } catch (error) {
    console.error('❌ Erreur listage espaces:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du chargement des espaces'
    });
  }
});

// ===========================================
// OBTENIR UN ESPACE PAR ID (GET)
// ===========================================
router.get('/:id', async (req, res) => {
  try {
    const espace = await Espace.findById(req.params.id)
      .populate('createdBy', 'nom prenom email')
      .populate('employes');

    if (!espace) {
      return res.status(404).json({
        success: false,
        message: 'Espace non trouvé'
      });
    }

    res.json({
      success: true,
      espace
    });

  } catch (error) {
    console.error('❌ Erreur récupération espace:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'ID d\'espace invalide'
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur'
    });
  }
});

// ===========================================
// METTRE À JOUR UN ESPACE (PUT)
// ===========================================
router.put('/:id', async (req, res) => {
  try {
    // Empêcher la modification de certains champs
    const updates = { ...req.body };
    delete updates._id;
    delete updates.__v;
    delete updates.createdBy;
    delete updates.abonnement; // L'abonnement se gère ailleurs

    const espace = await Espace.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!espace) {
      return res.status(404).json({
        success: false,
        message: 'Espace non trouvé'
      });
    }

    res.json({
      success: true,
      message: 'Espace mis à jour avec succès',
      espace
    });

  } catch (error) {
    console.error('❌ Erreur mise à jour espace:', error);
    
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
      message: error.message || 'Erreur serveur'
    });
  }
});

// ===========================================
// SUPPRIMER (DÉSACTIVER) UN ESPACE (DELETE)
// ===========================================
router.delete('/:id', async (req, res) => {
  try {
    const espace = await Espace.findById(req.params.id);

    if (!espace) {
      return res.status(404).json({
        success: false,
        message: 'Espace non trouvé'
      });
    }

    // Suppression logique (désactivation)
    espace.actif = false;
    await espace.save();

    // Désactiver tous les utilisateurs de cet espace
    await User.updateMany(
      { espaceId: req.params.id },
      { actif: false }
    );

    res.json({
      success: true,
      message: 'Espace désactivé avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur suppression espace:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur'
    });
  }
});

// ===========================================
// LISTER LES EMPLOYÉS D'UN ESPACE (GET)
// ===========================================
router.get('/:id/employes', async (req, res) => {
  try {
    const employes = await User.find({ 
      espaceId: req.params.id,
      actif: true 
    })
    .select('-password')
    .sort({ estProprietaire: -1, nom: 1 });

    res.json({
      success: true,
      count: employes.length,
      employes
    });

  } catch (error) {
    console.error('❌ Erreur chargement employés:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur'
    });
  }
});

// ===========================================
// CRÉER UN EMPLOYÉ DANS UN ESPACE (POST)
// ===========================================
router.post('/:id/employes', async (req, res) => {
  try {
    const { nom, prenom, email, password, role, poste } = req.body;
    const espaceId = req.params.id;

    // ===== VALIDATIONS =====
    if (!nom || !prenom || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Champs obligatoires manquants',
        required: ['nom', 'prenom', 'email', 'password']
      });
    }

    // Vérifier que l'espace existe
    const espace = await Espace.findById(espaceId);
    if (!espace) {
      return res.status(404).json({
        success: false,
        message: 'Espace non trouvé'
      });
    }

    // Vérifier si l'email existe déjà
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Cet email est déjà utilisé'
      });
    }

    // ===== CRÉATION DE L'EMPLOYÉ =====
    const nouvelEmploye = new User({
      nom,
      prenom,
      email,
      password,
      role: role || 'technicien',
      espaceId,
      estProprietaire: false,
      poste: poste || '',
      actif: true
    });

    await nouvelEmploye.save();

    // ===== RÉPONSE SANS MOT DE PASSE =====
    const employeResponse = nouvelEmploye.toObject();
    delete employeResponse.password;

    res.status(201).json({
      success: true,
      message: 'Employé créé avec succès',
      employe: employeResponse
    });

  } catch (error) {
    console.error('❌ Erreur création employé:', error);
    
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
      message: error.message || 'Erreur serveur'
    });
  }
});

module.exports = router;