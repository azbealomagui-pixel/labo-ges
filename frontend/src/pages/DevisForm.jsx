// ===========================================
// PAGE: DevisForm
// RÔLE: Création/Modification d'un devis
// VERSION: Finale sans erreur ESLint
// ===========================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import useAuth from '../hooks/useAuth';
import { IconAdd, IconDelete, IconSearch } from '../assets';
import { genererPDFDevis, ouvrirPDF } from '../utils/pdfGenerator';

const CURRENCIES = [
  { code: 'EUR', symbole: '€', nom: 'Euro' },
  { code: 'USD', symbole: '$', nom: 'Dollar américain' },
  { code: 'GNF', symbole: 'FG', nom: 'Franc guinéen' },
  { code: 'XOF', symbole: 'CFA', nom: 'Franc CFA' },
];

const DevisForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, espace: espaceFromAuth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedAnalyses, setSelectedAnalyses] = useState([]);
  const [searchPatient, setSearchPatient] = useState('');
  const [searchAnalyse, setSearchAnalyse] = useState('');
  const [remise, setRemise] = useState(0);
  const [selectedDevise, setSelectedDevise] = useState('EUR');
  const [errors, setErrors] = useState({});
  const [devis, setDevis] = useState(null);

  // ===== VARIABLE POUR L'ESPACE ID =====
  const espaceId = user?.laboratoireId || user?.espaceId;

  // ===== CHARGEMENT DU DEVIS EN MODE ÉDITION =====
  useEffect(() => {
    if (id) {
      const loadDevis = async () => {
        try {
          setLoading(true);
          const response = await api.get(`/devis/${id}`);
          const devisData = response.data.devis;
          
          setDevis(devisData);
          setSelectedPatient(devisData.patientId);
          
          const analysesChargees = devisData.lignes.map(ligne => ({
            _id: ligne.analyseId?._id || ligne.analyseId,
            code: ligne.code,
            nom: ligne.nom,
            categorie: ligne.categorie,
            prix: { valeur: ligne.prixUnitaire },
            quantite: ligne.quantite
          }));
          setSelectedAnalyses(analysesChargees);
          
          setRemise(devisData.remiseGlobale || 0);
          setSelectedDevise(devisData.devise || 'EUR');
          
          toast.success('Devis chargé avec succès');
        } catch (err) {
          console.error('Erreur chargement devis:', err);
          toast.error('Impossible de charger le devis');
          navigate('/devis');
        } finally {
          setLoading(false);
        }
      };
      loadDevis();
    }
  }, [id, navigate]);

  // ===== CHARGEMENT DES PATIENTS =====
  useEffect(() => {
    const fetchPatients = async () => {
      if (!espaceId) return;
      
      try {
        const response = await api.get(`/patients/labo/${espaceId}`);
        setPatients(response.data.patients || []);
      } catch (err) {
        console.error('Erreur chargement clients:', err);
        toast.error('Erreur chargement clients');
      }
    };
    fetchPatients();
  }, [espaceId]);

  // ===== CHARGEMENT DES ANALYSES =====
  useEffect(() => {
    const fetchAnalyses = async () => {
      if (!espaceId) return;
      
      try {
        const response = await api.get(`/analyses/labo/${espaceId}`);
        setAnalyses(response.data.analyses || []);
      } catch (err) {
        console.error('Erreur chargement analyses:', err);
        toast.error('Erreur chargement analyses');
      }
    };
    fetchAnalyses();
  }, [espaceId]);

  // ===== VALIDATION =====
  const validateForm = () => {
    const newErrors = {};
    if (!selectedPatient) newErrors.patient = 'Veuillez sélectionner un client';
    if (selectedAnalyses.length === 0) newErrors.analyses = 'Veuillez ajouter au moins une analyse';
    if (remise < 0 || remise > 100) newErrors.remise = 'La remise doit être entre 0 et 100%';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ===== AJOUTER UNE ANALYSE =====
  const addAnalyse = (analyse) => {
    const exists = selectedAnalyses.find(a => a._id === analyse._id);
    if (exists) {
      setSelectedAnalyses(selectedAnalyses.map(a =>
        a._id === analyse._id ? { ...a, quantite: a.quantite + 1 } : a
      ));
    } else {
      setSelectedAnalyses([...selectedAnalyses, { 
        ...analyse, 
        quantite: 1
      }]);
    }
  };

  // ===== RETIRER UNE ANALYSE =====
  const removeAnalyse = (id) => {
    setSelectedAnalyses(selectedAnalyses.filter(a => a._id !== id));
  };

  // ===== METTRE À JOUR LA QUANTITÉ =====
  const updateQuantite = (id, quantite) => {
    const newQuantite = parseInt(quantite) || 1;
    if (newQuantite < 1) return;
    setSelectedAnalyses(selectedAnalyses.map(a =>
      a._id === id ? { ...a, quantite: newQuantite } : a
    ));
  };

  // ===== CALCULER LE TOTAL =====
  const calculTotal = () => {
    const sousTotal = selectedAnalyses.reduce(
      (sum, a) => sum + (a.prix?.valeur || 0) * a.quantite,
      0
    );
    const total = sousTotal * (1 - remise / 100);
    return total.toFixed(2);
  };

  // ===== GÉNÉRER LE PDF =====
  const handleGenererPDF = async () => {
    if (selectedAnalyses.length === 0) {
      toast.error('Ajoutez au moins une analyse pour générer un PDF');
      return;
    }

    try {
      const devisData = id ? devis : {
        numero: 'APERÇU',
        patientId: selectedPatient,
        lignes: selectedAnalyses,
        total: { valeur: parseFloat(calculTotal()) },
        devise: selectedDevise
      };
      
      const doc = await genererPDFDevis(devisData, espaceFromAuth, user);
      if (doc) ouvrirPDF(doc);
    } catch (error) {
      console.error('Erreur PDF:', error);
      toast.error('Erreur génération PDF');
    }
  };

  // ===== SOUMISSION =====
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (!espaceId) {
      toast.error('Configuration espace invalide');
      return;
    }

    setLoading(true);

    try {
      const devisData = {
        patientId: selectedPatient._id,
        espaceId: espaceId,
        laboratoireId: espaceId,
        createdBy: user._id,
        devise: selectedDevise,
        lignes: selectedAnalyses.map(a => ({
          analyseId: a._id,
          code: a.code,
          nom: a.nom?.fr || a.nom,
          categorie: a.categorie,
          quantite: a.quantite,
          prixUnitaire: a.prix?.valeur || 0
        })),
        remiseGlobale: remise,
        notes: `Devis ${id ? 'modifié' : 'créé'} par ${user.prenom} ${user.nom}`
      };

      console.log('Données envoyées:', devisData);

      if (id) {
        const response = await api.put(`/devis/${id}`, devisData);
        setDevis(response.data.devis);
        toast.success('Devis modifié avec succès');
      } else {
        const response = await api.post('/devis', devisData);
        setDevis(response.data.devis);
        toast.success('Devis créé avec succès');
      }
      
      navigate('/devis');
    } catch (err) {
      console.error('Erreur:', err);
      toast.error(err.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  // ===== RECHERCHE FILTRÉE =====
  const filteredPatients = patients.filter(p => 
    p.nom.toLowerCase().includes(searchPatient.toLowerCase()) ||
    p.prenom.toLowerCase().includes(searchPatient.toLowerCase())
  );

  const filteredAnalyses = analyses.filter(a => 
    a.code.toLowerCase().includes(searchAnalyse.toLowerCase()) ||
    a.nom?.fr?.toLowerCase().includes(searchAnalyse.toLowerCase())
  );

  if (loading && id) {
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
            <button onClick={() => navigate('/devis')} className="text-gray-600 hover:text-gray-900">
              ← Retour liste
            </button>
            <span>|</span>
            <button onClick={() => navigate('/dashboard')} className="text-gray-600 hover:text-gray-900">
              Dashboard
            </button>
          </div>

          <h1 className="text-2xl font-bold mb-6">
            {id ? 'Modifier le devis' : 'Nouveau devis'}
          </h1>

          {/* Messages d'erreur */}
          {Object.keys(errors).length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 font-medium">
                Veuillez corriger les erreurs suivantes :
              </p>
              <ul className="mt-2 list-disc list-inside text-sm text-red-600">
                {Object.values(errors).map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Colonne patient */}
            <div>
              <h2 className="text-lg font-semibold mb-4">1. Client</h2>
              
              <div className="relative mb-4">
                <input
                  type="text"
                  placeholder="Rechercher un client..."
                  value={searchPatient}
                  onChange={(e) => setSearchPatient(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg"
                />
                <img src={IconSearch} alt="" className="w-5 h-5 absolute left-3 top-2.5" />
              </div>

              <div className="border rounded-lg max-h-60 overflow-y-auto">
                {filteredPatients.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    Aucun client trouvé
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
                <div className="mt-4 p-3 bg-green-50 rounded-lg">
                  <div className="font-medium">{selectedPatient.nom} {selectedPatient.prenom}</div>
                  <div className="text-sm text-gray-600">{selectedPatient.telephone}</div>
                </div>
              )}
            </div>

            {/* Colonne analyses */}
            <div>
              <h2 className="text-lg font-semibold mb-4">2. Analyses</h2>
              
              <div className="relative mb-4">
                <input
                  type="text"
                  placeholder="Rechercher une analyse..."
                  value={searchAnalyse}
                  onChange={(e) => setSearchAnalyse(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg"
                />
                <img src={IconSearch} alt="" className="w-5 h-5 absolute left-3 top-2.5" />
              </div>

              <div className="border rounded-lg max-h-60 overflow-y-auto mb-4">
                {filteredAnalyses.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    Aucune analyse trouvée
                  </div>
                ) : (
                  filteredAnalyses.map(a => (
                    <div
                      key={a._id}
                      onClick={() => addAnalyse(a)}
                      className="p-3 cursor-pointer hover:bg-gray-50 border-b flex justify-between items-center"
                    >
                      <div>
                        <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded mr-2">{a.code}</span>
                        {a.nom?.fr || a.nom}
                      </div>
                      <div className="text-primary-600 font-medium">
                        {a.prix?.valeur || 0} {a.prix?.devise || selectedDevise}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Panier */}
              {selectedAnalyses.length > 0 && (
                <div className="border rounded-lg p-4">
                  {selectedAnalyses.map(a => (
                    <div key={a._id} className="flex items-center justify-between py-2 border-b">
                      <div className="flex-1">
                        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded mr-2">{a.code}</span>
                        {a.nom?.fr || a.nom}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          value={a.quantite}
                          onChange={(e) => updateQuantite(a._id, e.target.value)}
                          className="w-16 px-2 py-1 border rounded text-center"
                        />
                        <span className="w-20 text-right font-medium">
                          {(a.prix?.valeur * a.quantite).toFixed(2)} {selectedDevise}
                        </span>
                        <button onClick={() => removeAnalyse(a._id)} className="p-1 text-red-600">
                          <img src={IconDelete} alt="" className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Remise */}
                  <div className="mt-4 flex items-center justify-end gap-4">
                    <label className="text-sm">Remise (%)</label>
                    <input
                      type="number"
                      value={remise}
                      onChange={(e) => setRemise(parseFloat(e.target.value) || 0)}
                      className="w-20 px-2 py-1 border rounded text-right"
                    />
                  </div>

                  {/* Total */}
                  <div className="mt-4 pt-4 border-t flex justify-between items-center text-lg font-bold">
                    <span>TOTAL</span>
                    <span className="text-primary-600">{calculTotal()} {selectedDevise}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Devise */}
          <div className="mt-6 pt-4 border-t">
            <label className="block text-sm font-medium mb-2">Devise</label>
            <select
              value={selectedDevise}
              onChange={(e) => setSelectedDevise(e.target.value)}
              className="w-full md:w-64 px-4 py-2 border rounded-lg"
            >
              {CURRENCIES.map(d => (
                <option key={d.code} value={d.code}>{d.nom} ({d.symbole})</option>
              ))}
            </select>
          </div>

          {/* Boutons */}
          <div className="mt-8 space-y-4">
            <div className="flex gap-4">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? 'Enregistrement...' : (id ? 'Modifier' : 'Créer')}
              </button>
              <button
                onClick={() => navigate('/devis')}
                className="flex-1 bg-gray-200 px-6 py-3 rounded-lg hover:bg-gray-300"
              >
                Annuler
              </button>
            </div>
            
            {/* Bouton Aperçu PDF */}
            <button
              type="button"
              onClick={handleGenererPDF}
              disabled={selectedAnalyses.length === 0}
              className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Aperçu PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DevisForm;