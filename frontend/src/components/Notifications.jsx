// ===========================================
// COMPOSANT: Notifications
// RÔLE: Afficher les notifications en temps réel
// ===========================================

import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { IconCheck, IconDelete } from '../assets';

const Notifications = () => {
  const { notifications, nonLus, marquerCommeLu, toutMarquerLu } = useSocket();
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <div className="relative">
      {/* Bouton cloche */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {nonLus > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {nonLus}
          </span>
        )}
      </button>

      {/* Dropdown des notifications */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            {notifications.length > 0 && (
              <button
                onClick={toutMarquerLu}
                className="text-xs text-primary-600 hover:text-primary-700"
              >
                Tout marquer comme lu
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Aucune notification
              </div>
            ) : (
              notifications.map((notif, index) => (
                <div
                  key={index}
                  className="p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-sm text-gray-800">{notif.message || notif.sujet}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(notif.date).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => marquerCommeLu(index)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <img src={IconCheck} alt="Marquer lu" className="w-4 h-4" />
                    </button>
                  </div>
                  {notif.expediteur && (
                    <p className="text-xs text-gray-400 mt-1">
                      De: {notif.expediteur.prenom} {notif.expediteur.nom}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;