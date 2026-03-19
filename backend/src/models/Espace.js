// ===================
// ===================

const mongoose = require('mongoose');

const espaceSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: [true, 'Le nom de l\'espace est requis'],
    unique: true,  
    trim: true,
    minlength: [3, 'Le nom doit contenir au moins 3 caractères'],
    maxlength: [100, 'Le nom ne peut pas dépasser 100 caractères']
  },
  adresse: {
    type: String,
    required: [true, 'L\'adresse est requise'],
    trim: true
  },
  telephone: {
    type: String,
    required: [true, 'Le téléphone est requis'],
    trim: true,
    match: [/^[0-9+\-\s]{8,}$/, 'Format téléphone invalide']
  },
  email: {
    type: String,
    required: [true, 'L\'email est requis'],
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Email invalide']
  },
  numeroLicence: {
    type: String,
    required: [true, 'Le numéro de licence est requis'],
    unique: true,        // ← DÉJÀ UN INDEX
    trim: true
  },
  numeroFiscal: {
    type: String,
    trim: true,
    default: ''
  },
  deviseParDefaut: {
    type: String,
    enum: ['EUR', 'USD', 'GNF', 'XOF'],
    default: 'EUR'
  },
  langueParDefaut: {
    type: String,
    enum: ['fr', 'en', 'es'],
    default: 'fr'
  },
  abonnement: {
    type: {
      type: String,
      enum: ['gratuit', 'essai', 'mensuel', 'annuel'],
      default: 'gratuit'
    },
    dateDebut: {
      type: Date,
      default: Date.now
    },
    dateFin: Date,
    statut: {
      type: String,
      enum: ['actif', 'expire', 'suspendu'],
      default: 'actif'
    }
  },

  // ===== NOUVEAU CHAMP POUR LE LOGO =====
  logo: {
    type: String,  // URL ou base64 du logo
    default: null
  },

  actif: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Garder seulement l'index sur email (pas unique)
espaceSchema.index({ email: 1 });          

// ===== VIRTUELS =====
espaceSchema.virtual('employesCount', {
  ref: 'User',
  localField: '_id',
  foreignField: 'espaceId',
  count: true
});

module.exports = mongoose.model('Espace', espaceSchema);