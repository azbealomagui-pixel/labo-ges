// ===========================================
// PAGE: Analyses
// RÔLE: Liste du catalogue d'analyses
// AVEC: Recherche instantanée + PDF + Excel
// ===========================================

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import useAuth from '../hooks/useAuth';
import { IconAdd, IconEdit, IconDelete, IconSearch } from '../assets';
// ===== IMPORTS POUR PDF ET EXCEL =====
import { genererPDFAnalyse } from '../utils/pdfGenerator';
import { exportToExcel } from '../utils/excelGenerator';

const Analyses = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState([]);        // Liste complète
  const [filteredAnalyses, setFilteredAnalyses] = useState([]); // Liste filtrée
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  // ===== ÉTAT POUR LES INFOS LABORATOIRE =====
  const [laboratoire, setLaboratoire] = useState(null);

  // ===== CHARGEMENT DES ANALYSES =====
  useEffect(() => {
    const fetchAnalyses = async () => {
      try {
        const response = await api.get(`/analyses/labo/${user.laboratoireId}`);
        const data = response.data.analyses || [];
        setAnalyses(data);
        setFilteredAnalyses(data);
      } catch (err) {
        console.error('❌ Erreur chargement:', err);
        toast.error('Erreur chargement catalogue');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyses();
  }, [user.laboratoireId]);

  // ===== CHARGEMENT DES INFOS LABORATOIRE =====
  useEffect(() => {
    const fetchLabo = async () => {
      try {
        const response = await api.get(`/laboratoires/${user.laboratoireId}`);
        setLaboratoire(response.data.laboratoire);
      } catch (err) {
        console.error('❌ Erreur chargement labo:', err);
      }
    };
    
    if (user?.laboratoireId) {
      fetchLabo();
    }
  }, [user?.laboratoireId]);

  // ===== RECHERCHE INSTANTANÉE =====
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.length >= 2) {
        const filtered = analyses.filter(a => 
          a.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.nom?.fr?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.categorie.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredAnalyses(filtered);
      } else {
        setFilteredAnalyses(analyses);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, analyses]);

  // ===== SUPPRESSION D'UNE ANALYSE =====
  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette analyse ?')) return;
    try {
      await api.delete(`/analyses/${id}`);
      toast.success('✅ Analyse supprimée');
      
      const updatedAnalyses = analyses.filter(a => a._id !== id);
      setAnalyses(updatedAnalyses);
      setFilteredAnalyses(updatedAnalyses.filter(a => 
        a.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.nom?.fr?.toLowerCase().includes(searchTerm.toLowerCase())
      ));
    } catch (err) {
      console.error('❌ Erreur suppression:', err);
      toast.error('Erreur suppression');
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
        
        {/* Bouton retour */}
        <div className="mb-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Retour tableau de bord
          </button>
        </div>

        {/* En-tête */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Catalogue d'analyses</h1>
            <p className="text-sm text-gray-500 mt-1">
              {filteredAnalyses.length} analyse(s) affichée(s) sur {analyses.length}
            </p>
          </div>
          <button
            onClick={() => navigate('/analyses/new')}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            <img src={IconAdd} alt="" className="w-5 h-5" />
            Nouvelle analyse
          </button>
        </div>

        {/* Barre de recherche instantanée */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Recherche instantanée (dès 2 caractères) par code, nom ou catégorie..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              autoFocus
            />
            <img src={IconSearch} alt="" className="w-5 h-5 absolute left-3 top-3.5 text-gray-400" />
          </div>
          {searchTerm.length >= 2 && (
            <p className="text-sm text-gray-500 mt-2">
              {filteredAnalyses.length} résultat(s) pour "{searchTerm}"
            </p>
          )}
        </div>

        {/* Tableau */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {filteredAnalyses.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'Aucun résultat' : 'Aucune analyse'}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchTerm 
                  ? `Aucune analyse ne correspond à "${searchTerm}"`
                  : 'Commencez par ajouter votre première analyse.'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => navigate('/analyses/new')}
                  className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <img src={IconAdd} alt="" className="w-5 h-5" />
                  Nouvelle analyse
                </button>
              )}
            </div>
          ) : (
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Catégorie</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prix</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAnalyses.map(a => (
                  <tr key={a._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-sm">{a.code}</td>
                    <td className="px-6 py-4">{a.nom?.fr || a.nom}</td>
                    <td className="px-6 py-4">{a.categorie}</td>
                    <td className="px-6 py-4 text-right font-medium">
                      {a.prix?.valeur} {a.prix?.devise || 'EUR'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        {/* Bouton Modifier */}
                        <button
                          onClick={() => navigate(`/analyses/${a._id}`)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <img src={IconEdit} alt="Modifier" className="w-5 h-5" />
                        </button>

                        {/* ===== BOUTON PDF OUVRIR ===== */}
                        <button
                          onClick={async () => {
                            try {
                              const doc = await genererPDFAnalyse(a, laboratoire);
                              if (doc) {
                                const pdfBlob = doc.output('blob');
                                const url = URL.createObjectURL(pdfBlob);
                                window.open(url, '_blank');
                                setTimeout(() => URL.revokeObjectURL(url), 1000);
                              }
                            } catch (err) {
                              console.error('❌ Erreur PDF:', err);
                              toast.error('Erreur génération PDF');
                            }
                          }}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Ouvrir le PDF"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </button>

                        {/* ===== BOUTON PDF TÉLÉCHARGER ===== */}
                        <button
                          onClick={async () => {
                            try {
                              const doc = await genererPDFAnalyse(a, laboratoire);
                              if (doc) {
                                doc.save(`analyse-${a.code}.pdf`);
                              }
                            } catch (err) {
                              console.error('❌ Erreur PDF:', err);
                              toast.error('Erreur téléchargement PDF');
                            }
                          }}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Télécharger le PDF"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </button>

                        {/* ===== BOUTON EXCEL ===== */}
                        <button
                          onClick={() => {
                            try {
                              exportToExcel([a], `analyse-${a.code}`, {
                                code: 'Code',
                                'nom.fr': 'Nom',
                                categorie: 'Catégorie',
                                'prix.valeur': 'Prix',
                                'prix.devise': 'Devise',
                                typeEchantillon: 'Type échantillon',
                                uniteMesure: 'Unité de mesure',
                                delaiRendu: 'Délai (heures)'
                              });
                              toast.success('✅ Excel généré');
                            } catch (err) {
                              console.error('❌ Erreur Excel:', err);
                              toast.error('Erreur génération Excel');
                            }
                          }}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Télécharger Excel"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </button>

                        {/* Bouton Supprimer */}
                        <button
                          onClick={() => handleDelete(a._id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <img src={IconDelete} alt="Supprimer" className="w-5 h-5" />
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