import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { DialogProvider } from './contexts/DialogContext';
import { SuccessModalProvider } from './contexts/SuccessModalContext';
import { LoadingProvider } from './contexts/LoadingContext';
import ProtectedRoute from './components/ProtectedRoute';
import PublicLayout from './layouts/PublicLayout';
import ProviderLayout from './layouts/ProviderLayout';
import ClientLayout from './layouts/ClientLayout';
import Home from './pages/public/Home';
import Login from './pages/public/Login';
import Tracking from './pages/public/Tracking';
import QuoteRequest from './pages/public/QuoteRequest';
import AccountRequest from './pages/public/AccountRequest';
import ProviderDashboard from './pages/provider/Dashboard';
import Quotes from './pages/provider/Quotes';
import QuoteCreate from './pages/provider/QuoteCreate';
import QuoteDetail from './pages/provider/QuoteDetail';
import Shipments from './pages/provider/Shipments';
import ShipmentCreate from './pages/provider/ShipmentCreate';
import ShipmentDetail from './pages/provider/ShipmentDetail';
import Clients from './pages/provider/Clients';
import ClientCreate from './pages/provider/ClientCreate';
import ClientDetail from './pages/provider/ClientDetail';
import Settings from './pages/provider/Settings';
import AccountRequests from './pages/provider/AccountRequests';
import QuoteRequests from './pages/provider/QuoteRequests';
import Invoices from './pages/provider/Invoices';
import InvoiceCreate from './pages/provider/InvoiceCreate';
import InvoiceDetail from './pages/provider/InvoiceDetail';
import AvoirCreate from './pages/provider/AvoirCreate';
import Fleet from './pages/provider/Fleet';
import Vehicles from './pages/provider/Vehicles';
import VehicleForm from './pages/provider/VehicleForm';
import Drivers from './pages/provider/Drivers';
import DriverForm from './pages/provider/DriverForm';
import Assignments from './pages/provider/Assignments';
import AssignmentCreate from './pages/provider/AssignmentCreate';
import AssignmentDetail from './pages/provider/AssignmentDetail';
import ClientDashboard from './pages/client/ClientDashboard';
import MyShipments from './pages/client/MyShipments';
import MyInvoices from './pages/client/MyInvoices';
import MyAccount from './pages/client/MyAccount';

function App() {
  return (
    <ToastProvider>
      <SuccessModalProvider>
        <DialogProvider>
          <LoadingProvider>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route element={<PublicLayout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/suivi" element={<Tracking />} />
                  <Route path="/devis-express" element={<QuoteRequest />} />
                  <Route path="/demande-compte" element={<AccountRequest />} />
                </Route>

                <Route path="/login" element={<Login />} />

                <Route element={<ProtectedRoute role="prestataire" />}>
                  <Route element={<ProviderLayout />}>
                    <Route path="/dashboard" element={<ProviderDashboard />} />
                    <Route path="/dashboard/demandes-devis" element={<QuoteRequests />} />
                    <Route path="/dashboard/devis" element={<Quotes />} />
                    <Route path="/dashboard/devis/nouveau" element={<QuoteCreate />} />
                    <Route path="/dashboard/devis/:id" element={<QuoteDetail />} />
                    <Route path="/dashboard/expeditions" element={<Shipments />} />
                    <Route path="/dashboard/expeditions/nouveau" element={<ShipmentCreate />} />
                    <Route path="/dashboard/expeditions/:id" element={<ShipmentDetail />} />
                    <Route path="/dashboard/clients" element={<Clients />} />
                    <Route path="/dashboard/clients/nouveau" element={<ClientCreate />} />
                    <Route path="/dashboard/clients/:id" element={<ClientDetail />} />
                    <Route path="/dashboard/demandes-compte" element={<AccountRequests />} />
                    <Route path="/dashboard/factures" element={<Invoices />} />
                    <Route path="/dashboard/factures/nouveau" element={<InvoiceCreate />} />
                    <Route path="/dashboard/factures/:id" element={<InvoiceDetail />} />
                    <Route path="/dashboard/avoirs/nouveau" element={<AvoirCreate />} />
                    <Route path="/dashboard/flotte" element={<Fleet />} />
                    <Route path="/dashboard/flotte/vehicules" element={<Vehicles />} />
                    <Route path="/dashboard/flotte/vehicules/nouveau" element={<VehicleForm />} />
                    <Route path="/dashboard/flotte/vehicules/:id" element={<VehicleForm />} />
                    <Route path="/dashboard/flotte/chauffeurs" element={<Drivers />} />
                    <Route path="/dashboard/flotte/chauffeurs/nouveau" element={<DriverForm />} />
                    <Route path="/dashboard/flotte/chauffeurs/:id" element={<DriverForm />} />
                    <Route path="/dashboard/flotte/affectations" element={<Assignments />} />
                    <Route path="/dashboard/flotte/affectations/nouveau" element={<AssignmentCreate />} />
                    <Route path="/dashboard/flotte/affectations/:id" element={<AssignmentDetail />} />
                    <Route path="/dashboard/parametres" element={<Settings />} />
                  </Route>
                </Route>

                <Route element={<ProtectedRoute role="client" />}>
                  <Route element={<ClientLayout />}>
                    <Route path="/client" element={<ClientDashboard />} />
                    <Route path="/client/mes-expeditions" element={<MyShipments />} />
                    <Route path="/client/mes-factures" element={<MyInvoices />} />
                    <Route path="/client/mon-compte" element={<MyAccount />} />
                    <Route path="/client/*" element={<Navigate to="/client" replace />} />
                  </Route>
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
          </LoadingProvider>
    </DialogProvider>
    </SuccessModalProvider>
    </ToastProvider>
  );
}

export default App;
