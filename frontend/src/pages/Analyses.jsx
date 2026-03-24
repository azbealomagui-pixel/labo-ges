// ===========================================
// PAGE: Analyses
// RÔLE: Liste des analyses du catalogue
// VERSION: Finale avec corrections ESLint
// ===========================================

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import useAuth from '../hooks/useAuth';
import { IconAdd, IconEdit, IconDelete } from '../assets';

const Analyses = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ===== CHARGEMENT DES ANALYSES =====
  const fetchAnalyses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // CORRECTION : utiliser laboratoireId ou espaceId
      const espaceId = user?.laboratoireId || user?.espaceId;
      
      if (!espaceId) {
        console.error('❌ espaceId manquant dans user:', user);
        setError('Configuration espace invalide');
        toast.error('Configuration espace invalide');
        setAnalyses([]);
        return;
      }

      console.log('🔍 Chargement analyses pour espaceId:', espaceId);
      
      const response = await api.get(`/analyses/labo/${espaceId}`);
      console.log('📦 Réponse API:', response.data);
      
      setAnalyses(response.data.analyses || []);
      
      if (response.data.analyses?.length === 0) {
        console.log('ℹ️ Aucune analyse trouvée');
      }
      
    } catch (error) {
      console.error('❌ Erreur chargement analyses:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      setError('Impossible de charger la liste du catalogue');
      toast.error('Impossible de charger la liste du catalogue');
      setAnalyses([]);
      
    } finally {
      setLoading(false);
    }
  }, [user]); 

  // ===== RECHARGEMENT QUAND ON REVIENT SUR LA PAGE =====
  useEffect(() => {
    fetchAnalyses();
  }, [fetchAnalyses, location.key]); // ← location.key pour forcer le rechargement

  // ===== SUPPRESSION =====
  const handleDelete = async (id, nom) => {
    if (!window.confirm(`Supprimer l'analyse "${nom}" ?`)) return;
    
    try {
      await api.delete(`/analyses/${id}`);
      toast.success('✅ Analyse supprimée');
      fetchAnalyses(); // Recharger la liste
    } catch (error) {
      console.error('❌ Erreur suppression:', error);
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  // ===== AFFICHAGE DU LOADER =====
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  // ===== AFFICHAGE D'ERREUR =====
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchAnalyses}
              className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        
        {/* En-tête */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Catalogue des analyses</h1>
            <p className="text-gray-600 mt-1">{analyses.length} analyse(s)</p>
          </div>
          <button
            onClick={() => navigate('/analyses/new')}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            <img src={IconAdd} alt="" className="w-5 h-5" />
            Nouvelle analyse
          </button>
        </div>

        {/* Tableau */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {analyses.length === 0 ? (
            <div className="text-center py-16 px-4">
              <p className="text-gray-500 mb-4">Aucune analyse dans le catalogue</p>
              <button
                onClick={() => navigate('/analyses/new')}
                className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors"
              >
                <img src={IconAdd} alt="" className="w-5 h-5" />
                Créer la première analyse
              </button>
            </div>
          ) : (
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Catégorie</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Prix</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {analyses.map(analyse => (
                  <tr key={analyse._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-sm">{analyse.code}</td>
                    <td className="px-6 py-4">{analyse.nom?.fr || analyse.nom}</td>
                    <td className="px-6 py-4">{analyse.categorie}</td>
                    <td className="px-6 py-4 text-right">
                      {analyse.prix?.valeur?.toLocaleString()} {analyse.prix?.devise || 'EUR'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => navigate(`/analyses/${analyse._id}`)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <img src={IconEdit} alt="" className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(analyse._id, analyse.nom?.fr || analyse.nom)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <img src={IconDelete} alt="" className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analyses;