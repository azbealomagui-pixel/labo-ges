// ===========================================
// PROVIDER: SocketProvider
// RÔLE: Fournir les données socket à l'application
// ===========================================

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import useAuth from '../hooks/useAuth';
import { SocketContext } from '../context/SocketContext';

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [nonLus, setNonLus] = useState(0);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    // Connexion au serveur Socket.IO
    if (!socketRef.current) {
      const newSocket = io(import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8080', {
        withCredentials: true
      });

      socketRef.current = newSocket;

      // Rejoindre l'espace
      newSocket.emit('join-espace', user.espaceId);

      // Écouter les nouveaux messages
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

      // Écouter les alertes d'abonnement
      newSocket.on('abonnement-expire', (data) => {
        setNotifications(prev => [{
          type: 'warning',
          message: data.message,
          date: new Date()
        }, ...prev]);
      });
    }

    // Nettoyage à la déconnexion
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

  const value = {
    notifications,
    nonLus,
    marquerCommeLu,
    toutMarquerLu
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};