const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_temporaire');
    const user = await User.findById(decoded.userId).select('-password');

    if (!user || !user.actif) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non valide'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Token invalide ou expiré'
    });
  }
};

module.exports = { authenticate };