// ===========================================
// FICHIER: src/models/Laboratoire.js
// ===========================================

const mongoose = require('mongoose');
const { currencies } = require('../config/currencies'); // Import des dev
const laboratoireSchema = new mongoose.Schema({
  // Informations de base
  nom: {
    type: String,
    required: [true, 'Le nom du laboratoire est obligatoire'],
    unique: true,
    trim: true
  },
  adresse: {
    type: String,
    required: true
  },
  telephone: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true
  },
   // NOUVEAU : Devise par défaut du laboratoire
  deviseParDefaut: {
    type: String,
    enum: ['EUR', 'USD', 'GNF','XOF', 'GBP', 'MAD', 'DZD', 'TND'],
    default: 'EUR'
  },
  // Abonnement
  abonnement: {
    type: {
      type: String,
      enum: ['mensuel', 'semestriel', 'annuel', 'gratuit'],
      default: 'gratuit'
    },
    dateDebut: Date,
    dateFin: Date,
    statut: {
      type: String,
      enum: ['actif', 'expire', 'suspendu'],
      default: 'actif'
    }
  },
   // NOUVEAU : Devises acceptées (pour affichage multi-devises)
  devisesAcceptees: [{
    type: String,
    enum: ['EUR', 'USD', 'GNF', 'XOF', 'GBP', 'MAD', 'DZD', 'TND']
  }],

   langueParDefaut: {
    type: String,
    enum: ['fr', 'en', 'es'],
    default: 'fr'
  },

  // NOUVEAU : Configuration fiscale
  tva: {
    taux: { type: Number, default: 0 }, // Taux de TVA (ex: 20 pour 20%)
    numeroTVA: { type: String }
  },
  
  // Statut
  actif: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Laboratoire', laboratoireSchema);