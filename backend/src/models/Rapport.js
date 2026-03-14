// ===========================================
// MODÈLE: Rapport
// RÔLE: PV final d'analyses pour un patient
// ===========================================

const mongoose = require('mongoose');

const rapportSchema = new mongoose.Schema({
  // ===== RÉFÉRENCES =====
  ficheAnalyseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FicheAnalyse',
    required: true
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  espaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Espace',
    required: true
  },

  // ===== RÉSULTATS =====
  resultats: [{
    analyseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Analyse' },
    code: String,
    nom: String,
    valeur: Number,
    unite: String,
    valeurReference: {
      min: Number,
      max: Number,
      texte: String
    },
    interpretation: {
      type: String,
      enum: ['normal', 'elevé', 'bas', 'critique'],
      default: 'normal'
    },
    commentaire: String
  }],

  // ===== VALIDATION =====
  validePar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dateValidation: {
    type: Date,
    default: Date.now
  },

  // ===== SÉCURITÉ =====
  signature: String, // Signature numérique
  qrCode: String,    // QR code de vérification
  cachet: String,    // Cachet du laboratoire

  // ===== STATUT =====
  statut: {
    type: String,
    enum: ['brouillon', 'final', 'archive'],
    default: 'brouillon'
  },

  // ===== MÉTADONNÉES =====
  version: { type: Number, default: 1 },
  notes: String
}, {
  timestamps: true
});

module.exports = mongoose.model('Rapport', rapportSchema);