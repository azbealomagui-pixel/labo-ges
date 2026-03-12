// ===========================================
// PAGE: FicheAnalyseForm
// RÔLE: Création d'une fiche d'analyses pour un patient
// ===========================================
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import useAuth from '../hooks/useAuth';
import { IconSearch, IconAdd, IconDelete } from '../assets';

// Liste des devises
const CURRENCIES = [
  { code: 'EUR', symbole: '€', nom: 'Euro' },
  { code: 'USD', symbole: '$', nom: 'Dollar américain' },
  { code: 'GNF', symbole: 'FG', nom: 'Franc guinéen' },
  { code: 'XOF', symbole: 'CFA', nom: 'Franc CFA' },
  { code: 'GBP', symbole: '£', nom: 'Livre sterling' },
  { code: 'MAD', symbole: 'DH', nom: 'Dirham marocain' },
  { code: 'DZD', symbole: 'DA', nom: 'Dinar algérien' },
  { code: 'TND', symbole: 'DT', nom: 'Dinar tunisien' }
];

const FicheAnalyseForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedAnalyses, setSelectedAnalyses] = useState([]); // Liste en cours
  
  // État pour la saisie en cours
  const [currentCode, setCurrentCode] = useState('');
  const [currentAnalyse, setCurrentAnalyse] = useState(null);
  const [currentQuantite, setCurrentQuantite] = useState(1);
  
  const [searchPatient, setSearchPatient] = useState('');
  const [devise, setDevise] = useState('EUR');
  const [notes, setNotes] = useState('');

  // Charger les patients
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await api.get(`/patients/labo/${user.laboratoireId}`);
        setPatients(response.data.patients || []);
      } catch (err) {
        console.error('Erreur chargement patients:', err);
        toast.error('Erreur chargement patients');
      }
    };
    fetchPatients();
  }, [user.laboratoireId]);

  // Charger le catalogue d'analyses
  useEffect(() => {
    const fetchAnalyses = async () => {
      try {
        const response = await api.get(`/analyses/labo/${user.laboratoireId}`);
        setAnalyses(response.data.analyses || []);
      } catch (err) {
        console.error('Erreur chargement analyses:', err);
        toast.error('Erreur chargement catalogue');
      }
    };
    fetchAnalyses();
  }, [user.laboratoireId]);

  // Rechercher une analyse par code
  const handleCodeSearch = (code) => {
    if (!code.trim()) {
      setCurrentAnalyse(null);
      return;
    }

    const analyse = analyses.find(a => 
      a.code.toLowerCase() === code.toLowerCase()
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
      toast.info('Aucune analyse trouvée avec ce code');
    }
  };

  // Ajouter l'analyse courante à la liste
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
    
    // Réinitialiser le formulaire de saisie
    setCurrentCode('');
    setCurrentAnalyse(null);
    setCurrentQuantite(1);
    
    toast.success('Analyse ajoutée à la liste');
  };

  // Supprimer une analyse de la liste
  const removeAnalyse = (index) => {
    setSelectedAnalyses(selectedAnalyses.filter((_, i) => i !== index));
  };

  // Calculer le total général
  const calculerTotalGeneral = () => {
    return selectedAnalyses.reduce((sum, a) => sum + a.prixTotal, 0);
  };

  // Soumettre la fiche
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

    setLoading(true);

    try {
      const ficheData = {
        patientId: selectedPatient._id,
        laboratoireId: user.laboratoireId,
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

      console.log('📤 Données envoyées:', JSON.stringify(ficheData, null, 2));

      const response = await api.post('/fiches-analyses', ficheData);
      
      if (response.data.success) {
        toast.success('Fiche d\'analyse créée avec succès');
        navigate('/patients');
      }
    } catch (err) {
      console.error('❌ Erreur création:', err);
      toast.error(err.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg p-8">
          
          {/* Navigation */}
          <div className="mb-6 flex items-center gap-4 border-b pb-4">
            <button 
              onClick={() => navigate('/patients')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Retour patients
            </button>
            <span>|</span>
            <button 
              onClick={() => navigate('/dashboard')}
              className="text-gray-600 hover:text-gray-900"
            >
              🏠 Dashboard
            </button>
          </div>

          <h1 className="text-2xl font-bold mb-6">Nouvelle fiche d'analyses</h1>

          <form onSubmit={handleSubmit}>
            {/* Sélection patient */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4">1. Patient</h2>
              <div className="relative mb-4">
                <input
                  type="text"
                  placeholder="Rechercher un patient..."
                  value={searchPatient}
                  onChange={(e) => setSearchPatient(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg"
                />
                <img src={IconSearch} alt="" className="w-5 h-5 absolute left-3 top-2.5" />
              </div>

              <div className="border rounded-lg max-h-40 overflow-y-auto">
                {patients
                  .filter(p => 
                    p.nom.toLowerCase().includes(searchPatient.toLowerCase()) ||
                    p.prenom.toLowerCase().includes(searchPatient.toLowerCase())
                  )
                  .map(p => (
                    <div
                      key={p._id}
                      onClick={() => setSelectedPatient(p)}
                      className={`p-3 cursor-pointer hover:bg-gray-50 border-b ${
                        selectedPatient?._id === p._id ? 'bg-primary-50 border-l-4 border-l-primary-600' : ''
                      }`}
                    >
                      {p.nom} {p.prenom} - {p.telephone}
                    </div>
                  ))}
              </div>

              {selectedPatient && (
                <div className="mt-4 p-3 bg-green-50 rounded-lg">
                  Patient sélectionné : {selectedPatient.nom} {selectedPatient.prenom}
                </div>
              )}
            </div>

            {/* Saisie d'une analyse */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4">2. Ajouter une analyse</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Code analyse</label>
                  <input
                    type="text"
                    value={currentCode}
                    onChange={(e) => setCurrentCode(e.target.value)}
                    onBlur={() => handleCodeSearch(currentCode)}
                    className="w-full px-4 py-2 border rounded-lg"
                    placeholder="Ex: GLY002"
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
                      Ajouter à la liste
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Liste des analyses sélectionnées */}
            {selectedAnalyses.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4">3. Analyses sélectionnées</h2>
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left">Code</th>
                        <th className="px-4 py-2 text-left">Analyse</th>
                        <th className="px-4 py-2 text-left">Catégorie</th>
                        <th className="px-4 py-2 text-right">Prix unitaire</th>
                        <th className="px-4 py-2 text-center">Quantité</th>
                        <th className="px-4 py-2 text-right">Total</th>
                        <th className="px-4 py-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedAnalyses.map((a, index) => (
                        <tr key={index} className="border-t">
                          <td className="px-4 py-2 font-mono text-sm">{a.code}</td>
                          <td className="px-4 py-2">{a.nom}</td>
                          <td className="px-4 py-2">{a.categorie}</td>
                          <td className="px-4 py-2 text-right">{a.prixUnitaire} {a.devise}</td>
                          <td className="px-4 py-2 text-center">{a.quantite}</td>
                          <td className="px-4 py-2 text-right font-medium">{a.prixTotal} {a.devise}</td>
                          <td className="px-4 py-2 text-center">
                            <button
                              onClick={() => removeAnalyse(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <img src={IconDelete} alt="Supprimer" className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan="5" className="px-4 py-3 text-right font-bold">
                          TOTAL GÉNÉRAL
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-primary-600">
                          {calculerTotalGeneral()} {devise}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Devise et notes */}
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

            {/* Boutons */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading || !selectedPatient || selectedAnalyses.length === 0}
                className="flex-1 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? 'Création...' : 'Créer la fiche d\'analyses'}
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
        </div>
      </div>
    </div>
  );
};

export default FicheAnalyseForm;