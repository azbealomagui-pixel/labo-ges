// ===========================================
// MODÈLE: Analyse.js
// RÔLE: Définition d'une analyse médicale (catalogue)
// VERSION: Finale avec unité et valeurs de référence
// ===========================================

const mongoose = require('mongoose');

const analyseSchema = new mongoose.Schema({
  // ===== IDENTIFICATION =====
  code: {
    type: String,
    required: [true, 'Le code de l\'analyse est requis'],
    unique: true,
    uppercase: true,
    trim: true,
    match: [/^[A-Z0-9]{3,10}$/, 'Le code doit contenir 3 à 10 caractères alphanumériques']
  },

  // ===== NOM MULTILANGUE =====
  nom: {
    fr: {
      type: String,
      required: [true, 'Le nom en français est requis'],
      trim: true
    },
    en: { type: String, trim: true, default: '' },
    es: { type: String, trim: true, default: '' }
  },

  // ===== CATÉGORIE =====
  categorie: {
    type: String,
    required: true,
    enum: [
      'Hématologie', 'Biochimie', 'Hormonologie', 'Sérologie',
      'Bactériologie', 'Parasitologie', 'Virologie', 'Immunologie', 'Autre'
    ],
    default: 'Hématologie'
  },

  // ===== PRIX =====
  prix: {
    valeur: { type: Number, required: true, min: 0 },
    devise: { type: String, enum: ['EUR', 'USD', 'GNF', 'XOF'], default: 'EUR' }
  },

  // ===== ÉCHANTILLON =====
  typeEchantillon: {
    type: String,
    required: true,
    enum: ['Sang', 'Urine', 'Selles', 'LCR', 'Prélèvement', 'Autre'],
    default: 'Sang'
  },

  // ===== DÉLAI =====
  delaiRendu: { type: Number, default: 24, min: 1, max: 720 },

  // ===== UNITÉ DE MESURE =====
  uniteMesure: {
    type: String,
    default: '',
    trim: true,
    maxlength: 20
  },

  // ===== VALEURS DE RÉFÉRENCE (NORMES) =====
  valeursReference: {
    homme: {
      min: { type: Number, default: null },
      max: { type: Number, default: null },
      texte: { type: String, default: '' }
    },
    femme: {
      min: { type: Number, default: null },
      max: { type: Number, default: null },
      texte: { type: String, default: '' }
    },
    enfant: {
      min: { type: Number, default: null },
      max: { type: Number, default: null },
      texte: { type: String, default: '' }
    }
  },

  // ===== INSTRUCTIONS =====
  instructions: { type: String, default: '', trim: true, maxlength: 1000 },

  // ===== NORMES MÉDICALES INTERNATIONALES =====
  normesMedicales: {
    loinc: { type: String, default: '' },
    snomed: { type: String, default: '' },
    iso15189: { type: String, default: '' },
    autres: { type: String, default: '' }
  },

  // ===== MÉTADONNÉES =====
  laboratoireId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Laboratoire',
    required: true
  },
  espaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Espace' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  actif: { type: Boolean, default: true }
}, { timestamps: true });

// ===== INDEX =====
analyseSchema.index({ code: 1 });
analyseSchema.index({ categorie: 1 });
analyseSchema.index({ laboratoireId: 1 });
analyseSchema.index({ espaceId: 1 });
analyseSchema.index({ 'nom.fr': 'text' });

module.exports = mongoose.model('Analyse', analyseSchema);