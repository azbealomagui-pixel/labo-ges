// ===========================================
// PAGE: Analyses
// RÔLE: Liste des analyses du catalogue
// ===========================================

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; // ← AJOUTER useLocation
import { toast } from 'react-toastify';
import api from '../services/api';
import useAuth from '../hooks/useAuth';
import { IconAdd, IconEdit, IconDelete } from '../assets';

const Analyses = () => {
  const navigate = useNavigate();
  const location = useLocation(); // ← AJOUTER
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);

  // ===== CHARGEMENT DES ANALYSES =====
  const fetchAnalyses = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/analyses/labo/${user.espaceId}`);
      setAnalyses(response.data.analyses || []);
    } catch (error) {
      console.error('❌ Erreur chargement analyses:', error);
      toast.error('Impossible de charger les analyses');
    } finally {
      setLoading(false);
    }
  }, [user.espaceId]);

  // ===== RECHARGEMENT QUAND ON REVIENT SUR LA PAGE =====
  useEffect(() => {
    fetchAnalyses();
  }, [fetchAnalyses, location.key]); // ← AJOUTER location.key

  // ===== SUPPRESSION =====
  const handleDelete = async (id, nom) => {
    if (!window.confirm(`Supprimer l'analyse ${nom} ?`)) return;
    
    try {
      await api.delete(`/analyses/${id}`);
      toast.success('✅ Analyse supprimée');
      fetchAnalyses(); // Recharger la liste
    } catch (error) {
      console.error('Erreur suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        
        {/* En-tête */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Catalogue des analyses</h1>
          <button
            onClick={() => navigate('/analyses/new')}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
          >
            <img src={IconAdd} alt="" className="w-5 h-5" />
            Nouvelle analyse
          </button>
        </div>

        {/* Tableau */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
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
                <tr key={analyse._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono text-sm">{analyse.code}</td>
                  <td className="px-6 py-4">{analyse.nom?.fr || analyse.nom}</td>
                  <td className="px-6 py-4">{analyse.categorie}</td>
                  <td className="px-6 py-4 text-right">
                    {analyse.prix?.valeur} {analyse.prix?.devise || 'EUR'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => navigate(`/analyses/${analyse._id}`)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Modifier"
                      >
                        <img src={IconEdit} alt="" className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(analyse._id, analyse.nom?.fr || analyse.nom)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
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
        </div>
      </div>
    </div>
  );
};

export default Analyses;