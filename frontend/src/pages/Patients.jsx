// ===========================================
// PAGE: Patients
// RÔLE: Liste, recherche et gestion des patients
// AVEC: Recherche instantanée (dès 2 caractères)
// ===========================================

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import useAuth from '../hooks/useAuth';
// ===== IMPORTS AJOUTÉS =====
import { genererPDFPatient } from '../utils/pdfGenerator';
import { exportToExcel } from '../utils/excelGenerator';

// Import des icônes personnalisées
import { IconSearch, IconAdd, IconEdit, IconDelete } from '../assets';

/**
 * Composant de gestion des patients
 * @returns {JSX.Element} Page de liste des patients
 */
const Patients = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // États du composant
  const [patients, setPatients] = useState([]);        // Liste complète des patients
  const [filteredPatients, setFilteredPatients] = useState([]); // Liste filtrée (recherche instantanée)
  const [loading, setLoading] = useState(true);        // État de chargement
  const [searchTerm, setSearchTerm] = useState('');    // Terme de recherche

  /**
   * Fonction pour charger tous les patients du laboratoire
   */
  const fetchAllPatients = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/patients/labo/${user.laboratoireId}`);
      const data = response.data.patients || [];
      setPatients(data);
      setFilteredPatients(data); // Initialiser la liste filtrée
    } catch (err) {
      console.error('Erreur détaillée chargement patients:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data
      });
      toast.error('Impossible de charger la liste des patients');
    } finally {
      setLoading(false);
    }
  }, [user.laboratoireId]);

  /**
   * Chargement initial des patients
   */
  useEffect(() => {
    fetchAllPatients();
  }, [fetchAllPatients]);

  // ===== RECHERCHE INSTANTANÉE =====
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.length >= 2) {
        // Filtrer en temps réel
        const filtered = patients.filter(p => 
          p.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.telephone.includes(searchTerm) ||
          (p.numeroSecuriteSociale && p.numeroSecuriteSociale.includes(searchTerm))
        );
        setFilteredPatients(filtered);
        
        // Optionnel : feedback si aucun résultat
        if (filtered.length === 0) {
          toast.info('Aucun patient trouvé pour cette recherche', { autoClose: 2000 });
        }
      } else {
        // Moins de 2 caractères → afficher tout
        setFilteredPatients(patients);
      }
    }, 300); // Délai de 300ms pour éviter les calculs trop fréquents

    return () => clearTimeout(timer);
  }, [searchTerm, patients]);


  const [laboratoire, setLaboratoire] = useState(null);

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


  /**
   * Suppression (désactivation) d'un patient
   */
  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce patient ? Cette action est réversible.')) {
      return;
    }
    
    try {
      await api.delete(`/patients/${id}`);
      toast.success('Patient supprimé avec succès');
      await fetchAllPatients(); // Recharger la liste
    } catch (err) {
      console.error('Erreur suppression:', {
        message: err.message,
        patientId: id,
        status: err.response?.status
      });
      toast.error('Erreur lors de la suppression');
    }
  };

  // Affichage du loader pendant le chargement
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des patients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Bouton retour */}
        <div className="mb-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Retour au tableau de bord
          </button>
        </div>

        {/* ===== EN-TÊTE ===== */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Gestion des patients
            </h1>
            <p className="text-gray-600 mt-1">
              {filteredPatients.length} patient(s) affiché(s) sur {patients.length}
            </p>
          </div>
          
          <button
            onClick={() => navigate('/patients/new')}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors shadow-lg hover:shadow-xl">
            <img src={IconAdd} alt="Ajouter" className="w-5 h-5" />
            Nouveau patient
          </button>
        </div>

        {/* ===== BARRE DE RECHERCHE INSTANTANÉE ===== */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-col gap-4">
            <div className="flex-1 relative">
              <label htmlFor="search" className="sr-only">
                Rechercher un patient
              </label>
              <input
                id="search"
                type="text"
                placeholder="Recherche instantanée (dès 2 caractères)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={loading}
                autoFocus
              />
              <img 
                src={IconSearch} 
                alt="" 
                className="w-5 h-5 absolute left-4 top-3.5 text-gray-400" 
                aria-hidden="true"
              />
            </div>
            
            {searchTerm.length >= 2 && (
              <p className="text-sm text-gray-500 mt-2">
                {filteredPatients.length} résultat(s) pour "{searchTerm}"
              </p>
            )}
          </div>
        </div>

        {/* ===== TABLEAU DES PATIENTS ===== */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {filteredPatients.length === 0 ? (
            // Message si aucun patient
            <div className="text-center py-16 px-4">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'Aucun résultat' : 'Aucun patient'}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchTerm 
                  ? `Aucun patient ne correspond à "${searchTerm}"`
                  : 'Commencez par ajouter votre premier patient.'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => navigate('/patients/new')}
                  className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <img src={IconAdd} alt="" className="w-5 h-5" />
                  Ajouter un patient
                </button>
              )}
            </div>
          ) : (
            // Tableau des patients
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Patient
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      N° Sécurité Sociale
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPatients.map((patient) => (
                    <tr 
                      key={patient._id} 
                      className="hover:bg-gray-50 transition-colors"
                    >
                      {/* Colonne Patient */}
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {patient.nom} {patient.prenom}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(patient.dateNaissance).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })} • {patient.sexe}
                        </div>
                      </td>
                      
                      {/* Colonne Contact */}
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{patient.telephone}</div>
                        {patient.email && (
                          <div className="text-sm text-gray-500">{patient.email}</div>
                        )}
                      </td>
                      
                      {/* Colonne N° Sécurité Sociale */}
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {patient.numeroSecuriteSociale || '-'}
                        </div>
                      </td>
                      
                      {/* Colonne Actions */}
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {/* Bouton Modifier (existant) */}
                        <button
                          onClick={() => navigate(`/patients/${patient._id}`)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Modifier le patient"
                        >
                          <img src={IconEdit} alt="Modifier" className="w-5 h-5" />
                        </button>

                        {/* ===== BOUTON PDF (Ouvrir) ===== */}
                        <button
                          onClick={async () => {
                            try {
                              const doc = await genererPDFPatient(patient, laboratoire);
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

                        {/* ===== BOUTON PDF (Télécharger) ===== */}
                        <button
                          onClick={async () => {
                            try {
                              const doc = await genererPDFPatient(patient, laboratoire);
                              if (doc) {
                                doc.save(`patient-${patient.nom}-${patient.prenom}.pdf`);
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
                              exportToExcel([patient], `patient-${patient.nom}-${patient.prenom}`, {
                                nom: 'Nom',
                                prenom: 'Prénom',
                                email: 'Email',
                                telephone: 'Téléphone',
                                adresse: 'Adresse',
                                dateNaissance: 'Date naissance',
                                sexe: 'Sexe',
                                groupeSanguin: 'Groupe sanguin',
                                numeroSecuriteSociale: 'N° Sécurité Sociale',
                                observations: 'Observations'
                              });
                              toast.success('✅ Fichier Excel généré');
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

                        {/* Bouton Supprimer (existant) */}
                        <button
                          onClick={() => handleDelete(patient._id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer le patient"
                        >
                          <img src={IconDelete} alt="Supprimer" className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Patients;