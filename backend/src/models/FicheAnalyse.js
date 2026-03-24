// ===========================================
// MODÈLE: FicheAnalyse
// RÔLE: Enregistrer une analyse réalisée pour un patient
// ===========================================
const mongoose = require('mongoose');

const ficheAnalyseSchema = new mongoose.Schema({
  // ===== PATIENT =====
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: [true, "L'ID du client est requis"]
  },

  // ===== LABORATOIRE =====
  laboratoireId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Laboratoire',
    required: true
  },

  // ===== CRÉATEUR =====
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // ===== LIGNES D'ANALYSES =====
  lignes: [{
    analyseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Analyse',
      required: true
    },
    code: {
      type: String,
      required: true
    },
    nom: {
      type: String,
      required: true  // Nom dans la langue du système
    },
    prixUnitaire: {
      type: Number,
      required: true,
      min: 0
    },
    devise: {
      type: String,
      default: 'EUR',
      enum: ['EUR', 'USD', 'GNF', 'XOF', 'GBP', 'MAD', 'DZD', 'TND']
    },
    quantite: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    },
    prixTotal: {
      type: Number,
      required: true,
      min: 0
    },
    observations: {
      type: String,
      default: ''
    }
  }],

  // ===== TOTAUX =====
  totalGeneral: {
    type: Number,
    required: true,
    default: 0
  },
  devise: {
    type: String,
    default: 'EUR',
    enum: ['EUR', 'USD', 'GNF', 'XOF', 'GBP', 'MAD', 'DZD', 'TND']
  },

  // ===== STATUT =====
  statut: {
    type: String,
    enum: ['brouillon', 'valide', 'facture', 'annule'],
    default: 'brouillon'
  },

  // ===== DATES =====
  dateCreation: {
    type: Date,
    default: Date.now
  },
  dateValidation: Date,

  // ===== NOTES =====
  notes: String

}, {
  timestamps: true
});

// Index pour les recherches
ficheAnalyseSchema.index({ patientId: 1, dateCreation: -1 });
ficheAnalyseSchema.index({ laboratoireId: 1 });

module.exports = mongoose.model('FicheAnalyse', ficheAnalyseSchema);