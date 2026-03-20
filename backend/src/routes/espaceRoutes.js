// ===========================================
// ROUTES: espaceRoutes.js
// RÔLE: Gestion des espaces (CRUD complet)
// ===========================================

const express = require('express');
const Espace = require('../models/Espace');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../middleware/auth');
const { checkPermission } = require('../middleware/checkPermission');
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



// ===== CONFIGURATION DE MULTER =====
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/logos');
    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const espaceId = req.params.espaceId;
    const extension = path.extname(file.originalname);
    cb(null, `logo-${espaceId}${extension}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Accepter seulement les images
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Format de fichier non supporté. Utilisez JPG, PNG, GIF ou SVG.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
  fileFilter: fileFilter
});


// ===========================================
// OBTENIR UN ESPACE PAR ID (GET) 
// ===========================================
router.get('/:id', authenticate, checkPermission('VIEW_SETTINGS'), async (req, res) => {
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

/// ===========================================
// METTRE À JOUR UN ESPACE (PUT)
// ===========================================
router.put('/:id', authenticate, checkPermission('UPDATE_SETTINGS'), async (req, res) => {
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

// ===========================================
// LISTER LES MEMBRES D'UN ESPACE (GET)
// ===========================================
router.get('/:id/membres', async (req, res) => {
  try {
    const membres = await User.find({ 
      espaceId: req.params.id,
      actif: true 
    })
    .select('-password')
    .sort({ estProprietaire: -1, role: 1, nom: 1 });

    res.json({
      success: true,
      count: membres.length,
      membres
    });

  } catch (error) {
    console.error('❌ Erreur chargement membres:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur'
    });
  }
});


// ===========================================
// CRÉER UN MEMBRE DANS L'ESPACE (POST)
// ===========================================
router.post('/:id/membres', async (req, res) => {
  try {
    const { nom, prenom, email, password, role, poste } = req.body;
    const espaceId = req.params.id;

    // Validation
    const missingFields = [];
    if (!nom) missingFields.push('nom');
    if (!prenom) missingFields.push('prenom');
    if (!email) missingFields.push('email');
    if (!password) missingFields.push('password');

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Champs obligatoires manquants',
        required: missingFields
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

    // Vérifier email unique
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Cet email est déjà utilisé'
      });
    }

    // Créer le membre
    const nouveauMembre = new User({
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

    await nouveauMembre.save();

    const membreResponse = nouveauMembre.toObject();
    delete membreResponse.password;

    res.status(201).json({
      success: true,
      message: 'Membre créé avec succès',
      membre: membreResponse
    });

  } catch (error) {
    console.error('❌ Erreur création membre:', error);
    
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
// METTRE À JOUR UN MEMBRE (PUT)
// ===========================================
router.put('/:espaceId/membres/:userId', async (req, res) => {
  try {
    const { role, poste, actif } = req.body;
    const { espaceId, userId } = req.params;

    // Vérifier que le membre appartient bien à cet espace
    const membre = await User.findOne({ 
      _id: userId, 
      espaceId: espaceId 
    });

    if (!membre) {
      return res.status(404).json({
        success: false,
        message: 'Membre non trouvé dans cet espace'
      });
    }

    // Empêcher la modification du propriétaire
    if (membre.estProprietaire) {
      return res.status(403).json({
        success: false,
        message: 'Le propriétaire ne peut pas être modifié'
      });
    }

    // Mise à jour
    if (role) membre.role = role;
    if (poste !== undefined) membre.poste = poste;
    if (actif !== undefined) membre.actif = actif;

    await membre.save();

    const membreResponse = membre.toObject();
    delete membreResponse.password;

    res.json({
      success: true,
      message: 'Membre mis à jour',
      membre: membreResponse
    });

  } catch (error) {
    console.error('❌ Erreur mise à jour membre:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur'
    });
  }
});


// ===========================================
// UPLOADER LE LOGO (POST) - VERSION CORRIGÉE
// ===========================================
router.post('/:espaceId/logo', authenticate, checkPermission('UPDATE_SETTINGS'), upload.single('logo'), async (req, res) => {
  try {
    const { espaceId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier téléchargé'
      });
    }

    // Générer l'URL du logo
    const logoUrl = `/uploads/logos/${req.file.filename}`;
    
    // Mettre à jour l'espace avec l'URL du logo
    const espace = await Espace.findByIdAndUpdate(
      espaceId,
      { logo: logoUrl },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Logo téléchargé avec succès',
      logo: logoUrl
    });

  } catch (error) {
    console.error('❌ Erreur upload logo:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors du téléchargement'
    });
  }
});

// ===========================================
// SUPPRIMER LE LOGO (DELETE)
// ===========================================
router.delete('/:espaceId/logo', authenticate, checkPermission('UPDATE_SETTINGS'), async (req, res) => {
  try {
    const { espaceId } = req.params;
    
    const espace = await Espace.findById(espaceId);
    if (!espace) {
      return res.status(404).json({
        success: false,
        message: 'Espace non trouvé'
      });
    }

    // Supprimer le fichier physique
    if (espace.logo) {
      const filePath = path.join(__dirname, '../../', espace.logo);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Mettre à jour l'espace
    espace.logo = null;
    await espace.save();

    res.json({
      success: true,
      message: 'Logo supprimé avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur suppression logo:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la suppression'
    });
  }
});

module.exports = router;