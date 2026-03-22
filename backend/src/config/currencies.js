// ===========================================
// FICHIER: src/config/currencies.js
// RÔLE: Configuration des devises supportées
// NOTE: USD est la devise de référence pour les statistiques
// ===========================================

const currencies = {
  // Devise de référence (BASE)
  USD: {
    code: 'USD',
    symbole: '$',
    nom: 'Dollar américain',
    decimales: 2,
    position: 'before',
    tauxVersUSD: 1.0  // BASE
  },
  
  // Autres devises avec taux de conversion vers USD
  EUR: {
    code: 'EUR',
    symbole: '€',
    nom: 'Euro',
    decimales: 2,
    position: 'after',
    tauxVersUSD: 1.08  // 1 EUR = 1.08 USD
  },
  GNF: {
    code: 'GNF',
    symbole: 'FG',
    nom: 'Franc guinéen',
    decimales: 0,
    position: 'after',
    tauxVersUSD: 0.000083  // 1 GNF ≈ 0.000083 USD (soit 12000 GNF = 1 USD)
  },
  XOF: {
    code: 'XOF',
    symbole: 'CFA',
    nom: 'Franc CFA',
    decimales: 0,
    position: 'after',
    tauxVersUSD: 0.0015  // 1 FCFA ≈ 0.0015 USD (soit 655.96 FCFA = 1 USD)
  },
  GBP: {
    code: 'GBP',
    symbole: '£',
    nom: 'Livre sterling',
    decimales: 2,
    position: 'before',
    tauxVersUSD: 1.26
  },
  CAD: {
    code: 'CAD',
    symbole: '$',
    nom: 'Dollar canadien',
    decimales: 2,
    position: 'before',
    tauxVersUSD: 0.73
  }
};

// Liste des codes pour le frontend
const currencyCodes = Object.keys(currencies);

// ===== FONCTIONS DE CONVERSION =====

/**
 * Convertir un montant d'une devise source vers USD
 * @param {number} montant - Montant à convertir
 * @param {string} deviseSource - Code de la devise source (EUR, GNF, etc.)
 * @returns {number} - Montant converti en USD
 */
const convertirVersUSD = (montant, deviseSource) => {
  if (!montant || montant === 0) return 0;
  const devise = currencies[deviseSource];
  if (!devise) {
    console.warn(`⚠️ Devise inconnue: ${deviseSource}, conversion par défaut 1:1`);
    return montant;
  }
  return montant * devise.tauxVersUSD;
};

/**
 * Convertir un montant de USD vers une devise cible
 * @param {number} montantUSD - Montant en USD
 * @param {string} deviseCible - Code de la devise cible
 * @returns {number} - Montant converti dans la devise cible
 */
const convertirDepuisUSD = (montantUSD, deviseCible) => {
  if (!montantUSD || montantUSD === 0) return 0;
  const devise = currencies[deviseCible];
  if (!devise) {
    console.warn(`⚠️ Devise inconnue: ${deviseCible}, conversion par défaut 1:1`);
    return montantUSD;
  }
  return montantUSD / devise.tauxVersUSD;
};

/**
 * Formater un montant selon la devise
 * @param {number} montant - Montant à formater
 * @param {string} codeDevise - Code de la devise
 * @returns {string} - Montant formaté avec symbole
 */
const formaterMontant = (montant, codeDevise) => {
  const devise = currencies[codeDevise];
  if (!devise) return `${montant}`;
  
  const valeur = montant.toFixed(devise.decimales);
  
  if (devise.position === 'before') {
    return `${devise.symbole} ${valeur}`;
  } else {
    return `${valeur} ${devise.symbole}`;
  }
};

module.exports = {
  currencies,
  currencyCodes,
  convertirVersUSD,
  convertirDepuisUSD,
  formaterMontant
};