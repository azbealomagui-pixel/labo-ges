// ===========================================
// ROUTES: superAdminRoutes.js
// RÔLE: Administration système (super admin uniquement)
// VERSION: Finale avec stats en USD
// ===========================================

const express = require('express');
const Espace = require('../models/Espace');
const User = require('../models/User');
const Abonnement = require('../models/Abonnement');
const { authenticate } = require('../middleware/auth');
const { checkPermission } = require('../middleware/checkPermission');
const { convertirDepuisUSD, formaterMontant } = require('../config/currencies');
const router = express.Router();

// ===== MIDDLEWARE : Vérifier que l'utilisateur est super admin =====
const requireSuperAdmin = (req, res, next) => {
  if (req.user?.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      message: 'Accès réservé aux administrateurs système'
    });
  }
  next();
};

// ===========================================
// LISTER TOUS LES ESPACES (GET)
// ===========================================
router.get('/espaces', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, statut, search } = req.query;
    
    const filter = {};
    if (statut) filter.actif = statut === 'actif';
    if (search) {
      filter.$or = [
        { nom: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { numeroLicence: { $regex: search, $options: 'i' } }
      ];
    }

    const espaces = await Espace.find(filter)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Espace.countDocuments(filter);

    const espacesAvecAbonnement = await Promise.all(
      espaces.map(async (espace) => {
        const abonnement = await Abonnement.findOne({ espaceId: espace._id });
        return {
          ...espace.toObject(),
          abonnement: abonnement ? {
            type: abonnement.type,
            statut: abonnement.statut,
            dateFin: abonnement.dateFin,
            joursRestants: abonnement.joursRestants ? abonnement.joursRestants() : 0
          } : null
        };
      })
    );

    res.json({
      success: true,
      espaces: espacesAvecAbonnement,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('❌ Erreur listage espaces:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ===========================================
// OBTENIR LES STATISTIQUES GLOBALES (EN USD)
// ===========================================
router.get('/stats', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const totalEspaces = await Espace.countDocuments();
    const totalUtilisateurs = await User.countDocuments({ role: { $ne: 'super_admin' } });
    const abonnementsActifs = await Abonnement.countDocuments({ statut: 'actif' });
    const abonnementsExpires = await Abonnement.countDocuments({ statut: 'expire' });
    const espacesEssai = await Abonnement.countDocuments({ type: 'essai', statut: 'actif' });
    const espacesPayants = await Abonnement.countDocuments({ 
      type: { $in: ['mensuel', 'annuel'] }, 
      statut: 'actif' 
    });

    // ===== CA MENSUEL EN USD (BASE UNIFIÉE) =====
    const debutMois = new Date();
    debutMois.setDate(1);
    debutMois.setHours(0, 0, 0, 0);
    
    const paiementsMois = await Abonnement.aggregate([
      { $unwind: '$paiements' },
      { 
        $match: { 
          'paiements.date': { $gte: debutMois }, 
          'paiements.statut': 'reussi' 
        } 
      },
      { 
        $group: { 
          _id: null, 
          totalUSD: { $sum: '$paiements.montantUSD' }  // ← SOMME DES MONTANTS EN USD
        } 
      }
    ]);

    const caMensuelUSD = paiementsMois[0]?.totalUSD || 0;

    // ===== CA MENSUEL DANS LES AUTRES DEVISES (OPTIONNEL) =====
    const caMensuelEUR = convertirDepuisUSD(caMensuelUSD, 'EUR');
    const caMensuelGNF = convertirDepuisUSD(caMensuelUSD, 'GNF');
    const caMensuelXOF = convertirDepuisUSD(caMensuelUSD, 'XOF');

    res.json({
      success: true,
      stats: {
        totalEspaces,
        totalUtilisateurs,
        abonnementsActifs,
        abonnementsExpires,
        espacesEssai,
        espacesPayants,
        caMensuel: {
          USD: caMensuelUSD,
          EUR: caMensuelEUR,
          GNF: Math.round(caMensuelGNF),  // GNF n'a pas de centimes
          XOF: Math.round(caMensuelXOF)   // FCFA n'a pas de centimes
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur stats globales:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ===========================================
// SUSPENDRE / ACTIVER UN ESPACE (PATCH)
// ===========================================
router.patch('/espaces/:id', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { actif, raison } = req.body;

    const espace = await Espace.findById(id);
    if (!espace) {
      return res.status(404).json({ success: false, message: 'Espace non trouvé' });
    }

    espace.actif = actif !== undefined ? actif : espace.actif;
    await espace.save();

    console.log(`📝 Super admin a ${actif ? 'activé' : 'suspendu'} l'espace ${espace.nom} (${id})`);

    res.json({
      success: true,
      message: `Espace ${actif ? 'activé' : 'suspendu'} avec succès`,
      espace
    });

  } catch (error) {
    console.error('❌ Erreur modification espace:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ===========================================
// MODIFIER L'ABONNEMENT D'UN ESPACE (PATCH)
// ===========================================
router.patch('/espaces/:id/abonnement', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { type, statut, dateFin } = req.body;

    let abonnement = await Abonnement.findOne({ espaceId: id });
    if (!abonnement) {
      abonnement = await Abonnement.creerEssai(id);
    }

    if (type) abonnement.type = type;
    if (statut) abonnement.statut = statut;
    if (dateFin) abonnement.dateFin = new Date(dateFin);

    await abonnement.save();

    res.json({
      success: true,
      message: 'Abonnement modifié avec succès',
      abonnement
    });

  } catch (error) {
    console.error('❌ Erreur modification abonnement:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ===========================================
// SUPPRIMER UN ESPACE (DELETE - irréversible)
// ===========================================
router.delete('/espaces/:id', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { confirmation } = req.body;

    if (confirmation !== 'SUPPRIMER_DEFINITIVEMENT') {
      return res.status(400).json({
        success: false,
        message: 'Confirmation requise : tapez SUPPRIMER_DEFINITIVEMENT'
      });
    }

    const espace = await Espace.findById(id);
    if (!espace) {
      return res.status(404).json({ success: false, message: 'Espace non trouvé' });
    }

    await Abonnement.deleteOne({ espaceId: id });
    await User.updateMany({ espaceId: id }, { actif: false });
    await Espace.findByIdAndDelete(id);

    res.json({
      success: true,
      message: `Espace ${espace.nom} supprimé définitivement`
    });

  } catch (error) {
    console.error('❌ Erreur suppression espace:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;