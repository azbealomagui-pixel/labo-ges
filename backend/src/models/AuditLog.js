// ===========================================
// MODÈLE: AuditLog
// RÔLE: Journaliser toutes les actions importantes
// VERSION: Finale avec toutes les actions
// ===========================================

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  espaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Espace',
    required: true
  },
  utilisateurId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      // Utilisateurs
      'CREATE_USER',
      'UPDATE_USER',
      'DELETE_USER',
      'TOGGLE_USER_ACTIF',
      'DELEGATE_PERMISSIONS',
      
      // Patients
      'CREATE_PATIENT',
      'UPDATE_PATIENT',
      'DELETE_PATIENT',
      
      // Analyses
      'CREATE_ANALYSE',
      'UPDATE_ANALYSE',
      'DELETE_ANALYSE',
      
      // Devis
      'CREATE_DEVIS',
      'UPDATE_DEVIS',    // ← AJOUTER
      'DELETE_DEVIS',    // ← AJOUTER
      
      // Rapports
      'VALIDATE_RAPPORT',
      
      // Fiches
      'CREATE_FICHE',    // ← AJOUTER
      'UPDATE_FICHE',    // ← AJOUTER
      'DELETE_FICHE'     // ← AJOUTER
    ]
  },
  cible: {
    type: {
      type: String,
      enum: ['User', 'Patient', 'Analyse', 'Devis', 'Rapport', 'FicheAnalyse']
    },
    id: mongoose.Schema.Types.ObjectId,
    nom: String
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ip: String,
  userAgent: String,
  date: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index pour les recherches
auditLogSchema.index({ espaceId: 1, date: -1 });
auditLogSchema.index({ utilisateurId: 1, date: -1 });
auditLogSchema.index({ action: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);