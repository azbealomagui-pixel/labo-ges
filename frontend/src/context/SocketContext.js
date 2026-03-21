// ===========================================
// CONTEXT: SocketContext
// RÔLE: Fournir le contexte socket à l'application
// ===========================================

import React, { createContext, useContext } from 'react';

export const SocketContext = createContext({
  notifications: [],
  nonLus: 0,
  marquerCommeLu: () => {},
  toutMarquerLu: () => {},
  rafraichirNonLus: () => {}
});

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};