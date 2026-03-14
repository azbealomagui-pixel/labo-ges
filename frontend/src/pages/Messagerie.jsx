// ===========================================
// PAGE: Messagerie
// RÔLE: Communication interne entre membres
// VERSION: Sans warning ESLint
// ===========================================

import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import useAuth from '../hooks/useAuth';
import { IconAdd, IconSend, IconArchive, IconDelete } from '../assets';

const Messagerie = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [membres, setMembres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
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

  // ===== ENVOYER UN MESSAGE =====
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.sujet || !formData.contenu) {
      toast.error('Sujet et contenu requis');
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
      toast.error('Erreur envoi message');
    }
  };

  // ===== MARQUER COMME LU =====
  const handleLire = async (messageId) => {
    try {
      await api.patch(`/messages/${messageId}/lire/${user._id}`);
      fetchMessages();
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
    } catch (error) {
      console.error('❌ Erreur archivage:', error);
      toast.error('Erreur archivage');
    }
  };

  // ===== SUPPRIMER =====
  const handleDelete = async (messageId) => {
    if (!window.confirm('Supprimer ce message ?')) return;
    try {
      await api.delete(`/messages/${messageId}`);
      toast.success('Message supprimé');
      fetchMessages();
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
        
        {/* En-tête */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Messagerie</h1>
            <p className="text-gray-600 mt-1">
              {messages.filter(m => !m.estLu && m.expediteur?._id !== user._id).length} non lu(s)
            </p>
          </div>
          
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
          >
            <img src={IconAdd} alt="" className="w-5 h-5" />
            Nouveau message
          </button>
        </div>

        {/* Formulaire */}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg h-32"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Message</label>
                <textarea
                  value={formData.contenu}
                  onChange={(e) => setFormData({ ...formData, contenu: e.target.value })}
                  rows="4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              <div className="flex gap-4">
                <button type="submit" className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2">
                  <img src={IconSend} alt="" className="w-4 h-4" />
                  Envoyer
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="bg-gray-200 px-6 py-2 rounded-lg hover:bg-gray-300">
                  Annuler
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Liste des messages */}
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="bg-white rounded-lg shadow-lg p-12 text-center text-gray-500">
              Aucun message
            </div>
          ) : (
            messages.map(msg => (
              <div
                key={msg._id}
                className={`bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all cursor-pointer ${
                  !msg.estLu && msg.expediteur?._id !== user._id ? 'border-l-4 border-primary-600' : ''
                }`}
                onClick={() => !msg.estLu && handleLire(msg._id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-semibold text-gray-900">{msg.sujet}</span>
                      {msg.important && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">Important</span>
                      )}
                      {!msg.estLu && msg.expediteur?._id !== user._id && (
                        <span className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full text-xs">Nouveau</span>
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
                      <div className="mt-3 flex gap-2">
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
                    {!msg.archive && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArchiver(msg._id);
                        }}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                        title="Archiver"
                      >
                        <img src={IconArchive} alt="" className="w-5 h-5" />
                      </button>
                    )}
                    {msg.expediteur?._id === user._id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(msg._id);
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="Supprimer"
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