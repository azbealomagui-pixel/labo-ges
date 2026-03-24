// ===========================================
// PAGE: RapportForm
// RÔLE: Saisie des résultats et validation
// VERSION: Finale avec chargement persistant et sauvegarde fonctionnelle
// ===========================================

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import useAuth from '../hooks/useAuth';
import { IconCheck } from '../assets';
import { genererPDFRapport } from '../utils/pdfGenerator';

const RapportForm = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // ID de la fiche d'analyse
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rapport, setRapport] = useState(null);
  const [resultats, setResultats] = useState([]);

  // ===== CHARGER LE RAPPORT EXISTANT OU EN CRÉER UN =====
  useEffect(() => {
    const loadRapport = async () => {
      try {
        setLoading(true);
        
        // Étape 1 : Essayer de charger un rapport existant
        try {
          const response = await api.get(`/rapports/${id}`);
          console.log('Rapport existant chargé:', response.data.rapport);
          setRapport(response.data.rapport);
          setResultats(response.data.rapport.resultats || []);
          setLoading(false);
          return;
        } catch (error) {
          // Si 404, le rapport n'existe pas encore, on le crée
          if (error.response?.status === 404) {
            console.log('Création d\'un nouveau rapport...');
            const createResponse = await api.post(`/rapports/from-fiche/${id}`, {
              validePar: user._id
            });
            console.log('Nouveau rapport créé:', createResponse.data.rapport);
            setRapport(createResponse.data.rapport);
            setResultats(createResponse.data.rapport.resultats || []);
          } else {
            // Autre erreur
            throw error;
          }
        }
      } catch (error) {
        console.error('Erreur chargement rapport:', error);
        toast.error('Erreur lors du chargement du rapport');
        navigate('/fiches-analyses');
      } finally {
        setLoading(false);
      }
    };

    if (id && user?._id) {
      loadRapport();
    }
  }, [id, user?._id, navigate]);

  // ===== METTRE À JOUR UN RÉSULTAT =====
  const handleResultatChange = (index, field, value) => {
    const newResultats = [...resultats];
    newResultats[index][field] = value;

    // Calculer l'interprétation automatiquement
    if (field === 'valeur') {
      const analyse = newResultats[index];
      const vr = analyse.valeurReference;
      if (vr?.min && vr?.max) {
        const valNum = parseFloat(value) || 0;
        if (valNum < vr.min) newResultats[index].interpretation = 'bas';
        else if (valNum > vr.max) newResultats[index].interpretation = 'elevé';
        else newResultats[index].interpretation = 'normal';
      }
    }

    setResultats(newResultats);
  };

  // ===== SAUVEGARDER LES RÉSULTATS =====
  const handleSave = async () => {
    if (!rapport?._id) {
      toast.error('Aucun rapport à sauvegarder');
      return;
    }

    setSaving(true);
    try {
      console.log('Sauvegarde des résultats...');
      const response = await api.put(`/rapports/${rapport._id}/resultats`, { 
        resultats: resultats 
      });
      
      if (response.data.success) {
        toast.success('Résultats sauvegardés');
        setRapport(response.data.rapport);
        console.log('Sauvegarde réussie');
      }
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      toast.error(error.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  // ===== VALIDER LE RAPPORT (VERSION CORRIGÉE) =====
  const handleValider = async () => {
    try {
      const signature = prompt('Entrez votre signature:');
      if (!signature) return;

      const response = await api.patch(`/rapports/${rapport._id}/valider`, {
        signature,
        cachet: 'Cachet officiel'
      });

      if (response.data.success) {
        toast.success('Rapport validé');
        
        // Charger l'espace avant de générer le PDF
        const espaceId = user?.laboratoireId || user?.espaceId;
        const espaceRes = await api.get(`/espaces/${espaceId}`);
        const espace = espaceRes.data.espace;
        
        const doc = await genererPDFRapport(response.data.rapport, user, espace);
        if (doc) {
          const pdfBlob = doc.output('blob');
          const url = URL.createObjectURL(pdfBlob);
          window.open(url, '_blank');
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
      }
    } catch (error) {
      console.error('Erreur validation:', error);
      toast.error('Erreur validation');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!rapport) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Rapport non trouvé</p>
          <button
            onClick={() => navigate('/fiches-analyses')}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
          >
            Retour à la liste
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg p-8">
          
          {/* Navigation */}
          <div className="mb-6 flex items-center gap-4 border-b pb-4">
            <button onClick={() => navigate('/fiches-analyses')} className="text-gray-600 hover:text-gray-900">
              ← Retour
            </button>
            <span>|</span>
            <button onClick={() => navigate('/dashboard')} className="text-gray-600 hover:text-gray-900">
              Dashboard
            </button>
          </div>

          <h1 className="text-2xl font-bold mb-6">
            {rapport.statut === 'final' ? 'Rapport validé' : 'Saisie des résultats'}
          </h1>

          {rapport.statut === 'final' && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700">
                ✅ Ce rapport a été validé le {new Date(rapport.dateValidation).toLocaleDateString('fr-FR')}
              </p>
            </div>
          )}

          {/* Tableau des résultats */}
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Analyse</th>
                  <th className="px-4 py-2 text-left">Code</th>
                  <th className="px-4 py-2 text-center">Valeur</th>
                  <th className="px-4 py-2 text-left">Unité</th>
                  <th className="px-4 py-2 text-left">Norme</th>
                  <th className="px-4 py-2 text-left">Interprétation</th>
                  <th className="px-4 py-2 text-left">Commentaire</th>
                </tr>
              </thead>
              <tbody>
                {resultats.map((r, index) => (
                  <tr key={index} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2">{r.nom}</td>
                    <td className="px-4 py-2 font-mono text-sm">{r.code}</td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        step="0.01"
                        value={r.valeur || ''}
                        onChange={(e) => handleResultatChange(index, 'valeur', parseFloat(e.target.value) || 0)}
                        className="w-24 px-2 py-1 border rounded text-center"
                        disabled={rapport.statut === 'final'}
                      />
                    </td>
                    <td className="px-4 py-2">{r.unite}</td>
                    <td className="px-4 py-2">
                      {r.valeurReference?.min} - {r.valeurReference?.max}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        r.interpretation === 'normal' ? 'bg-green-100 text-green-800' :
                        r.interpretation === 'elevé' ? 'bg-orange-100 text-orange-800' :
                        r.interpretation === 'bas' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {r.interpretation}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={r.commentaire || ''}
                        onChange={(e) => handleResultatChange(index, 'commentaire', e.target.value)}
                        className="w-full px-2 py-1 border rounded"
                        placeholder="..."
                        disabled={rapport.statut === 'final'}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Boutons */}
          <div className="flex gap-4 mt-8">
            {rapport.statut !== 'final' && (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
                <button
                  onClick={handleValider}
                  className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                >
                  <img src={IconCheck} alt="" className="w-5 h-5" />
                  Valider le rapport
                </button>
              </>
            )}
            {rapport.statut === 'final' && (
              <button
                onClick={async () => {
                  const doc = await genererPDFRapport(rapport, user);
                  if (doc) {
                    const pdfBlob = doc.output('blob');
                    const url = URL.createObjectURL(pdfBlob);
                    window.open(url, '_blank');
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                  }
                }}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
              >
                Voir le PDF
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RapportForm;