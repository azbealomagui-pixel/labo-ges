import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const useAuth = () => {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      // Ajouter une devise par défaut si elle n'existe pas
      if (!parsedUser.devise) {
        parsedUser.devise = 'EUR';
      }
      return parsedUser;
    }
    return null;
  });
  
  const navigate = useNavigate();

  const login = async (email, password) => {
    try {
      const response = await api.post('/users/login', { email, password });
      if (response.data.success) {
        const userData = response.data.user;
        // Ajouter une devise par défaut
        if (!userData.devise) {
          userData.devise = 'EUR';
        }
        
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        navigate('/dashboard');
        return { success: true };
      }
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Erreur de connexion' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  return { user, login, logout };
};

export default useAuth;