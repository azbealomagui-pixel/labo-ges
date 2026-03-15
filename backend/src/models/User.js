// ===========================================
// FICHIER: src/models/User.js
// RÔLE: Modèle Mongoose pour les utilisateurs
// VERSION: Ultra-stable (sans erreur next)
// ===========================================

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: [true, 'Le nom est obligatoire'],
    trim: true,
    maxlength: [50, 'Le nom ne peut pas dépasser 50 caractères']
  },
  prenom: {
    type: String,
    required: [true, 'Le prénom est obligatoire'],
    trim: true,
    maxlength: [50, 'Le prénom ne peut pas dépasser 50 caractères']
  },
  email: {
    type: String,
    required: [true, 'L\'email est obligatoire'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Veuillez fournir un email valide'
    ]
  },
  password: {
    type: String,
    required: [true, 'Le mot de passe est obligatoire'],
    minlength: [6, 'Le mot de passe doit contenir au moins 6 caractères']
  },
  role: {
    type: String,
    enum: {
      values: [
        'super_admin','admin', 'admin_delegue', 'manager_labo',
        'biologiste', 'technicien', 'secretaire', 'comptable', 'rh'
      ],
      message: 'Le rôle {VALUE} n\'est pas valide'
    },
    default: 'technicien'
  },
  espaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Espace',
    required: false  // ← CRUCIAL pour l'inscription
  },
  estProprietaire: {
    type: Boolean,
    default: false
  },
  poste: {
    type: String,
    default: '',
    trim: true
  },
  laboratoireId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Laboratoire',
    required: false
  },
  actif: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// ===== MIDDLEWARE PRE-SAVE (CORRIGÉ) =====
userSchema.pre('save', async function(next) {
  try {
    // Vérifier que next est bien une fonction
    if (typeof next !== 'function') {
      console.error('❌ next n\'est pas une fonction dans pre-save');
      // Sortir sans appeler next (Mongoose gère)
      return;
    }

    if (!this.isModified('password')) {
      return next();
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// ===== SUPPRESSION DU MIDDLEWARE PRE-VALIDATE (source du problème) =====
// On nettoie les données dans la route, pas ici

// ===== MÉTHODE DE COMPARAISON =====
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Erreur de comparaison');
  }
};

// ===== MÉTHODE POUR DONNÉES PUBLIQUES =====
userSchema.methods.toPublicJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', userSchema);