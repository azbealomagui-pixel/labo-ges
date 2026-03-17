// ===========================================
// MIDDLEWARE: checkPermission
// RÔLE: Vérifier si l'utilisateur a la permission
// ===========================================

const PERMISSIONS = {
  // Gestion des utilisateurs
  'VIEW_USERS': ['super_admin', 'admin', 'manager_labo'],
  'CREATE_USER': ['super_admin', 'admin', 'manager_labo'],
  'UPDATE_USER': ['super_admin', 'admin', 'manager_labo'],
  'DELETE_USER': ['super_admin', 'admin'],
  'DELEGATE': ['super_admin', 'manager_labo'],
  
  // Gestion des patients
  'VIEW_PATIENTS': ['super_admin', 'admin', 'manager_labo', 'biologiste', 'technicien', 'secretaire'],
  'CREATE_PATIENT': ['super_admin', 'admin', 'manager_labo', 'secretaire'],
  'UPDATE_PATIENT': ['super_admin', 'admin', 'manager_labo', 'secretaire'],
  'DELETE_PATIENT': ['super_admin', 'admin', 'manager_labo'],
  
  // Gestion des analyses
  'VIEW_ANALYSES': ['super_admin', 'admin', 'manager_labo', 'biologiste', 'technicien'],
  'CREATE_ANALYSE': ['super_admin', 'admin', 'manager_labo'],
  'UPDATE_ANALYSE': ['super_admin', 'admin', 'manager_labo'],
  'DELETE_ANALYSE': ['super_admin', 'admin', 'manager_labo'],
  
  // Gestion des devis
  'VIEW_DEVIS': ['super_admin', 'admin', 'manager_labo', 'comptable', 'secretaire'],
  'CREATE_DEVIS': ['super_admin', 'admin', 'manager_labo', 'secretaire'],
  'VALIDATE_DEVIS': ['super_admin', 'admin', 'manager_labo', 'comptable'],

  // Gestion des fiches d'analyses (AJOUTER)
  'VIEW_FICHES': ['super_admin', 'admin', 'manager_labo', 'biologiste', 'technicien'],
  'CREATE_FICHE': ['super_admin', 'admin', 'manager_labo', 'biologiste', 'technicien', 'secretaire'],
  'UPDATE_FICHE': ['super_admin', 'admin', 'manager_labo', 'biologiste'],
  'DELETE_FICHE': ['super_admin', 'admin', 'manager_labo'],
  
  // Rapports
  'VIEW_RAPPORTS': ['super_admin', 'admin', 'manager_labo', 'biologiste'],
  'VALIDATE_RAPPORT': ['super_admin', 'admin', 'manager_labo', 'biologiste'],
  
  // Finances
  'VIEW_FINANCES': ['super_admin', 'admin', 'manager_labo', 'comptable'],
  
  // Paramètres
  'VIEW_SETTINGS': ['super_admin', 'admin', 'manager_labo'],
  'UPDATE_SETTINGS': ['super_admin', 'admin', 'manager_labo']
};

const checkPermission = (permission) => {
  return async (req, res, next) => {
    try {
      const user = req.user; // À récupérer depuis votre middleware d'auth
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Non authentifié'
        });
      }

      // Super admin a tous les droits
      if (user.role === 'super_admin') {
        return next();
      }

      // Vérifier si le rôle a la permission
      const allowedRoles = PERMISSIONS[permission];
      if (!allowedRoles) {
        return res.status(403).json({
          success: false,
          message: 'Permission non définie'
        });
      }

      if (allowedRoles.includes(user.role)) {
        return next();
      }

      // Vérifier les permissions déléguées
      if (user.permissions && user.permissions.includes(permission)) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: `Vous n'avez pas la permission : ${permission}`
      });

    } catch (error) {
      console.error('❌ Erreur vérification permission:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la vérification des permissions'
      });
    }
  };
};

module.exports = { checkPermission, PERMISSIONS };