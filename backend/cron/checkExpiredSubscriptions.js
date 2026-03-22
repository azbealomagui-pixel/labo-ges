// ===========================================
// CRON: checkExpiredSubscriptions.js
// RÔLE: Vérifier quotidiennement les abonnements expirés
// VERSION: Corrigée - chemins vers src/models
// ===========================================

// Correction des chemins d'import (depuis /cron vers /src/models)
const Abonnement = require('../src/models/Abonnement');
const User = require('../src/models/User');

// Envoyer une notification Socket.IO à tous les membres de l'espace
const sendNotificationToEspace = async (io, espaceId, message, type) => {
  if (!io) return;
  
  try {
    const users = await User.find({ espaceId, actif: true });
    
    users.forEach(user => {
      io.to(user._id.toString()).emit('abonnement-expire', {
        message,
        type,
        date: new Date()
      });
    });
  } catch (error) {
    console.error('❌ Erreur envoi notification:', error);
  }
};

const checkExpiredSubscriptions = async (io = null) => {
  const startTime = Date.now();
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
      
      if (io) {
        const expiredAbonnements = await Abonnement.find({ 
          dateFin: { $lt: maintenant }, 
          statut: 'expire' 
        }).limit(expiredResult.modifiedCount);
        
        for (const abonnement of expiredAbonnements) {
          await sendNotificationToEspace(
            io,
            abonnement.espaceId,
            '⚠️ Votre abonnement a expiré. Veuillez renouveler pour continuer à utiliser LaboGes.',
            'expiration'
          );
        }
      }
    }

    // ===== 2. TROUVER LES ABONNEMENTS QUI EXPIRE BIENTÔT =====
    const expiringSoon = await Abonnement.find({
      dateFin: { $lte: dans7Jours, $gte: maintenant },
      statut: 'actif'
    });

    for (const abonnement of expiringSoon) {
      const joursRestants = Math.ceil((abonnement.dateFin - maintenant) / (1000 * 60 * 60 * 24));
      
      const notificationDejaEnvoyee = abonnement.notifications?.some(
        n => n.type === `rappel_j-${joursRestants}`
      );

      if (!notificationDejaEnvoyee && joursRestants <= 7) {
        abonnement.notifications = abonnement.notifications || [];
        abonnement.notifications.push({
          type: joursRestants === 7 ? 'rappel_j-7' : joursRestants === 1 ? 'rappel_j-1' : 'expiration',
          dateEnvoi: new Date()
        });
        await abonnement.save();

        if (io) {
          const message = joursRestants === 1 
            ? `⏰ Votre abonnement expire demain ! Renouvelez dès maintenant.`
            : `⏰ Votre abonnement expire dans ${joursRestants} jours. Pensez à renouveler.`;
          
          await sendNotificationToEspace(io, abonnement.espaceId, message, 'rappel');
        }

        console.log(`📧 Notification pour espace ${abonnement.espaceId} : ${joursRestants} jours restants`);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Cron terminé en ${duration}ms - ${expiredResult.modifiedCount} expirés, ${expiringSoon.length} expirent bientôt`);

    return {
      expired: expiredResult.modifiedCount,
      expiringSoon: expiringSoon.length,
      duration
    };

  } catch (error) {
    console.error('❌ Erreur cron abonnements:', error);
    return { error: error.message };
  }
};

module.exports = checkExpiredSubscriptions;