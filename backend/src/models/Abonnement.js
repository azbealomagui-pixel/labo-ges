// ===========================================
// MODÈLE: Abonnement
// RÔLE: Gestion des abonnements des espaces
// VERSION: Avec conversion USD pour les statistiques
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

  // ===== PRIX (en USD par défaut) =====
  prix: {
    mensuel: { type: Number, default: 29 },
    annuel: { type: Number, default: 290 }
  },

  // ===== PAIEMENTS =====
  paiements: [{
    montant: Number,           // Montant dans la devise de paiement
    devise: { type: String, default: 'USD' },
    montantUSD: Number,        // ← CONVERTI EN USD POUR STATS
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
    statut: 'actif',
    paiements: []
  });
};

// ===== STATIC : Renouveler un abonnement =====
abonnementSchema.statics.renouveler = async function(id, type, devise = 'USD', montant = null) {
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

  // Calculer le montant si non fourni
  const prix = type === 'mensuel' ? abonnement.prix.mensuel : abonnement.prix.annuel;
  const montantPaiement = montant || prix;

  // Ajouter le paiement avec conversion USD
  const { convertirVersUSD } = require('../config/currencies');
  const montantUSD = convertirVersUSD(montantPaiement, devise);

  abonnement.paiements.push({
    montant: montantPaiement,
    devise: devise,
    montantUSD: montantUSD,
    methode: 'carte',
    statut: 'reussi'
  });

  abonnement.type = type;
  abonnement.dateDebut = dateDebut;
  abonnement.dateFin = dateFin;
  abonnement.statut = 'actif';

  await abonnement.save();
  return abonnement;
};

module.exports = mongoose.model('Abonnement', abonnementSchema);