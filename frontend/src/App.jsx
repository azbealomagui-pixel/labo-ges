// ===========================================
// FICHIER: src/App.jsx
// RÔLE: Configuration des routes principales
// VERSION: Finale avec toutes les routes
// ===========================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import PatientForm from './pages/PatientForm';
import Analyses from './pages/Analyses';
import AnalyseForm from './pages/AnalyseForm';
import Devis from './pages/Devis';
import DevisForm from './pages/DevisForm';
import FicheAnalyseForm from './pages/FicheAnalyseForm';
import CreerEspace from './pages/CreerEspace';
import Register from './pages/Register';
import GestionMembres from './pages/GestionMembres';
import RapportForm from './pages/RapportForm';
import Messagerie from './pages/Messagerie';
import Abonnement from './pages/Abonnement';
import InstallPWA from './components/InstallPWA';
import Parametres from './pages/Parametres';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import FichesAnalyses from './pages/FichesAnalyses';
import SuperAdminDashboard from './pages/SuperAdmin/Dashboard';


// Providers
import { SocketProvider } from './providers/SocketProvider';

/**
 * Composant pour les routes protégées
 * Redirige vers login si non authentifié
 */
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <SocketProvider>
        {/* Notifications toast */}
        <ToastContainer 
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
        />
        <InstallPWA />
        
        <Routes>
          {/* ===== ROUTES PUBLIQUES ===== */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* ===== REDIRECTION PAR DÉFAUT ===== */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* ===== ROUTES PROTÉGÉES ===== */}
          {/* Dashboard */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          {/* Patients */}
          <Route path="/patients" element={
            <ProtectedRoute>
              <Patients />
            </ProtectedRoute>
          } />
          <Route path="/patients/new" element={
            <ProtectedRoute>
              <PatientForm />
            </ProtectedRoute>
          } />
          <Route path="/patients/:id" element={
            <ProtectedRoute>
              <PatientForm />
            </ProtectedRoute>
          } />
          
          {/* Analyses */}
          <Route path="/analyses" element={
            <ProtectedRoute>
              <Analyses />
            </ProtectedRoute>
          } />
          <Route path="/analyses/new" element={
            <ProtectedRoute>
              <AnalyseForm />
            </ProtectedRoute>
          } />
          <Route path="/analyses/:id" element={
            <ProtectedRoute>
              <AnalyseForm />
            </ProtectedRoute>
          } />

          {/* Fiche d'analyses patient */}
          <Route path="/fiche-analyses/new" element={
            <ProtectedRoute>
              <FicheAnalyseForm />
            </ProtectedRoute>
          } />
          
          {/* Devis */}
          <Route path="/devis" element={
            <ProtectedRoute>
              <Devis />
            </ProtectedRoute>
          } />
          <Route path="/devis/:id" element={
            <ProtectedRoute>
              <DevisForm />
            </ProtectedRoute>
          } />
          <Route path="/devis/new" element={
            <ProtectedRoute>
              <DevisForm />
            </ProtectedRoute>
          } />

          {/* Espaces et membres */}
          <Route path="/creer-espace" element={
            <ProtectedRoute>
              <CreerEspace />
            </ProtectedRoute>
          } />
          <Route path="/membres" element={
            <ProtectedRoute>
              <GestionMembres />
            </ProtectedRoute>
          } />

          {/* Rapports */}
          <Route path="/rapport/:id" element={
            <ProtectedRoute>
              <RapportForm />
            </ProtectedRoute>
          } />

          {/* Messagerie */}
          <Route path="/messages" element={
            <ProtectedRoute>
              <Messagerie />
            </ProtectedRoute>
          } />

          {/* Abonnement */}
          <Route path="/abonnement" element={
            <ProtectedRoute>
              <Abonnement />
            </ProtectedRoute>
          } />

          <Route path="/parametres" element={
          <ProtectedRoute>
            <Parametres />
          </ProtectedRoute>
          } />
          
          {/* ===== ROUTE 404 ===== */}
          <Route path="*" element={
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                <p className="text-gray-600 mb-6">Page non trouvée</p>
                <a 
                  href="/dashboard" 
                  className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Retour au tableau de bord
                </a>
              </div>
            </div>
          } />


          // Dans les routes publiques
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />


          // ===== DANS LES ROUTES PROTÉGÉES =====
          <Route path="/fiches-analyses" element={
            <ProtectedRoute>
              <FichesAnalyses />
            </ProtectedRoute>
          } />

          // Ajouter dans les routes protégées
          <Route path="/super-admin" element={
            <ProtectedRoute>
              <SuperAdminDashboard />
            </ProtectedRoute>
          } />




        </Routes>

        {/* ===== FOOTER PROFESSIONNEL ===== */}
        <footer className="bg-white border-t border-gray-200 py-8 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              {/* Copyright */}
              <div className="text-sm text-gray-600">
                © {new Date().getFullYear()} <span className="font-semibold text-primary-600">LaboGes</span>. 
                Tous droits réservés.
              </div>
              
              {/* Liens légaux */}
              <div className="flex gap-8 text-sm">
                <a 
                  href="#" 
                  className="text-gray-500 hover:text-primary-600 transition-colors"
                  onClick={(e) => e.preventDefault()}
                >
                  Confidentialité
                </a>
                <a 
                  href="#" 
                  className="text-gray-500 hover:text-primary-600 transition-colors"
                  onClick={(e) => e.preventDefault()}
                >
                  CGU
                </a>
                <a 
                  href="#" 
                  className="text-gray-500 hover:text-primary-600 transition-colors"
                  onClick={(e) => e.preventDefault()}
                >
                  Contact
                </a>
              </div>
            </div>
            
            {/* Version */}
            <div className="text-center text-xs text-gray-400 mt-6">
              Application professionnelle de gestion de laboratoire médical v1.0.0
            </div>
          </div>
        </footer>
      </SocketProvider>
    </BrowserRouter>
  );
}

export default App;