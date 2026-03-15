// ===========================================
// MODÈLE: PasswordReset
// RÔLE: Stocker les tokens de réinitialisation
// ===========================================

const mongoose = require('mongoose');

const passwordResetSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
  },
  utilisé: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index pour expiration automatique
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('PasswordReset', passwordResetSchema);