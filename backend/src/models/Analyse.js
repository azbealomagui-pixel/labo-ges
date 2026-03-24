const mongoose = require('mongoose');

const analyseSchema = new mongoose.Schema({
  // ===== IDENTIFICATION =====
  code: {
    type: String,
    required: [true, 'Le code de l\'analyse est requis'],
    unique: true,
    uppercase: true,  // ← Convertit automatiquement en majuscules
    trim: true,
    validate: {
      validator: function(v) {
        // Accepte minuscules ET majuscules (sera converti)
        return /^[A-Za-z0-9]{2,}$/.test(v);
      },
      message: 'Le code doit contenir au moins 2 caractères (lettres et/ou chiffres)'
    }
  },

  nom: {
    fr: {
      type: String,
      required: [true, 'Le paramètre en français est requis'],
      trim: true
    },
    en: { type: String, trim: true, default: '' },
    es: { type: String, trim: true, default: '' }
  },

  // ===== PARAMÈTRES =====
  categorie: {
    type: String,
    required: true,
    enum: ['Microbiologie', 'Physico-chimique', 'Chimie'],
    default: 'Microbiologie'
  },

  // ===== PRIX =====
  prix: {
    valeur: { type: Number, required: true, min: 0 },
    devise: { type: String, enum: ['EUR', 'USD', 'GNF', 'XOF'], default: 'EUR' }
  },

  // ===== TYPE D'ÉCHANTILLON =====
  typeEchantillon: {
    type: String,
    required: true,
    enum: ['Eau', 'Sol', 'Sédiment', 'Aliment'],
    default: 'Eau'
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

  // ===== VALEURS DE RÉFÉRENCE =====
  valeursReference: {
    eau: {
      min: { type: Number, default: null },
      max: { type: Number, default: null },
      texte: { type: String, default: '' }
    },
    sol: {
      min: { type: Number, default: null },
      max: { type: Number, default: null },
      texte: { type: String, default: '' }
    },
    sediment: {
      min: { type: Number, default: null },
      max: { type: Number, default: null },
      texte: { type: String, default: '' }
    },
    aliment: {
      min: { type: Number, default: null },
      max: { type: Number, default: null },
      texte: { type: String, default: '' }
    }
  },

  // ===== NORME ISO =====
  normeISO: {
    type: String,
    default: '',
    trim: true
  },

  // ===== INSTRUCTIONS =====
  instructions: { type: String, default: '', trim: true, maxlength: 1000 },

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