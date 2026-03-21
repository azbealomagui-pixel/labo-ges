// ===========================================
// PROVIDER: SocketProvider
// RÔLE: Fournir les données socket à l'application
// EMPLACEMENT: frontend/src/providers/SocketProvider.jsx
// MODIFICATION: Ajout chargement initial des non lus et rafraichissement
// ===========================================

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import useAuth from '../hooks/useAuth';
import api from '../services/api';
import { SocketContext } from '../context/SocketContext';

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [nonLus, setNonLus] = useState(0);
  const socketRef = useRef(null);
  const initialLoadDone = useRef(false);

  // ===== CHARGER LES MESSAGES NON LUS INITIAUX =====
  const chargerNonLus = useCallback(async () => {
    if (!user?._id) return;
    
    try {
      const response = await api.get(`/messages/utilisateur/${user._id}`);
      const messages = response.data.messages || [];
      const nonLusCount = messages.filter(m => 
        !m.estLu && m.expediteur?._id !== user._id && !m.archive
      ).length;
      setNonLus(nonLusCount);
    } catch (error) {
      console.error('Erreur chargement non lus:', error);
    }
  }, [user]);

  // ===== CHARGEMENT INITIAL DES NON LUS =====
  useEffect(() => {
    if (user?._id && !initialLoadDone.current) {
      initialLoadDone.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      chargerNonLus();
    }
  }, [user, chargerNonLus]);

  // ===== CONNEXION SOCKET =====
  useEffect(() => {
    if (!user) return;

    if (socketRef.current) return;

    const newSocket = io(import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8080', {
      withCredentials: true
    });

    socketRef.current = newSocket;

    newSocket.emit('join-espace', user.espaceId);

    newSocket.on('nouveau-message', (data) => {
      setNotifications(prev => [data, ...prev]);
      setNonLus(prev => prev + 1);
      
      if (Notification.permission === 'granted') {
        new Notification('Nouveau message', {
          body: `De: ${data.expediteur?.prenom || ''} - ${data.sujet || ''}`,
          icon: '/logo.png'
        });
      }
    });

    newSocket.on('abonnement-expire', (data) => {
      setNotifications(prev => [{
        type: 'warning',
        message: data.message,
        date: new Date()
      }, ...prev]);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user]);

  const marquerCommeLu = useCallback((index) => {
    setNotifications(prev => prev.filter((_, i) => i !== index));
    setNonLus(prev => Math.max(0, prev - 1));
  }, []);

  const toutMarquerLu = useCallback(() => {
    setNotifications([]);
    setNonLus(0);
  }, []);

  const rafraichirNonLus = useCallback(async () => {
    await chargerNonLus();
  }, [chargerNonLus]);

  const value = {
    notifications,
    nonLus,
    marquerCommeLu,
    toutMarquerLu,
    rafraichirNonLus
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};