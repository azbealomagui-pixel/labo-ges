// ===========================================
// PAGE: Messagerie
// RÔLE: Communication interne entre membres
// VERSION: Avec onglets, désarchivage, badge non lus et navigation
// MODIFICATION: Ajout boutons de navigation vers Dashboard et autres pages
// ===========================================

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import useAuth from '../hooks/useAuth';
import { useSocket } from '../context/SocketContext';
import { IconAdd, IconSend, IconArchive, IconDelete } from '../assets';

const Messagerie = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { rafraichirNonLus } = useSocket();
  const [messages, setMessages] = useState([]);
  const [membres, setMembres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [afficherArchives, setAfficherArchives] = useState(false);
  const [formData, setFormData] = useState({
    destinataires: [],
    sujet: '',
    contenu: ''
  });

  // ===== CHARGER LES MESSAGES =====
  const fetchMessages = useCallback(async () => {
    try {
      const response = await api.get(`/messages/utilisateur/${user._id}`);
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error('❌ Erreur chargement messages:', error);
      toast.error('Erreur chargement messages');
    }
  }, [user._id]);

  const fetchMembres = useCallback(async () => {
    try {
      const response = await api.get(`/espaces/${user.espaceId}/membres`);
      setMembres(response.data.membres || []);
    } catch (error) {
      console.error('❌ Erreur chargement membres:', error);
    }
  }, [user.espaceId]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchMessages(), fetchMembres()]);
      setLoading(false);
    };
    loadData();
  }, [fetchMessages, fetchMembres]);

  // ===== FILTRAGE DES MESSAGES =====
  const messagesFiltres = messages.filter(msg => 
    afficherArchives ? msg.archive : !msg.archive
  );

  // ===== COMPTEUR NON LUS =====
  const nonLusCount = messages.filter(m => 
    !m.estLu && m.expediteur?._id !== user._id && !m.archive
  ).length;

  // ===== ENVOYER UN MESSAGE =====
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.sujet || !formData.contenu) {
      toast.error('Sujet et contenu requis');
      return;
    }

    if (formData.destinataires.length === 0) {
      toast.error('Au moins un destinataire requis');
      return;
    }

    try {
      const response = await api.post('/messages', {
        espaceId: user.espaceId,
        expediteur: user._id,
        destinataires: formData.destinataires,
        sujet: formData.sujet,
        contenu: formData.contenu
      });

      if (response.data.success) {
        toast.success('✅ Message envoyé');
        setShowForm(false);
        setFormData({ destinataires: [], sujet: '', contenu: '' });
        fetchMessages();
      }
    } catch (error) {
      console.error('❌ Erreur envoi:', error);
      toast.error(error.response?.data?.message || 'Erreur envoi message');
    }
  };

  // ===== MARQUER COMME LU =====
  const handleLire = async (messageId) => {
    try {
      await api.patch(`/messages/${messageId}/lire/${user._id}`);
      fetchMessages();
      rafraichirNonLus();
    } catch (error) {
      console.error('❌ Erreur marquage lu:', error);
    }
  };

  // ===== ARCHIVER =====
  const handleArchiver = async (messageId) => {
    try {
      await api.patch(`/messages/${messageId}/archiver`);
      toast.success('Message archivé');
      fetchMessages();
      rafraichirNonLus();
    } catch (error) {
      console.error('❌ Erreur archivage:', error);
      toast.error('Erreur archivage');
    }
  };

  // ===== DÉSARCHIVER =====
  const handleDesarchiver = async (messageId) => {
    try {
      await api.patch(`/messages/${messageId}/desarchiver`);
      toast.success('Message désarchivé');
      fetchMessages();
      rafraichirNonLus();
    } catch (error) {
      console.error('❌ Erreur désarchivage:', error);
      toast.error('Erreur désarchivage');
    }
  };

  // ===== SUPPRIMER =====
  const handleDelete = async (messageId) => {
    if (!window.confirm('Supprimer ce message définitivement ? Cette action est irréversible.')) return;
    try {
      await api.delete(`/messages/${messageId}`);
      toast.success('Message supprimé');
      fetchMessages();
      rafraichirNonLus();
    } catch (error) {
      console.error('❌ Erreur suppression:', error);
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
        
        {/* ===== BOUTONS DE NAVIGATION ===== */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 bg-white px-4 py-2 rounded-lg shadow-sm hover:shadow transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Retour au tableau de bord
          </button>
          
          <button
            onClick={() => navigate('/parametres')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 bg-white px-4 py-2 rounded-lg shadow-sm hover:shadow transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Paramètres
          </button>
          
          <button
            onClick={() => navigate('/membres')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 bg-white px-4 py-2 rounded-lg shadow-sm hover:shadow transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            Membres
          </button>
        </div>

        {/* En-tête */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Messagerie</h1>
            <p className="text-gray-600 mt-1">
              {nonLusCount} non lu(s)
            </p>
          </div>
          
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            <img src={IconAdd} alt="" className="w-5 h-5" />
            Nouveau message
          </button>
        </div>

        {/* ===== NAVIGATION PAR ONGLETS ===== */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setAfficherArchives(false)}
            className={`px-6 py-3 text-sm font-medium transition-all ${
              !afficherArchives 
                ? 'text-primary-600 border-b-2 border-primary-600 bg-white rounded-t-lg' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-t-lg'
            }`}
          >
            📬 Boîte de réception
            {nonLusCount > 0 && !afficherArchives && (
              <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                {nonLusCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setAfficherArchives(true)}
            className={`px-6 py-3 text-sm font-medium transition-all ${
              afficherArchives 
                ? 'text-primary-600 border-b-2 border-primary-600 bg-white rounded-t-lg' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-t-lg'
            }`}
          >
            📦 Archives
            {messages.filter(m => m.archive).length > 0 && afficherArchives && (
              <span className="ml-2 bg-gray-400 text-white text-xs rounded-full px-2 py-0.5">
                {messages.filter(m => m.archive).length}
              </span>
            )}
          </button>
        </div>

        {/* Formulaire nouveau message */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4">Nouveau message</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div>
                <label className="block text-sm font-medium mb-1">Destinataires</label>
                <select
                  multiple
                  value={formData.destinataires}
                  onChange={(e) => setFormData({
                    ...formData,
                    destinataires: Array.from(e.target.selectedOptions, opt => opt.value)
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg h-32 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {membres
                    .filter(m => m._id !== user._id)
                    .map(m => (
                      <option key={m._id} value={m._id}>
                        {m.nom} {m.prenom} ({m.role})
                      </option>
                    ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Ctrl+clic pour sélection multiple</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Sujet</label>
                <input
                  type="text"
                  value={formData.sujet}
                  onChange={(e) => setFormData({ ...formData, sujet: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                  maxLength={200}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Message</label>
                <textarea
                  value={formData.contenu}
                  onChange={(e) => setFormData({ ...formData, contenu: e.target.value })}
                  rows="4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div className="flex gap-4">
                <button type="submit" className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2 transition-colors">
                  <img src={IconSend} alt="" className="w-4 h-4" />
                  Envoyer
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors">
                  Annuler
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Liste des messages */}
        <div className="space-y-4">
          {messagesFiltres.length === 0 ? (
            <div className="bg-white rounded-lg shadow-lg p-12 text-center text-gray-500">
              {afficherArchives ? '📦 Aucun message archivé' : '📬 Aucun message dans la boîte de réception'}
            </div>
          ) : (
            messagesFiltres.map(msg => (
              <div
                key={msg._id}
                className={`bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all cursor-pointer ${
                  !msg.estLu && msg.expediteur?._id !== user._id && !msg.archive ? 'border-l-4 border-primary-600 bg-blue-50/30' : ''
                }`}
                onClick={() => !msg.estLu && msg.expediteur?._id !== user._id && handleLire(msg._id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{msg.sujet}</span>
                      {msg.important && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">Important</span>
                      )}
                      {!msg.estLu && msg.expediteur?._id !== user._id && !msg.archive && (
                        <span className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full text-xs">Nouveau</span>
                      )}
                      {msg.archive && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">Archivé</span>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-3">
                      <span className="font-medium">De :</span> {msg.expediteur?.prenom} {msg.expediteur?.nom}
                      {' · '}
                      <span className="font-medium">À :</span>{' '}
                      {msg.destinataires?.map(d => `${d.prenom} ${d.nom}`).join(', ')}
                    </div>

                    <div className="text-gray-800 whitespace-pre-wrap">
                      {msg.contenu}
                    </div>

                    {msg.piecesJointes?.length > 0 && (
                      <div className="mt-3 flex gap-2 flex-wrap">
                        {msg.piecesJointes.map((f, idx) => (
                          <a
                            key={idx}
                            href={f.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200"
                          >
                            📎 {f.nom}
                          </a>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 text-xs text-gray-400">
                      {new Date(msg.dateEnvoi).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    {!msg.archive ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArchiver(msg._id);
                        }}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        title="Archiver"
                      >
                        <img src={IconArchive} alt="" className="w-5 h-5" />
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDesarchiver(msg._id);
                        }}
                        className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
                        title="Désarchiver"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                        </svg>
                      </button>
                    )}
                    {msg.expediteur?._id === user._id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(msg._id);
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Supprimer définitivement"
                      >
                        <img src={IconDelete} alt="" className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Messagerie;