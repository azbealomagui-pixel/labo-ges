// ===========================================
// FICHIER: src/models/Devis.js
// RÔLE: Modèle pour les devis et factures
// VERSION: Corrigée avec champ devise
// ===========================================

const mongoose = require('mongoose');

// Liste des devises autorisées
const CURRENCIES = ['EUR', 'USD', 'GNF', 'XOF', 'GBP', 'MAD', 'DZD', 'TND'];

const devisSchema = new mongoose.Schema({
  // Numéro unique du devis
  numero: {
    type: String,
    required: true,
    unique: true
  },

  // Type de document
  type: {
    type: String,
    enum: ['proforma', 'devis', 'facture', 'avoir'],
    default: 'devis'
  },

  // ===== DEVISES =====
  // Devise sélectionnée par l'utilisateur (CORRECTION ICI)
  devise: {
    type: String,
    enum: CURRENCIES,
    default: 'EUR',
    required: true
  },

  // Devise cible (pour compatibilité avec ancien code)
  deviseCible: {
    type: String,
    enum: CURRENCIES,
    default: 'EUR'
  },

  // ===== LIENS =====
  laboratoireId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Laboratoire',
    required: true
  },
  
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // ===== LIGNES DU DEVIS =====
  lignes: [{
    analyseId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Analyse' 
    },
    quantite: { 
      type: Number, 
      default: 1,
      min: 1
    },
    prixUnitaire: {
      valeur: { type: Number, default: 0 },
      devise: { type: String, enum: CURRENCIES, default: 'EUR' }
    }
  }],

  // ===== TOTAUX =====
  sousTotal: {
    valeur: { type: Number, default: 0 },
    devise: { type: String, enum: CURRENCIES, default: 'EUR' }
  },

  total: {
    valeur: { type: Number, default: 0 },
    devise: { type: String, enum: CURRENCIES, default: 'EUR' }
  },

  // ===== REMISES =====
  remiseGlobale: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },

  // ===== DATES =====
  dateEmission: {
    type: Date,
    default: Date.now
  },

  dateValidite: {
    type: Date,
    default: () => new Date(+new Date() + 30*24*60*60*1000) // +30 jours
  },

  datePaiement: {
    type: Date
  },

  // ===== STATUT =====
  statut: {
    type: String,
    enum: ['brouillon', 'envoye', 'accepte', 'refuse', 'paye', 'annule', 'expire'],
    default: 'brouillon'
  },

  // ===== NOTES =====
  notes: {
    type: String,
    default: ''
  },

  // ===== HISTORIQUE =====
  historique: [{
    action: String,
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: { type: Date, default: Date.now },
    details: mongoose.Schema.Types.Mixed
  }],

  // ===== MÉTA-DONNÉES =====
  actif: {
    type: Boolean,
    default: true
  }

}, {
  timestamps: true
});

// ===== INDEX POUR OPTIMISER LES RECHERCHES =====
devisSchema.index({ numero: 1 });
devisSchema.index({ laboratoireId: 1 });
devisSchema.index({ patientId: 1 });
devisSchema.index({ statut: 1 });
devisSchema.index({ dateEmission: -1 });

// ===== MIDDLEWARE PRE-SAVE SIMPLE =====
devisSchema.pre('save', function(next) {
  // Si deviseCible n'est pas définie, utiliser devise
  if (!this.deviseCible && this.devise) {
    this.deviseCible = this.devise;
  }
  next();
});

module.exports = mongoose.model('Devis', devisSchema);