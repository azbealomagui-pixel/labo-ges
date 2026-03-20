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

// ===== CONFIGURATION DE MULTER =====
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/logos');
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
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Format non supporté'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: fileFilter
});

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

    const existingNom = await Espace.findOne({ nom });
    if (existingNom) {
      return res.status(409).json({ success: false, message: 'Ce nom d\'espace est déjà utilisé' });
    }

    const existingLicence = await Espace.findOne({ numeroLicence });
    if (existingLicence) {
      return res.status(409).json({ success: false, message: 'Ce numéro de licence existe déjà' });
    }

    const existingEmail = await Espace.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({ success: false, message: 'Cet email est déjà utilisé' });
    }

    const nouvelEspace = new Espace({
      nom, adresse, telephone, email, numeroLicence,
      numeroFiscal: numeroFiscal || '',
      deviseParDefaut: deviseParDefaut || 'EUR',
      langueParDefaut: langueParDefaut || 'fr',
      createdBy,
      abonnement: { type: 'gratuit', dateDebut: new Date(), statut: 'actif' }
    });

    await nouvelEspace.save();
    await User.findByIdAndUpdate(createdBy, { espaceId: nouvelEspace._id, estProprietaire: true });

    res.status(201).json({ success: true, message: 'Espace créé avec succès', espace: nouvelEspace });
  } catch (error) {
    console.error('❌ Erreur création espace:', error);
    res.status(500).json({ success: false, message: error.message || 'Erreur serveur' });
  }
});

// ===========================================
// OBTENIR UN ESPACE PAR ID (GET) - UNIQUE VERSION AVEC AUTH
// ===========================================
router.get('/:id', authenticate, async (req, res) => {
  try {
    const espace = await Espace.findById(req.params.id);
    if (!espace) {
      return res.status(404).json({ success: false, message: 'Espace non trouvé' });
    }
    res.json({ success: true, espace });
  } catch (error) {
    console.error('❌ Erreur récupération espace:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'ID d\'espace invalide' });
    }
    res.status(500).json({ success: false, message: error.message || 'Erreur serveur' });
  }
});

// ===========================================
// METTRE À JOUR UN ESPACE (PUT)
// ===========================================
router.put('/:id', authenticate, checkPermission('UPDATE_SETTINGS'), async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates._id;
    delete updates.__v;
    delete updates.createdBy;
    delete updates.abonnement;
    delete updates.logo;

    const espace = await Espace.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!espace) {
      return res.status(404).json({ success: false, message: 'Espace non trouvé' });
    }
    res.json({ success: true, message: 'Espace mis à jour', espace });
  } catch (error) {
    console.error('❌ Erreur mise à jour espace:', error);
    res.status(500).json({ success: false, message: error.message || 'Erreur serveur' });
  }
});

// ===========================================
// UPLOADER LE LOGO (POST)
// ===========================================
router.post('/:espaceId/logo', authenticate, checkPermission('UPDATE_SETTINGS'), upload.single('logo'), async (req, res) => {
  try {
    const { espaceId } = req.params;
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Aucun fichier' });
    }

    const logoUrl = `/uploads/logos/${req.file.filename}`;
    const espace = await Espace.findByIdAndUpdate(espaceId, { logo: logoUrl }, { new: true });

    res.json({ success: true, message: 'Logo téléchargé', logo: logoUrl });
  } catch (error) {
    console.error('❌ Erreur upload:', error);
    res.status(500).json({ success: false, message: error.message });
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
      return res.status(404).json({ success: false, message: 'Espace non trouvé' });
    }

    if (espace.logo) {
      const filePath = path.join(__dirname, '../../', espace.logo);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    espace.logo = null;
    await espace.save();

    res.json({ success: true, message: 'Logo supprimé' });
  } catch (error) {
    console.error('❌ Erreur suppression:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ===========================================
// LISTER LES MEMBRES D'UN ESPACE (GET)
// ===========================================
router.get('/:id/membres', authenticate, async (req, res) => {
  try {
    const membres = await User.find({ espaceId: req.params.id, actif: true })
      .select('-password')
      .sort({ estProprietaire: -1, role: 1, nom: 1 });

    res.json({ success: true, count: membres.length, membres });
  } catch (error) {
    console.error('❌ Erreur chargement membres:', error);
    res.status(500).json({ success: false, message: error.message || 'Erreur serveur' });
  }
});

module.exports = router;