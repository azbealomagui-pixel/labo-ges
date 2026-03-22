// ===========================================
// CRON: checkExpiredSubscriptions.js
// RÔLE: Vérifier quotidiennement les abonnements expirés
// ===========================================

const Abonnement = require('../models/Abonnement');
const Espace = require('../models/Espace');

const checkExpiredSubscriptions = async () => {
  console.log('🔄 Vérification des abonnements...', new Date().toISOString());

  try {
    const maintenant = new Date();
    const dans7Jours = new Date(maintenant);
    dans7Jours.setDate(dans7Jours.getDate() + 7);

    // ===== 1. MARQUER LES ABONNEMENTS EXPIRÉS =====
    const expiredResult = await Abonnement.updateMany(
      { dateFin: { $lt: maintenant }, statut: 'actif' },
      { statut: 'expire' }
    );

    if (expiredResult.modifiedCount > 0) {
      console.log(`📅 ${expiredResult.modifiedCount} abonnement(s) marqué(s) comme expiré`);
    }

    // ===== 2. TROUVER LES ABONNEMENTS QUI EXPIRE BIENTÔT =====
    const expiringSoon = await Abonnement.find({
      dateFin: { $lte: dans7Jours, $gte: maintenant },
      statut: 'actif'
    }).populate('espaceId', 'nom email');

    for (const abonnement of expiringSoon) {
      const joursRestants = abonnement.joursRestants();
      
      // Vérifier si la notification a déjà été envoyée
      const notificationDejaEnvoyee = abonnement.notifications.some(
        n => n.type === `rappel_j-${joursRestants}`
      );

      if (!notificationDejaEnvoyee) {
        // Ajouter la notification
        abonnement.notifications.push({
          type: joursRestants === 7 ? 'rappel_j-7' : joursRestants === 1 ? 'rappel_j-1' : 'expiration',
          dateEnvoi: new Date()
        });
        await abonnement.save();

        // Log pour l'envoi d'email (à implémenter)
        console.log(`📧 Notification à envoyer pour ${abonnement.espaceId?.nom || abonnement.espaceId} : ${joursRestants} jours restants`);
      }
    }

    if (expiringSoon.length > 0) {
      console.log(`⏰ ${expiringSoon.length} abonnement(s) expire(nt) bientôt`);
    }

    return {
      expired: expiredResult.modifiedCount,
      expiringSoon: expiringSoon.length
    };

  } catch (error) {
    console.error('❌ Erreur cron abonnements:', error);
    return { error: error.message };
  }
};

module.exports = checkExpiredSubscriptions;