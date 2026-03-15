// ===========================================
// FICHIER: src/routes/userRoutes.js
// RÔLE: Routes pour la gestion des utilisateurs
// VERSION: Finale avec inscription, login et CRUD
// ===========================================

const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const PasswordReset = require('../models/PasswordReset');

// ===========================================
// CRÉER UN UTILISATEUR (POST)
// ===========================================
router.post('/', async (req, res) => {
  try {
    // Log de débogage (à supprimer en production)
    console.log('=== REQUÊTE REÇUE ===');
    console.log('Body complet:', req.body);
    console.log('laboratoireId:', req.body.laboratoireId);
    console.log('Type:', typeof req.body.laboratoireId);
    console.log('=====================');
    
    const { nom, prenom, email, password, role, laboratoireId } = req.body;
    
    // Validation des champs obligatoires
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
    
    // Vérifier si l'email existe déjà
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Cet email est déjà utilisé'
      });
    }
    
    // Préparer les données
    const userData = {
      nom,
      prenom,
      email,
      password,
      role: role || 'technicien'
    };

    // Ajouter laboratoireId si fourni
    if (laboratoireId) {
      userData.laboratoireId = new mongoose.Types.ObjectId(laboratoireId);
    }

    // Créer l'utilisateur 
    const newUser = new User(userData);
    await newUser.save();
    
    // Réponse sans mot de passe
    const userResponse = newUser.toObject();
    delete userResponse.password;
    
    res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès',
      user: userResponse
    });
    
  } catch (error) {
    console.error('❌ Erreur création utilisateur:', error);
    
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
// LISTER TOUS LES UTILISATEURS (GET)
// ===========================================
router.get('/', async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    console.error('❌ Erreur listage utilisateurs:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur'
    });
  }
});

// ===========================================
// OBTENIR UN UTILISATEUR PAR ID (GET)
// ===========================================
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('❌ Erreur récupération utilisateur:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'ID utilisateur invalide'
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur'
    });
  }
});

// ===========================================
// INSCRIPTION D'UN NOUVEL UTILISATEUR (POST /register)
// ===========================================
router.post('/register', async (req, res) => {
  try {
    const { nom, prenom, email, password } = req.body;

    // Validation
    const missingFields = [];
    if (!nom) missingFields.push('nom');
    if (!prenom) missingFields.push('prenom');
    if (!email) missingFields.push('email');
    if (!password) missingFields.push('password');

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs sont obligatoires',
        required: missingFields
      });
    }

    // Validation email
    if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Format email invalide'
      });
    }

    // Validation mot de passe (minimum 6 caractères)
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe doit contenir au moins 6 caractères'
      });
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Cet email est déjà utilisé'
      });
    }

    // Créer l'utilisateur (manager par défaut)
    const newUser = new User({
      nom,
      prenom,
      email,
      password,
      role: 'manager_labo',
      estProprietaire: false // Sera mis à jour après création d'espace
    });

    await newUser.save();

    // Réponse sans mot de passe
    const userResponse = newUser.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: 'Compte créé avec succès',
      user: userResponse
    });

  } catch (error) {
    console.error('❌ Erreur inscription:', error);
    
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
// CONNEXION UTILISATEUR (POST /login)
// ===========================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email et mot de passe requis'
      });
    }
    
    // Chercher l'utilisateur par email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }
    
    // Vérifier le mot de passe (à remplacer par bcrypt.compare plus tard)
    if (user.password !== password) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }
    
    // Vérifier si le compte est actif
    if (!user.actif) {
      return res.status(403).json({
        success: false,
        message: 'Compte désactivé. Contactez l\'administrateur.'
      });
    }
    
    // Créer le token JWT
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        role: user.role,
        espaceId: user.espaceId
      },
      process.env.JWT_SECRET || 'dev_secret_temporaire',
      { expiresIn: '7d' }
    );
    
    // Réponse sans mot de passe
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.json({
      success: true,
      message: 'Connexion réussie',
      token,
      user: userResponse
    });
    
  } catch (error) {
    console.error('❌ Erreur connexion:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur'
    });
  }
});

// ===========================================
// METTRE À JOUR UN UTILISATEUR (PUT)
// ===========================================
router.put('/:id', async (req, res) => {
  try {
    // Empêcher la modification du mot de passe via cette route
    const updates = { ...req.body };
    delete updates.password;
    delete updates._id;
    delete updates.__v;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    res.json({
      success: true,
      message: 'Utilisateur mis à jour',
      user
    });
  } catch (error) {
    console.error('❌ Erreur mise à jour:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur'
    });
  }
});

// ===========================================
// SUPPRIMER (DÉSACTIVER) UN UTILISATEUR (DELETE)
// ===========================================
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { actif: false },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    res.json({
      success: true,
      message: 'Utilisateur désactivé'
    });
  } catch (error) {
    console.error('❌ Erreur suppression:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur'
    });
  }
});

// ===========================================
// DEMANDE DE RÉINITIALISATION (POST /forgot-password)
// ===========================================
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email requis'
      });
    }

    // Vérifier si l'utilisateur existe
    const user = await User.findOne({ email });
    if (!user) {
      // Pour des raisons de sécurité, on renvoie un succès même si l'email n'existe pas
      return res.json({
        success: true,
        message: 'Si cet email existe, un lien de réinitialisation a été envoyé'
      });
    }

    // Générer un token unique
    const token = crypto.randomBytes(32).toString('hex');
    
    // Sauvegarder le token
    await PasswordReset.create({
      email,
      token,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 min
    });

    // Configurer le transporteur d'email
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // Lien de réinitialisation
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${token}`;

    // Envoyer l'email
    await transporter.sendMail({
      from: '"Laboges" <noreply@laboges.com>',
      to: email,
      subject: 'Réinitialisation de votre mot de passe',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Laboges</h2>
          <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
          <p>Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe :</p>
          <a href="${resetLink}" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
            Réinitialiser mon mot de passe
          </a>
          <p style="color: #666; font-size: 14px;">Ce lien est valable 15 minutes.</p>
          <p style="color: #666; font-size: 14px;">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
        </div>
      `
    });

    res.json({
      success: true,
      message: 'Un email de réinitialisation a été envoyé'
    });

  } catch (error) {
    console.error('❌ Erreur forgot-password:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'envoi de l\'email'
    });
  }
});

// ===========================================
// RÉINITIALISATION (POST /reset-password)
// ===========================================
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token et nouveau mot de passe requis'
      });
    }

    // Vérifier la longueur du mot de passe
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe doit contenir au moins 6 caractères'
      });
    }

    // Chercher le token
    const resetRequest = await PasswordReset.findOne({
      token,
      utilisé: false,
      expiresAt: { $gt: new Date() }
    });

    if (!resetRequest) {
      return res.status(400).json({
        success: false,
        message: 'Lien invalide ou expiré'
      });
    }

    // Trouver l'utilisateur
    const user = await User.findOne({ email: resetRequest.email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Mettre à jour le mot de passe
    user.password = newPassword;
    await user.save();

    // Marquer le token comme utilisé
    resetRequest.utilisé = true;
    await resetRequest.save();

    res.json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur reset-password:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la réinitialisation'
    });
  }
});



module.exports = router;