// ===========================================
// PAGE: FicheAnalyseForm
// RÔLE: Création d'une fiche d'analyses pour un patient
// AVEC: Navigation complète
// ===========================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import useAuth from '../hooks/useAuth';
import { IconSearch, IconAdd, IconDelete } from '../assets';

// ===== LISTE DES DEVISES =====
const CURRENCIES = [
  { code: 'EUR', symbole: '€', nom: 'Euro' },
  { code: 'USD', symbole: '$', nom: 'Dollar américain' },
  { code: 'GNF', symbole: 'FG', nom: 'Franc guinéen' },
  { code: 'XOF', symbole: 'CFA', nom: 'Franc CFA' },
];

const FicheAnalyseForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedAnalyses, setSelectedAnalyses] = useState([]);
  const [ficheCreeeId, setFicheCreeeId] = useState(null);
  const [isUserReady, setIsUserReady] = useState(false);
  
  // États pour la saisie en cours
  const [currentCode, setCurrentCode] = useState('');
  const [currentAnalyse, setCurrentAnalyse] = useState(null);
  const [currentQuantite, setCurrentQuantite] = useState(1);
  
  const [searchPatient, setSearchPatient] = useState('');
  const [devise, setDevise] = useState('EUR');
  const [notes, setNotes] = useState('');

  // ===== VÉRIFICATION QUE L'UTILISATEUR EST PRÊT =====
  useEffect(() => {
    if (user && (user.laboratoireId || user.espaceId)) {
      console.log('✅ Utilisateur prêt:', {
        id: user._id,
        laboratoireId: user.laboratoireId,
        espaceId: user.espaceId
      });
      setIsUserReady(true);
    } else {
      console.log('⏳ Utilisateur en cours de chargement...');
      setIsUserReady(false);
    }
  }, [user]);

  // ===== CHARGEMENT DES PATIENTS =====
  useEffect(() => {
    const fetchPatients = async () => {
      if (!isUserReady) {
        console.log("Utilisateur non chargé, attente...");
        return;
      }

      try {
        const espaceId = user.laboratoireId || user.espaceId;
        
        console.log('🔍 Chargement patients pour espaceId:', espaceId);
        
        const response = await api.get(`/patients/labo/${espaceId}`);
        setPatients(response.data.patients || []);
        console.log(`📦 ${response.data.patients?.length || 0} patients chargés`);
      } catch (err) {
        console.error('❌ Erreur chargement patients:', err);
        toast.error('Impossible de charger la liste des patients');
      }
    };
    
    fetchPatients();
  }, [isUserReady, user]);

  // ===== CHARGEMENT DES ANALYSES =====
  useEffect(() => {
    const fetchAnalyses = async () => {
      if (!isUserReady) return;

      try {
        const espaceId = user.laboratoireId || user.espaceId;
        
        console.log('🔍 Chargement analyses pour espaceId:', espaceId);
        
        const response = await api.get(`/analyses/labo/${espaceId}`);
        setAnalyses(response.data.analyses || []);
        console.log(`📦 ${response.data.analyses?.length || 0} analyses chargées`);
      } catch (err) {
        console.error('❌ Erreur chargement analyses:', err);
        toast.error('Impossible de charger le catalogue des analyses');
      }
    };
    
    fetchAnalyses();
  }, [isUserReady, user]);

  // ===== SÉLECTION AUTOMATIQUE DU PATIENT DEPUIS L'URL =====
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const patientId = params.get('patientId');
    
    if (patientId && patients.length > 0) {
      const patient = patients.find(p => p._id === patientId);
      if (patient) {
        setSelectedPatient(patient);
        toast.info(`Patient ${patient.nom} ${patient.prenom} présélectionné`);
      }
    }
  }, [location.search, patients]);

  // ===== RECHERCHE INSTANTANÉE DU CODE =====
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentCode.length >= 2) {
        const analyse = analyses.find(a => 
          a.code.toLowerCase() === currentCode.toLowerCase()
        );

        if (analyse) {
          setCurrentAnalyse({
            id: analyse._id,
            code: analyse.code,
            nom: analyse.nom?.fr || analyse.nom,
            categorie: analyse.categorie,
            prixUnitaire: analyse.prix?.valeur || 0,
            devise: analyse.prix?.devise || 'EUR'
          });
          toast.success(`Analyse trouvée : ${analyse.nom?.fr || analyse.nom}`);
        } else {
          setCurrentAnalyse(null);
        }
      } else {
        setCurrentAnalyse(null);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [currentCode, analyses]);

  // ===== AJOUTER L'ANALYSE COURANTE À LA LISTE =====
  const addCurrentToFiche = () => {
    if (!currentAnalyse) {
      toast.error('Veuillez d\'abord rechercher une analyse valide');
      return;
    }

    const nouvelleLigne = {
      analyseId: currentAnalyse.id,
      code: currentAnalyse.code,
      nom: currentAnalyse.nom,
      categorie: currentAnalyse.categorie,
      prixUnitaire: currentAnalyse.prixUnitaire,
      devise: currentAnalyse.devise,
      quantite: currentQuantite,
      prixTotal: currentAnalyse.prixUnitaire * currentQuantite
    };

    setSelectedAnalyses([...selectedAnalyses, nouvelleLigne]);
    
    setCurrentCode('');
    setCurrentAnalyse(null);
    setCurrentQuantite(1);
    
    toast.success('Analyse ajoutée à la liste');
  };

  // ===== SUPPRIMER UNE ANALYSE =====
  const removeAnalyse = (index) => {
    const filtered = selectedAnalyses.filter((_, i) => i !== index);
    setSelectedAnalyses(filtered);
    toast.info('Analyse retirée de la liste');
  };

  // ===== METTRE À JOUR LA QUANTITÉ =====
  const updateQuantite = (index, newQuantite) => {
    const quantite = parseInt(newQuantite) || 1;
    if (quantite < 1) return;

    const updatedList = [...selectedAnalyses];
    updatedList[index].quantite = quantite;
    updatedList[index].prixTotal = quantite * updatedList[index].prixUnitaire;
    setSelectedAnalyses(updatedList);
  };

  // ===== CALCULER LE TOTAL GÉNÉRAL =====
  const calculerTotalGeneral = () => {
    return selectedAnalyses.reduce((sum, a) => sum + a.prixTotal, 0);
  };

  // ===== RECHERCHE FILTRÉE DES PATIENTS =====
  const filteredPatients = patients.filter(p => 
    p.nom.toLowerCase().includes(searchPatient.toLowerCase()) ||
    p.prenom.toLowerCase().includes(searchPatient.toLowerCase())
  );

  // ===== SOUMISSION =====
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedPatient) {
      toast.error('Veuillez sélectionner un patient');
      return;
    }

    if (selectedAnalyses.length === 0) {
      toast.error('Veuillez ajouter au moins une analyse');
      return;
    }

    if (!isUserReady) {
      toast.error('Utilisateur non authentifié');
      return;
    }

    setLoading(true);

    try {
      const espaceId = user.laboratoireId || user.espaceId;
      
      if (!espaceId) {
        toast.error('Configuration espace invalide');
        return;
      }

      const ficheData = {
        patientId: selectedPatient._id,
        laboratoireId: espaceId,
        createdBy: user._id,
        devise,
        notes,
        lignes: selectedAnalyses.map(a => ({
          analyseId: a.analyseId,
          code: a.code,
          nom: a.nom,
          categorie: a.categorie,
          prixUnitaire: a.prixUnitaire,
          devise: a.devise,
          quantite: a.quantite,
          prixTotal: a.prixTotal,
          observations: ''
        }))
      };

      console.log('📦 Données envoyées:', ficheData);

      const response = await api.post('/fiches-analyses', ficheData);
      
      if (response.data.success) {
        toast.success('✅ Fiche d\'analyse créée avec succès');
        setFicheCreeeId(response.data.fiche._id);
      }
    } catch (err) {
      console.error('❌ Erreur création:', err);
      toast.error(err.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  // ===== AFFICHAGE DU LOADER INITIAL =====
  if (!isUserReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de vos données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg p-8">
          
          {/* ===== NAVIGATION (BONS ENDROITS) ===== */}
          <div className="mb-6 flex items-center gap-4 border-b pb-4 flex-wrap">
            <button 
              onClick={() => navigate('/patients')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="hidden sm:inline">Patients</span>
            </button>
            
            <span className="text-gray-300">|</span>
            
            <button 
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="hidden sm:inline">Dashboard</span>
            </button>
            
            <span className="text-gray-300">|</span>
            
            {/* BOUTON VERS LISTE DES FICHES - ICI AU BON ENDROIT */}
            <button 
              onClick={() => navigate('/fiches-analyses')}
              className="flex items-center gap-2 text-green-600 hover:text-green-700 transition-colors"
              title="Voir toutes les fiches"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="hidden sm:inline">Liste des fiches</span>
            </button>
          </div>

          <h1 className="text-2xl font-bold mb-6">Nouvelle fiche d'analyses</h1>

          <form onSubmit={handleSubmit}>
            
            {/* SECTION 1 : PATIENT */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4">1. Patient</h2>
              <div className="relative mb-4">
                <input
                  type="text"
                  placeholder="Rechercher un patient..."
                  value={searchPatient}
                  onChange={(e) => setSearchPatient(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                />
                <img src={IconSearch} alt="" className="w-5 h-5 absolute left-3 top-2.5 opacity-50" />
              </div>

              <div className="border rounded-lg max-h-40 overflow-y-auto">
                {filteredPatients.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    Aucun patient trouvé
                  </div>
                ) : (
                  filteredPatients.map(p => (
                    <div
                      key={p._id}
                      onClick={() => setSelectedPatient(p)}
                      className={`p-3 cursor-pointer hover:bg-gray-50 border-b ${
                        selectedPatient?._id === p._id ? 'bg-primary-50 border-l-4 border-l-primary-600' : ''
                      }`}
                    >
                      <div className="font-medium">{p.nom} {p.prenom}</div>
                      <div className="text-sm text-gray-600">{p.telephone}</div>
                    </div>
                  ))
                )}
              </div>

              {selectedPatient && (
                <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                  <span className="font-medium">Patient sélectionné :</span>{' '}
                  {selectedPatient.nom} {selectedPatient.prenom}
                </div>
              )}
            </div>

            {/* SECTION 2 : AJOUT D'ANALYSE */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4">2. Ajouter une analyse</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Code analyse</label>
                  <input
                    type="text"
                    value={currentCode}
                    onChange={(e) => setCurrentCode(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="Tapez 2+ caractères..."
                  />
                </div>
                
                {currentAnalyse && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2">Catégorie</label>
                      <input
                        type="text"
                        value={currentAnalyse.categorie}
                        readOnly
                        className="w-full px-4 py-2 border rounded-lg bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Nom</label>
                      <input
                        type="text"
                        value={currentAnalyse.nom}
                        readOnly
                        className="w-full px-4 py-2 border rounded-lg bg-gray-50"
                      />
                    </div>
                  </>
                )}
              </div>

              {currentAnalyse && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Prix unitaire</label>
                    <input
                      type="number"
                      value={currentAnalyse.prixUnitaire}
                      readOnly
                      className="w-full px-4 py-2 border rounded-lg bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Quantité</label>
                    <input
                      type="number"
                      min="1"
                      value={currentQuantite}
                      onChange={(e) => setCurrentQuantite(parseInt(e.target.value) || 1)}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={addCurrentToFiche}
                      className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
                    >
                      <img src={IconAdd} alt="" className="w-5 h-5" />
                      Ajouter
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 3 : LISTE DES ANALYSES */}
            {selectedAnalyses.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4">3. Analyses sélectionnées</h2>
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left">#</th>
                        <th className="px-4 py-2 text-left">Code</th>
                        <th className="px-4 py-2 text-left">Analyse</th>
                        <th className="px-4 py-2 text-left">Catégorie</th>
                        <th className="px-4 py-2 text-right">Prix unitaire</th>
                        <th className="px-4 py-2 text-center">Qté</th>
                        <th className="px-4 py-2 text-right">Total</th>
                        <th className="px-4 py-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedAnalyses.map((a, index) => (
                        <tr key={index} className="border-t">
                          <td className="px-4 py-2">{index + 1}</td>
                          <td className="px-4 py-2 font-mono">{a.code}</td>
                          <td className="px-4 py-2">{a.nom}</td>
                          <td className="px-4 py-2">{a.categorie}</td>
                          <td className="px-4 py-2 text-right">
                            {a.prixUnitaire.toLocaleString()} {a.devise}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <input
                              type="number"
                              min="1"
                              value={a.quantite}
                              onChange={(e) => updateQuantite(index, e.target.value)}
                              className="w-16 px-2 py-1 border rounded text-center"
                            />
                          </td>
                          <td className="px-4 py-2 text-right font-medium">
                            {a.prixTotal.toLocaleString()} {a.devise}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <button
                              onClick={() => removeAnalyse(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <img src={IconDelete} alt="" className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-100">
                      <tr>
                        <td colSpan="6" className="px-4 py-3 text-right font-bold">
                          TOTAL GÉNÉRAL
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-primary-600">
                          {calculerTotalGeneral().toLocaleString()} {devise}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* DEVISE ET NOTES */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2">Devise</label>
                <select
                  value={devise}
                  onChange={(e) => setDevise(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  {CURRENCIES.map(c => (
                    <option key={c.code} value={c.code}>
                      {c.nom} ({c.symbole})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Observations..."
                />
              </div>
            </div>

            {/* BOUTONS */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading || !selectedPatient || selectedAnalyses.length === 0}
                className="flex-1 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? 'Création...' : 'Créer la fiche'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/patients')}
                className="flex-1 bg-gray-200 px-6 py-3 rounded-lg hover:bg-gray-300"
              >
                Annuler
              </button>
            </div>
          </form>

          {/* ===== BOUTON PV FINAL ===== */}
          {ficheCreeeId && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 mb-3 font-medium">✅ Fiche créée avec succès</p>
              <div className="flex gap-3">
                <button
                  onClick={() => navigate(`/rapport/${ficheCreeeId}`)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  📄 Générer le PV final
                </button>
                <button
                  onClick={() => navigate('/patients')}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                >
                  Retour aux patients
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FicheAnalyseForm;