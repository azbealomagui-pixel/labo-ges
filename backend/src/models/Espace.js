// ===========================================
// MODÈLE: Espace
// RÔLE: Représente un espace client sur LaboGest
// (Pharmacie, Hôpital, Clinique, Laboratoire...)
// ===========================================

const mongoose = require('mongoose');

const espaceSchema = new mongoose.Schema({
  // ===== INFORMATIONS DE BASE =====
  nom: {
    type: String,
    required: [true, 'Le nom de l\'espace est requis'],
    unique: true,
    trim: true,
    minlength: [3, 'Le nom doit contenir au moins 3 caractères'],
    maxlength: [100, 'Le nom ne peut pas dépasser 100 caractères']
  },

  // ===== CONTACT =====
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

  // ===== IDENTIFICATION LÉGALE =====
  numeroLicence: {
    type: String,
    required: [true, 'Le numéro de licence est requis'],
    unique: true,
    trim: true
  },
  numeroFiscal: {
    type: String,
    trim: true,
    default: ''
  },

  // ===== CONFIGURATION =====
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

  // ===== ABONNEMENT =====
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

  // ===== STATUT =====
  actif: {
    type: Boolean,
    default: true
  },

  // ===== MÉTADONNÉES =====
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true, // Ajoute createdAt et updatedAt automatiquement
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ===== INDEX POUR OPTIMISER LES RECHERCHES =====
espaceSchema.index({ nom: 1 });
espaceSchema.index({ numeroLicence: 1 });
espaceSchema.index({ email: 1 });
espaceSchema.index({ 'abonnement.statut': 1 });

// ===== VIRTUEL : Nombre d'employés =====
espaceSchema.virtual('employesCount', {
  ref: 'User',
  localField: '_id',
  foreignField: 'espaceId',
  count: true
});

// ===== VIRTUEL : Liste des employés =====
espaceSchema.virtual('employes', {
  ref: 'User',
  localField: '_id',
  foreignField: 'espaceId',
  options: { select: '-password' }
});

// ===== MIDDLEWARE PRE-SAVE =====
espaceSchema.pre('save', function(next) {
  // Nettoyer les champs texte
  if (this.nom) this.nom = this.nom.trim();
  if (this.adresse) this.adresse = this.adresse.trim();
  if (this.telephone) this.telephone = this.telephone.trim();
  if (this.email) this.email = this.email.toLowerCase().trim();
  if (this.numeroLicence) this.numeroLicence = this.numeroLicence.trim();
  
  next();
});

module.exports = mongoose.model('Espace', espaceSchema);