// ===========================================
// PAGE: Login
// RÔLE: Page de connexion avec lien d'inscription
// ===========================================

import React, { useState } from 'react';
import { Link } from 'react-router-dom';  // ← Correction : plus de useNavigate
import { toast } from 'react-toastify';
import useAuth from '../hooks/useAuth';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { LogoLab, BgLogin } from '../assets';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(formData.email, formData.password);
    if (!result.success) toast.error(result.error);
  };

  return (
    <div 
      className="min-h-screen bg-cover bg-center flex items-center justify-center p-4"
      style={{ backgroundImage: `url(${BgLogin})` }}
    >
      <div className="max-w-md w-full bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <img src={LogoLab} alt="LaboGest" className="h-20 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900">LaboGest</h1>
          <p className="text-sm text-gray-600 mt-2">
            Gestion de laboratoire médical
          </p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <Input
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
          
          <div className="relative">
            <Input
              label="Mot de passe"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>

          <Button type="submit" variant="primary" className="w-full mt-4">
            Se connecter
          </Button>

          {/* Lien d'inscription */}
          <p className="text-center text-sm text-gray-600 mt-6">
            Vous n'avez pas de compte ?{' '}
            <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium hover:underline">
              Créer un compte
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;