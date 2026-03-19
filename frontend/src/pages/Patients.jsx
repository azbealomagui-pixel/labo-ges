// ===========================================
// PAGE: Patients
// RÔLE: Liste, recherche et gestion des patients
// VERSION: Finale avec affichage entreprise
// ===========================================

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import useAuth from '../hooks/useAuth';
import { genererPDFPatient } from '../utils/pdfGenerator';
import { exportToExcel } from '../utils/excelGenerator';
import { IconSearch, IconAdd, IconEdit, IconDelete } from '../assets';

const Patients = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // États
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [espace, setEspace] = useState(null);

  // ===== ÉTAT POUR LA MODALE DE SUPPRESSION =====
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    patientId: null,
    patientNom: ''
  });

  // ===== CHARGEMENT DES PATIENTS =====
  const fetchAllPatients = useCallback(async () => {
    try {
      setLoading(true);
      const espaceId = user?.laboratoireId || user?.espaceId;
      const response = await api.get(`/patients/labo/${espaceId}`);
      const data = response.data.patients || [];
      setPatients(data);
      setFilteredPatients(data);
    } catch (error) {
      console.error('❌ Erreur chargement patients:', {
        message: error.message,
        status: error.response?.status
      });
      toast.error('Impossible de charger la liste des patients. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // ===== CHARGEMENT DE L'ESPACE =====
  useEffect(() => {
    const fetchEspace = async () => {
      try {
        const espaceId = user?.laboratoireId || user?.espaceId;
        const response = await api.get(`/espaces/${espaceId}`);
        setEspace(response.data.espace);
      } catch (error) {
        console.error('❌ Erreur chargement espace:', error.message);
      }
    };
    if (user?.espaceId || user?.laboratoireId) {
      fetchEspace();
    }
  }, [user]);

  // ===== CHARGEMENT INITIAL =====
  useEffect(() => {
    fetchAllPatients();
  }, [fetchAllPatients]);

  // ===== RECHERCHE INSTANTANÉE =====
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.length >= 2) {
        const filtered = patients.filter(p => 
          p.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.telephone.includes(searchTerm) ||
          (p.numeroSecuriteSociale && p.numeroSecuriteSociale.includes(searchTerm))
        );
        setFilteredPatients(filtered);
        
        if (filtered.length === 0) {
          toast.info(`🔍 Aucun patient trouvé pour "${searchTerm}"`, { autoClose: 2000 });
        }
      } else {
        setFilteredPatients(patients);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, patients]);

  // ===== OUVRIR LA MODALE DE SUPPRESSION =====
  const openDeleteModal = (id, nom, prenom) => {
    setDeleteModal({
      isOpen: true,
      patientId: id,
      patientNom: `${prenom} ${nom}`
    });
  };

  // ===== SUPPRIMER UN PATIENT =====
  const handleConfirmDelete = async () => {
    try {
      await api.delete(`/patients/${deleteModal.patientId}`);
      toast.success(`🗑️ ${deleteModal.patientNom} a été supprimé`);
      
      const updatedPatients = patients.filter(p => p._id !== deleteModal.patientId);
      setPatients(updatedPatients);
      
      if (searchTerm.length >= 2) {
        const filtered = updatedPatients.filter(p => 
          p.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.telephone.includes(searchTerm)
        );
        setFilteredPatients(filtered);
      } else {
        setFilteredPatients(updatedPatients);
      }
      
      setDeleteModal({ isOpen: false, patientId: null, patientNom: '' });
      
    } catch (error) {
      console.error('❌ Erreur suppression:', error.message);
      toast.error(error.response?.data?.message || '❌ Échec de la suppression. Veuillez réessayer.');
    }
  };

  // ===== EXPORT EXCEL =====
  const handleExportExcel = () => {
    try {
      const patientsAExporter = filteredPatients.map(p => ({
        nom: p.nom,
        prenom: p.prenom,
        email: p.email || '',
        telephone: p.telephone,
        adresse: p.adresse,
        dateNaissance: new Date(p.dateNaissance).toLocaleDateString('fr-FR'),
        sexe: p.sexe === 'M' ? 'Masculin' : p.sexe === 'F' ? 'Féminin' : p.sexe,
        groupeSanguin: p.groupeSanguin || '',
        numeroSecuriteSociale: p.numeroSecuriteSociale || '',
        observations: p.observations || ''
      }));

      exportToExcel(patientsAExporter, `patients-${new Date().toISOString().split('T')[0]}`, {
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
      
      toast.success(`📊 ${patientsAExporter.length} patient(s) exportés avec succès`);
    } catch (error) {
      console.error('❌ Erreur Excel:', error.message);
      toast.error('❌ Erreur lors de l\'export Excel');
    }
  };

  // ===== GÉNÉRATION PDF =====
  const handleOpenPDF = async (patient) => {
    try {
      const doc = await genererPDFPatient(patient, espace);
      if (doc) {
        const url = URL.createObjectURL(doc.output('blob'));
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (error) {
      console.error('❌ Erreur PDF:', error.message);
      toast.error('❌ Erreur lors de la génération du PDF');
    }
  };

  const handleDownloadPDF = async (patient) => {
    try {
      const doc = await genererPDFPatient(patient, espace);
      if (doc) {
        doc.save(`patient-${patient.nom}-${patient.prenom}.pdf`);
        toast.success(`📄 PDF téléchargé : ${patient.prenom} ${patient.nom}`);
      }
    } catch (error) {
      console.error('❌ Erreur PDF:', error.message);
      toast.error('❌ Erreur lors du téléchargement du PDF');
    }
  };

  // ===== AFFICHAGE DU LOADER =====
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

        {/* ===== BOUTON RETOUR ===== */}
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
          
          <div className="flex gap-4">
            {/* Bouton Excel */}
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors shadow-lg hover:shadow-xl"
              title="Exporter tous les patients"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export Excel
            </button>

            <button
              onClick={() => navigate('/patients/new')}
              className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors shadow-lg hover:shadow-xl"
            >
              <img src={IconAdd} alt="Ajouter" className="w-5 h-5" />
              Nouveau patient
            </button>
          </div>
        </div>

        {/* ===== BARRE DE RECHERCHE ===== */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-col gap-4">
            <div className="flex-1 relative">
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
              <img src={IconSearch} alt="" className="w-5 h-5 absolute left-4 top-3.5 text-gray-400" />
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
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">N° Sécurité Sociale</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPatients.map((patient) => (
                    <tr key={patient._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {patient.nom} {patient.prenom}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(patient.dateNaissance).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })} • {patient.sexe === 'M' ? 'Homme' : patient.sexe === 'F' ? 'Femme' : patient.sexe}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {espace?.nom || 'LaboGes'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{patient.telephone}</div>
                        {patient.email && <div className="text-sm text-gray-500">{patient.email}</div>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {patient.numeroSecuriteSociale || '—'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          {/* Modifier */}
                          <button
                            onClick={() => navigate(`/patients/${patient._id}`)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Modifier"
                          >
                            <img src={IconEdit} alt="Modifier" className="w-5 h-5" />
                          </button>

                          {/* PDF Ouvrir */}
                          <button
                            onClick={() => handleOpenPDF(patient)}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Ouvrir PDF"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          </button>

                          {/* PDF Télécharger */}
                          <button
                            onClick={() => handleDownloadPDF(patient)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Télécharger PDF"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </button>

                          {/* Nouvelle fiche d'analyses */}
                          <button
                            onClick={() => navigate(`/fiche-analyses/new?patientId=${patient._id}`)}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Nouvelle fiche d'analyses"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                          </button>

                          {/* Supprimer */}
                          <button
                            onClick={() => openDeleteModal(patient._id, patient.nom, patient.prenom)}
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
            </div>
          )}
        </div>

        {/* ===== MODALE DE CONFIRMATION DE SUPPRESSION ===== */}
        {deleteModal.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-fade-in">
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <h2 className="text-xl font-bold text-gray-900">Confirmation</h2>
              </div>
              
              <p className="text-gray-700 mb-6">
                Êtes-vous sûr de vouloir supprimer <span className="font-semibold">{deleteModal.patientNom}</span> ?
                <br />
                <span className="text-sm text-red-500 mt-2 inline-block">⚠️ Cette action est irréversible.</span>
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Oui, supprimer
                </button>
                <button
                  onClick={() => setDeleteModal({ isOpen: false, patientId: null, patientNom: '' })}
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Patients;