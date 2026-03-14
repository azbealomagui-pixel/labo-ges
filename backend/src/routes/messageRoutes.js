// ===========================================
// ROUTES: messageRoutes.js
// RÔLE: Gestion des messages internes
// ===========================================

const express = require('express');
const Message = require('../models/Message');
const User = require('../models/User');
const router = express.Router();

// ===== ENVOYER UN MESSAGE =====
router.post('/', async (req, res) => {
  try {
    const { espaceId, expediteur, destinataires, sujet, contenu, piecesJointes } = req.body;

    // Validation
    if (!sujet || !contenu) {
      return res.status(400).json({
        success: false,
        message: 'Sujet et contenu requis'
      });
    }

    const nouveauMessage = new Message({
      espaceId,
      expediteur,
      destinataires: destinataires || [],
      sujet,
      contenu,
      piecesJointes: piecesJointes || [],
      lu: [{ userId: expediteur, date: new Date() }] // L'expéditeur a "lu" son propre message
    });

    await nouveauMessage.save();

    // Peupler les données pour la réponse
    await nouveauMessage.populate('expediteur', 'nom prenom email');
    await nouveauMessage.populate('destinataires', 'nom prenom email');

    res.status(201).json({
      success: true,
      message: 'Message envoyé',
      data: nouveauMessage
    });

  } catch (error) {
    console.error('❌ Erreur envoi message:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur'
    });
  }
});

// ===== LISTER LES MESSAGES D'UN UTILISATEUR =====
router.get('/utilisateur/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { archive } = req.query;

    const filter = {
      $or: [
        { expediteur: userId },
        { destinataires: userId }
      ],
      archive: archive === 'true'
    };

    const messages = await Message.find(filter)
      .populate('expediteur', 'nom prenom email')
      .populate('destinataires', 'nom prenom email')
      .sort({ dateEnvoi: -1 });

    // Ajouter l'info "lu" pour cet utilisateur
    const messagesAvecStatut = messages.map(msg => {
      const msgObj = msg.toObject();
      msgObj.estLu = msg.lu.some(l => l.userId.toString() === userId);
      msgObj.nonLu = msg.lu.length - 1; // Nombre de destinataires n'ayant pas lu
      return msgObj;
    });

    res.json({
      success: true,
      count: messages.length,
      messages: messagesAvecStatut
    });

  } catch (error) {
    console.error('❌ Erreur listage messages:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur'
    });
  }
});

// ===== MARQUER UN MESSAGE COMME LU =====
router.patch('/:id/lire/:userId', async (req, res) => {
  try {
    const { id, userId } = req.params;

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message non trouvé'
      });
    }

    // Vérifier si déjà marqué comme lu
    const dejaLu = message.lu.some(l => l.userId.toString() === userId);
    if (!dejaLu) {
      message.lu.push({ userId });
      await message.save();
    }

    res.json({
      success: true,
      message: 'Message marqué comme lu'
    });

  } catch (error) {
    console.error('❌ Erreur marquage lu:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur'
    });
  }
});

// ===== ARCHIVER UN MESSAGE =====
router.patch('/:id/archiver', async (req, res) => {
  try {
    const { id } = req.params;

    const message = await Message.findByIdAndUpdate(
      id,
      { archive: true },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Message archivé',
      data: message
    });

  } catch (error) {
    console.error('❌ Erreur archivage:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur'
    });
  }
});

// ===== SUPPRIMER UN MESSAGE =====
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await Message.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Message supprimé'
    });

  } catch (error) {
    console.error('❌ Erreur suppression:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur'
    });
  }
});


// Après avoir sauvegardé un nouveau message
await nouveauMessage.save();

// Émettre une notification aux destinataires
nouveauMessage.destinataires.forEach(destinataireId => {
  io.to(destinataireId.toString()).emit('nouveau-message', {
    messageId: nouveauMessage._id,
    expediteur: nouveauMessage.expediteur,
    sujet: nouveauMessage.sujet,
    date: nouveauMessage.dateEnvoi
  });
});

module.exports = router;