// ===========================================
// HOOK: useSocket
// RÔLE: Utiliser le contexte socket
// ===========================================

import { useContext } from 'react';
import { SocketContext } from '../context/SocketContext';

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};