// ===========================================
// FICHIER: analyseRoutes.js
// RÔLE: Routes pour le catalogue d'analyses
// VERSION: Corrigée et optimisée
// ===========================================

const express = require('express');
const Analyse = require('../models/Analyse');
const router = express.Router();

// ===========================================
// CRÉER une analyse (POST)
// URL: /api/analyses
// ===========================================
router.post('/', async (req, res) => {
  try {
    const { 
      code, 
      nom, 
      categorie, 
      prix,
      uniteMesure,
      valeursReference, 
      valeursAlertes, 
      delaiRendu,
      typeEchantillon, 
      instructions, 
      laboratoireId, 
      createdBy 
    } = req.body;

    // ===== VALIDATION DES CHAMPS OBLIGATOIRES =====
    const missingFields = [];
    
    if (!code) missingFields.push('code');
    if (!nom?.fr) missingFields.push('nom.fr');
    if (!categorie) missingFields.push('categorie');
    if (!prix?.valeur && prix?.valeur !== 0) missingFields.push('prix.valeur');
    if (!typeEchantillon) missingFields.push('typeEchantillon');
    if (!laboratoireId) missingFields.push('laboratoireId');
    if (!createdBy) missingFields.push('createdBy');

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Champs obligatoires manquants',
        required: missingFields
      });
    }

    // ===== VÉRIFICATION DU CODE UNIQUE =====
    const existing = await Analyse.findOne({ 
      code: code.toUpperCase(),
      laboratoireId 
    });
    
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Ce code d\'analyse existe déjà pour ce laboratoire'
      });
    }

    // ===== CRÉATION DE L'ANALYSE =====
    const newAnalyse = new Analyse({
      code: code.toUpperCase().trim(),
      nom: {
        fr: nom.fr?.trim() || '',
        en: nom.en?.trim() || '',
        es: nom.es?.trim() || ''
      },
      categorie,
      prix: {
        valeur: Number(prix.valeur) || 0,
        devise: prix.devise || 'EUR'
      },
      uniteMesure: uniteMesure?.trim() || '-',
      valeursReference: valeursReference || {},
      valeursAlertes: valeursAlertes || {},
      delaiRendu: Number(delaiRendu) || 24,
      typeEchantillon,
      instructions: instructions?.trim() || '',
      laboratoireId,
      createdBy,
      actif: true
    });

    await newAnalyse.save();

    res.status(201).json({
      success: true,
      message: 'Analyse créée avec succès',
      analyse: newAnalyse
    });

  } catch (error) {
    console.error('❌ Erreur création analyse:', error);
    
    // Gestion des erreurs MongoDB
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: Object.keys(error.errors).map(key => ({
          field: key,
          message: error.errors[key].message
        }))
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la création'
    });
  }
});

// ===========================================
// LISTER toutes les analyses d'un laboratoire (GET)
// URL: /api/analyses/labo/:laboratoireId
// ===========================================
router.get('/labo/:laboratoireId', async (req, res) => {
  try {
    const analyses = await Analyse.find({ 
      laboratoireId: req.params.laboratoireId,
      actif: true 
    })
    .sort({ categorie: 1, 'nom.fr': 1 })
    .select('-__v');

    res.json({
      success: true,
      count: analyses.length,
      analyses
    });

  } catch (error) {
    console.error('❌ Erreur listage analyses:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du chargement des analyses'
    });
  }
});

// ===========================================
// RECHERCHER des analyses (GET)
// URL: /api/analyses/search?q=...&laboratoireId=...
// ===========================================
router.get('/search', async (req, res) => {
  try {
    const { q, laboratoireId } = req.query;

    if (!q || q.length < 2 || !laboratoireId) {
      return res.json({ 
        success: true, 
        count: 0,
        analyses: [] 
      });
    }

    const analyses = await Analyse.find({
      laboratoireId,
      actif: true,
      $or: [
        { code: { $regex: q, $options: 'i' } },
        { 'nom.fr': { $regex: q, $options: 'i' } },
        { 'nom.en': { $regex: q, $options: 'i' } },
        { 'nom.es': { $regex: q, $options: 'i' } }
      ]
    })
    .limit(20)
    .select('-__v');

    res.json({
      success: true,
      count: analyses.length,
      analyses
    });

  } catch (error) {
    console.error('❌ Erreur recherche analyses:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la recherche'
    });
  }
});

// ===========================================
// OBTENIR une analyse par ID (GET)
// URL: /api/analyses/:id
// ===========================================
router.get('/:id', async (req, res) => {
  try {
    const analyse = await Analyse.findById(req.params.id).select('-__v');

    if (!analyse) {
      return res.status(404).json({
        success: false,
        message: 'Analyse non trouvée'
      });
    }

    res.json({
      success: true,
      analyse
    });

  } catch (error) {
    console.error('❌ Erreur récupération analyse:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'ID d\'analyse invalide'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors du chargement de l\'analyse'
    });
  }
});

// ===========================================
// METTRE À JOUR une analyse (PUT)
// URL: /api/analyses/:id
// ===========================================
router.put('/:id', async (req, res) => {
  try {
    // Empêcher la modification de certains champs
    const updates = { ...req.body };
    delete updates._id;
    delete updates.__v;
    delete updates.createdBy; // Ne pas modifier le créateur
    delete updates.laboratoireId; // Ne pas changer de laboratoire

    const analyse = await Analyse.findByIdAndUpdate(
      req.params.id,
      updates,
      { 
        new: true, 
        runValidators: true,
        context: 'query'
      }
    ).select('-__v');

    if (!analyse) {
      return res.status(404).json({
        success: false,
        message: 'Analyse non trouvée'
      });
    }

    res.json({
      success: true,
      message: 'Analyse mise à jour avec succès',
      analyse
    });

  } catch (error) {
    console.error('❌ Erreur mise à jour analyse:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: Object.keys(error.errors).map(key => ({
          field: key,
          message: error.errors[key].message
        }))
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour'
    });
  }
});

// ===========================================
// SUPPRIMER (désactiver) une analyse (DELETE)
// URL: /api/analyses/:id
// ===========================================
router.delete('/:id', async (req, res) => {
  try {
    const analyse = await Analyse.findByIdAndUpdate(
      req.params.id,
      { 
        actif: false,
        updatedAt: Date.now()
      },
      { new: true }
    );

    if (!analyse) {
      return res.status(404).json({
        success: false,
        message: 'Analyse non trouvée'
      });
    }

    res.json({
      success: true,
      message: 'Analyse désactivée avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur suppression analyse:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'ID d\'analyse invalide'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression'
    });
  }
});

module.exports = router;