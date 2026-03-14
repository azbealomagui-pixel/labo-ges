// ===========================================
// MODÈLE: Message
// RÔLE: Messagerie interne entre membres
// ===========================================

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  // ===== IDENTIFICATION =====
  espaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Espace',
    required: true
  },

  // ===== EXPÉDITEUR =====
  expediteur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // ===== DESTINATAIRES =====
  destinataires: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // ===== CONTENU =====
  sujet: {
    type: String,
    required: [true, 'Le sujet est obligatoire'],
    trim: true,
    maxlength: [200, 'Le sujet ne peut pas dépasser 200 caractères']
  },
  contenu: {
    type: String,
    required: [true, 'Le message est obligatoire'],
    trim: true
  },

  // ===== PIÈCES JOINTES =====
  piecesJointes: [{
    nom: String,
    url: String,
    taille: Number,
    type: String
  }],

  // ===== STATUT =====
  lu: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: { type: Date, default: Date.now }
  }],

  // ===== MÉTADONNÉES =====
  important: {
    type: Boolean,
    default: false
  },
  archive: {
    type: Boolean,
    default: false
  },
  dateEnvoi: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index pour optimiser les recherches
messageSchema.index({ espaceId: 1, dateEnvoi: -1 });
messageSchema.index({ expediteur: 1 });
messageSchema.index({ destinataires: 1 });

module.exports = mongoose.model('Message', messageSchema);