// ===========================================
// MODÈLE: Abonnement
// RÔLE: Gestion des abonnements des espaces
// VERSION: Corrigée - source unique des abonnements
// ===========================================

const mongoose = require('mongoose');

const abonnementSchema = new mongoose.Schema({
  // ===== ESPACE CONCERNÉ =====
  espaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Espace',
    required: true,
    unique: true
  },

  // ===== TYPE D'ABONNEMENT =====
  type: {
    type: String,
    enum: ['essai', 'mensuel', 'annuel'],
    default: 'essai'
  },

  // ===== DATES =====
  dateDebut: {
    type: Date,
    default: Date.now
  },
  dateFin: {
    type: Date,
    required: true
  },

  // ===== STATUT =====
  statut: {
    type: String,
    enum: ['actif', 'expire', 'suspendu', 'en_attente'],
    default: 'actif'
  },

  // ===== PRIX =====
  prix: {
    mensuel: { type: Number, default: 29 },
    annuel: { type: Number, default: 290 }
  },
  devise: {
    type: String,
    default: 'EUR'
  },

  // ===== PAIEMENTS =====
  paiements: [{
    montant: Number,
    devise: { type: String, default: 'EUR' },
    date: { type: Date, default: Date.now },
    methode: {
      type: String,
      enum: ['carte', 'virement', 'mobile']
    },
    transactionId: String,
    statut: {
      type: String,
      enum: ['reussi', 'echec', 'rembourse'],
      default: 'reussi'
    }
  }],

  // ===== NOTIFICATIONS =====
  notifications: [{
    type: {
      type: String,
      enum: ['rappel_j-7', 'rappel_j-1', 'expiration']
    },
    dateEnvoi: Date,
    lu: { type: Boolean, default: false }
  }],

  actif: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// ===== MÉTHODE : Vérifier si l'abonnement est actif =====
abonnementSchema.methods.estActif = function() {
  return this.statut === 'actif' && this.dateFin > new Date();
};

// ===== MÉTHODE : Vérifier si l'abonnement expire bientôt =====
abonnementSchema.methods.estProcheExpiration = function() {
  const maintenant = new Date();
  const diff = this.dateFin - maintenant;
  const joursRestants = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return joursRestants <= 7 && joursRestants > 0;
};

// ===== MÉTHODE : Obtenir les jours restants =====
abonnementSchema.methods.joursRestants = function() {
  const diff = this.dateFin - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

// ===== STATIC : Créer un abonnement d'essai =====
abonnementSchema.statics.creerEssai = async function(espaceId) {
  const dateDebut = new Date();
  const dateFin = new Date();
  dateFin.setDate(dateFin.getDate() + 30); // 30 jours d'essai

  return this.create({
    espaceId,
    type: 'essai',
    dateDebut,
    dateFin,
    statut: 'actif'
  });
};

// ===== STATIC : Renouveler un abonnement =====
abonnementSchema.statics.renouveler = async function(id, type) {
  const abonnement = await this.findById(id);
  if (!abonnement) throw new Error('Abonnement non trouvé');

  const dateDebut = new Date();
  let dateFin = new Date();

  if (type === 'mensuel') {
    dateFin.setMonth(dateFin.getMonth() + 1);
  } else if (type === 'annuel') {
    dateFin.setFullYear(dateFin.getFullYear() + 1);
  } else {
    throw new Error('Type invalide');
  }

  abonnement.type = type;
  abonnement.dateDebut = dateDebut;
  abonnement.dateFin = dateFin;
  abonnement.statut = 'actif';

  await abonnement.save();
  return abonnement;
};

module.exports = mongoose.model('Abonnement', abonnementSchema);