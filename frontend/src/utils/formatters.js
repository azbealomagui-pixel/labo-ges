// ===========================================
// UTILITAIRE: formatters.js
// RÔLE: Formater les dates et montants
// ===========================================

/**
 * Formate une date au format français (JJ/MM/AAAA)
 * @param {string|Date} date - La date à formater
 * @returns {string} Date formatée ou message d'erreur
 */
export const formatDate = (date) => {
  if (!date) return 'Date non disponible';
  
  try {
    const d = new Date(date);
    // Vérifier si la date est valide
    if (isNaN(d.getTime())) return 'Date invalide';
    
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return 'Date invalide';
  }
};

/**
 * Formate un montant en euros
 * @param {number} montant - Le montant à formater
 * @returns {string} Montant formaté (ex: 1 234,56 €)
 */
export const formatMontant = (montant) => {
  if (montant === undefined || montant === null) return '0 €';
  
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(montant);
};