// ===========================================
// HOOK: useAnalyseLookup
// RÔLE: Rechercher une analyse par code avec délai
// ===========================================
import { useState, useCallback } from 'react';
import api from '../services/api';

// Fonction debounce manuelle (sans lodash)
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

const useAnalyseLookup = () => {
  const [loading, setLoading] = useState(false);
  const [analyse, setAnalyse] = useState(null);
  const [error, setError] = useState(null);

  // Fonction de recherche avec debounce (300ms) - VERSION CORRIGÉE
  const searchByCode = useCallback((code, laboratoireId) => {
    const debouncedSearch = debounce(async (searchCode, labId) => {
      if (!searchCode || searchCode.length < 3) {
        setAnalyse(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await api.get(
          `/analyses/search?q=${searchCode}&laboratoireId=${labId}`
        );

        if (response.data.analyses && response.data.analyses.length > 0) {
          const found = response.data.analyses[0];
          
          setAnalyse({
            id: found._id,
            code: found.code,
            nom: {
              fr: found.nom?.fr || '',
              en: found.nom?.en || '',
              es: found.nom?.es || ''
            },
            prix: found.prix,
            categorie: found.categorie,
            typeEchantillon: found.typeEchantillon,
            delaiRendu: found.delaiRendu,
            instructions: found.instructions
          });
        } else {
          setAnalyse(null);
        }
      } catch (err) {
        console.error('Erreur recherche analyse:', err);
        setError('Erreur lors de la recherche');
        setAnalyse(null);
      } finally {
        setLoading(false);
      }
    }, 300);

    debouncedSearch(code, laboratoireId);
  }, []); // ✅ Dépendances vides, fonction stable

  return { loading, analyse, error, searchByCode };
};

export default useAnalyseLookup;