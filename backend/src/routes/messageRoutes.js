// ===========================================
// ROUTES: messageRoutes.js
// RÔLE: Gestion des messages internes
// AVEC: Notifications Socket.IO et authentification
// ===========================================

const express = require('express');
const Message = require('../models/Message');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth'); // ← AJOUT
const router = express.Router();

// ===========================================
// ENVOYER UN MESSAGE (POST)
// ===========================================
router.post('/', authenticate, async (req, res) => { // ← AJOUT authenticate
  try {
    const { espaceId, destinataires, sujet, contenu, piecesJointes } = req.body;
    const expediteur = req.user._id; // ← Récupéré depuis authenticate

    console.log('📥 Message reçu:', {
      expediteur,
      destinataires,
      sujet,
      espaceId
    });

    // Validation
    if (!sujet || !contenu) {
      return res.status(400).json({
        success: false,
        message: 'Sujet et contenu requis'
      });
    }

    if (!destinataires || destinataires.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Au moins un destinataire requis'
      });
    }

    // Vérifier que tous les destinataires existent dans le même espace
    const destinatairesExistants = await User.find({
      _id: { $in: destinataires },
      espaceId: espaceId,
      actif: true
    });

    if (destinatairesExistants.length !== destinataires.length) {
      return res.status(400).json({
        success: false,
        message: 'Certains destinataires n\'existent pas ou sont inactifs'
      });
    }

    // Créer le message
    const nouveauMessage = new Message({
      espaceId,
      expediteur,
      destinataires,
      sujet,
      contenu,
      piecesJointes: piecesJointes || [],
      lu: [{ userId: expediteur, date: new Date() }]
    });

    await nouveauMessage.save();

    // Peupler les données pour la réponse
    await nouveauMessage.populate('expediteur', 'nom prenom email');
    await nouveauMessage.populate('destinataires', 'nom prenom email');

    // ===== ÉMETTRE LES NOTIFICATIONS SOCKET.IO =====
    try {
      const io = req.app.get('io');
      if (io) {
        nouveauMessage.destinataires.forEach(destinataire => {
          console.log(`📢 Notification envoyée à ${destinataire._id || destinataire}`);
          io.to(destinataire._id?.toString() || destinataire.toString()).emit('nouveau-message', {
            messageId: nouveauMessage._id,
            expediteur: {
              _id: req.user._id,
              nom: req.user.nom,
              prenom: req.user.prenom
            },
            sujet: nouveauMessage.sujet,
            date: nouveauMessage.dateEnvoi
          });
        });
      }
    } catch (socketError) {
      console.error('❌ Erreur envoi notification socket:', socketError);
    }

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

// ===========================================
// LISTER LES MESSAGES D'UN UTILISATEUR (GET)
// ===========================================
router.get('/utilisateur/:userId', authenticate, async (req, res) => { // ← AJOUT authenticate
  try {
    const { userId } = req.params;

    // Vérifier que l'utilisateur demande ses propres messages
    if (userId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

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
      msgObj.nonLu = msg.lu.length - 1;
      return msgObj;
    });

    console.log(`📬 ${messagesAvecStatut.length} messages pour ${userId}`);

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

// ===========================================
// MARQUER UN MESSAGE COMME LU (PATCH)
// ===========================================
router.patch('/:id/lire/:userId', authenticate, async (req, res) => { // ← AJOUT authenticate
  try {
    const { id, userId } = req.params;

    // Vérifier que l'utilisateur marque ses propres messages
    if (userId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message non trouvé'
      });
    }

    // Vérifier que l'utilisateur est destinataire
    if (!message.destinataires.some(d => d.toString() === userId)) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas destinataire de ce message'
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

// ===========================================
// ARCHIVER UN MESSAGE (PATCH)
// ===========================================
router.patch('/:id/archiver', authenticate, async (req, res) => { // ← AJOUT authenticate
  try {
    const { id } = req.params;

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message non trouvé'
      });
    }

    // Vérifier que l'utilisateur est concerné par le message
    if (message.expediteur.toString() !== req.user._id.toString() &&
        !message.destinataires.some(d => d.toString() === req.user._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    message.archive = true;
    await message.save();

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

// ===========================================
// SUPPRIMER UN MESSAGE (DELETE)
// ===========================================
router.delete('/:id', authenticate, async (req, res) => { // ← AJOUT authenticate
  try {
    const { id } = req.params;

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message non trouvé'
      });
    }

    // Seul l'expéditeur peut supprimer définitivement
    if (message.expediteur.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Seul l\'expéditeur peut supprimer ce message'
      });
    }

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

module.exports = router;