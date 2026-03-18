// ===========================================
// PAGE: RapportForm
// RÔLE: Saisie des résultats et validation
// VERSION: Corrigée avec sauvegarde fonctionnelle
// ===========================================

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import useAuth from '../hooks/useAuth';
import { IconCheck, IconPrinter } from '../assets';
import { genererPDFRapport } from '../utils/pdfGenerator';

const RapportForm = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // ID de la fiche d'analyse
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false); // ← DÉPLACÉ ICI
  const [rapport, setRapport] = useState(null);
  const [resultats, setResultats] = useState([]);

  // ===== CHARGER LA FICHE ET CRÉER LE RAPPORT =====
  useEffect(() => {
    const initRapport = async () => {
      try {
        // Créer un rapport à partir de la fiche
        const response = await api.post(`/rapports/from-fiche/${id}`, {
          validePar: user._id
        });
        setRapport(response.data.rapport);
        setResultats(response.data.rapport.resultats);
      } catch (error) {
        console.error('❌ Erreur création rapport:', error);
        toast.error('Erreur création rapport');
        navigate('/fiches-analyses');
      } finally {
        setLoading(false);
      }
    };
    initRapport();
  }, [id, user._id, navigate]);

  // ===== METTRE À JOUR UN RÉSULTAT =====
  const handleResultatChange = (index, field, value) => {
    const newResultats = [...resultats];
    newResultats[index][field] = value;

    // Calculer l'interprétation automatiquement
    if (field === 'valeur') {
      const analyse = newResultats[index];
      const vr = analyse.valeurReference;
      if (vr?.min && vr?.max) {
        if (value < vr.min) newResultats[index].interpretation = 'bas';
        else if (value > vr.max) newResultats[index].interpretation = 'elevé';
        else newResultats[index].interpretation = 'normal';
      }
    }

    setResultats(newResultats);
  };

  // ===== SAUVEGARDER LES RÉSULTATS =====
  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Appel API pour mettre à jour les résultats
      const response = await api.put(`/rapports/${rapport._id}/resultats`, { 
        resultats: resultats 
      });
      
      if (response.data.success) {
        toast.success('✅ Résultats sauvegardés');
        // Mettre à jour le rapport avec les nouvelles données
        setRapport(response.data.rapport);
      }
    } catch (error) {
      console.error('❌ Erreur sauvegarde:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  // ===== VALIDER LE RAPPORT (VERSION AVEC DÉBOGAGE) =====
  const handleValider = async () => {
    try {
      const signature = prompt('Entrez votre signature:');
      if (!signature) return;

      console.log('1️⃣ Envoi de la validation...');
      const response = await api.patch(`/rapports/${rapport._id}/valider`, {
        signature,
        cachet: 'Cachet officiel'
      });

      if (response.data.success) {
        toast.success('✅ Rapport validé');
        
        console.log('2️⃣ Génération du PDF...');
        console.log('📦 Données du rapport:', response.data.rapport);
        
        try {
          const doc = await genererPDFRapport(response.data.rapport, user);
          
          console.log('3️⃣ Résultat de genererPDFRapport:', doc ? '✅ OK' : '❌ null');
          
          if (doc) {
            console.log('4️⃣ Création du blob...');
            const pdfBlob = doc.output('blob');
            console.log('📦 Taille du blob:', pdfBlob.size, 'octets');
            
            const url = URL.createObjectURL(pdfBlob);
            console.log('5️⃣ URL créée:', url);
            
            window.open(url, '_blank');
            console.log('6️⃣ Nouvel onglet ouvert');
            
            setTimeout(() => {
              URL.revokeObjectURL(url);
              console.log('7️⃣ URL révoquée');
            }, 1000);
          } else {
            console.error('❌ doc est null - erreur dans genererPDFRapport');
            toast.error('Erreur génération PDF');
          }
        } catch (pdfError) {
          console.error('❌ Erreur PDF détaillée:', pdfError);
          toast.error('Erreur lors de la génération du PDF');
        }
      }
    } catch (error) {
      console.error('❌ Erreur validation:', error);
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
              🏠 Dashboard
            </button>
          </div>

          <h1 className="text-2xl font-bold mb-6">Saisie des résultats</h1>

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
                        value={r.valeur}
                        onChange={(e) => handleResultatChange(index, 'valeur', parseFloat(e.target.value))}
                        className="w-24 px-2 py-1 border rounded text-center"
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
                        value={r.commentaire}
                        onChange={(e) => handleResultatChange(index, 'commentaire', e.target.value)}
                        className="w-full px-2 py-1 border rounded"
                        placeholder="..."
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Boutons */}
          <div className="flex gap-4 mt-8">
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default RapportForm;