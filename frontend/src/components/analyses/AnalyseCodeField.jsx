// ===========================================
// COMPOSANT: AnalyseCodeField
// RÔLE: Champ de code avec autocomplétion automatique
// ===========================================
import React, { useEffect, useState, useRef, useCallback } from 'react';
import useAnalyseLookup from '../../hooks/useAnalyseLookup';
import useAuth from '../../hooks/useAuth';

const AnalyseCodeField = ({ 
  value, 
  onChange, 
  onAnalyseFound,
  disabled = false,
  required = true
}) => {
  const { user } = useAuth();
  const { loading, analyse, error, searchByCode } = useAnalyseLookup();
  const [localCode, setLocalCode] = useState(value);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const prevAnalyseRef = useRef(null);

  // Recherche automatique quand le code change
  useEffect(() => {
    if (localCode && localCode.length >= 3) {
      searchByCode(localCode, user?.laboratoireId);
    }
  }, [localCode, user?.laboratoireId, searchByCode]);

  // Utiliser useCallback pour la mise à jour des suggestions
  const updateSuggestions = useCallback(() => {
    if (analyse) {
      // Vérifier si c'est une nouvelle analyse
      const isNewAnalyse = !prevAnalyseRef.current || 
        JSON.stringify(analyse) !== JSON.stringify(prevAnalyseRef.current);
      
      if (isNewAnalyse) {
        // Appeler le callback parent
        onAnalyseFound(analyse);
        prevAnalyseRef.current = analyse;
      }
    }
  }, [analyse, onAnalyseFound]);

  // Déclencher la mise à jour quand analyse change
  useEffect(() => {
    updateSuggestions();
  }, [updateSuggestions]);

  const handleCodeChange = (e) => {
    const newCode = e.target.value.toUpperCase();
    setLocalCode(newCode);
    onChange(e);
    setShowSuggestions(true);
  };

  const handleSelectSuggestion = (suggestion) => {
    setLocalCode(suggestion.code);
    onAnalyseFound(suggestion);
    setShowSuggestions(false);
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium mb-2">
        Code *
        {loading && (
          <span className="ml-2 text-xs text-gray-500">
            Recherche en cours...
          </span>
        )}
      </label>
      
      <input
        type="text"
        name="code"
        value={localCode}
        onChange={handleCodeChange}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        required={required}
        disabled={disabled}
        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
        placeholder="Tapez le code (ex: NFS001)"
        autoComplete="off"
      />

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {/* Suggestions dropdown */}
      {showSuggestions && analyse && (
        <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
          <button
            key={analyse.id}
            className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0 transition-colors"
            onClick={() => handleSelectSuggestion(analyse)}
            type="button"
          >
            <div className="flex justify-between items-center">
              <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                {analyse.code}
              </span>
              <span className="text-sm text-gray-600">
                {analyse.prix?.valeur || 0} €
              </span>
            </div>
            <div className="text-sm text-gray-700 mt-1">
              {analyse.nom?.fr || 'Nom non disponible'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Catégorie: {analyse.categorie}
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

export default AnalyseCodeField;