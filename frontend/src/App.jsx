import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { DialogProvider } from './contexts/DialogContext';
import { SuccessModalProvider } from './contexts/SuccessModalContext';
import { LoadingProvider } from './contexts/LoadingContext';
import ProtectedRoute from './components/ProtectedRoute';
import SessionExpiredModal from './components/SessionExpiredModal';
import LoadingOverlay from './components/ui/LoadingOverlay';
import DownloadOverlay from './components/ui/DownloadOverlay';
import PublicLayout from './layouts/PublicLayout';

// Public pages stay eager so the landing surface paints instantly.
import Home from './pages/public/Home';
import Login from './pages/public/Login';
import Tracking from './pages/public/Tracking';
import QuoteRequest from './pages/public/QuoteRequest';
import AccountRequest from './pages/public/AccountRequest';
import CompleteExpedition from './pages/public/CompleteExpedition';
import QuiSommesNous from './pages/public/QuiSommesNous';
import Contact from './pages/public/Contact';

// Authenticated surfaces are code-split: a public visitor never downloads the
// provider/client/employe dashboards.
const ProviderLayout = lazy(() => import('./layouts/ProviderLayout'));
const ClientLayout = lazy(() => import('./layouts/ClientLayout'));
const EmployeLayout = lazy(() => import('./layouts/EmployeLayout'));
const ProviderDashboard = lazy(() => import('./pages/provider/Dashboard'));
const Quotes = lazy(() => import('./pages/provider/Quotes'));
const QuoteCreate = lazy(() => import('./pages/provider/QuoteCreate'));
const QuoteDetail = lazy(() => import('./pages/provider/QuoteDetail'));
const Shipments = lazy(() => import('./pages/provider/Shipments'));
const ShipmentCreate = lazy(() => import('./pages/provider/ShipmentCreate'));
const ShipmentDetail = lazy(() => import('./pages/provider/ShipmentDetail'));
const Clients = lazy(() => import('./pages/provider/Clients'));
const ClientCreate = lazy(() => import('./pages/provider/ClientCreate'));
const ClientDetail = lazy(() => import('./pages/provider/ClientDetail'));
const ClientActivity = lazy(() => import('./pages/provider/ClientActivity'));
const Settings = lazy(() => import('./pages/provider/Settings'));
const AccountRequests = lazy(() => import('./pages/provider/AccountRequests'));
const QuoteRequests = lazy(() => import('./pages/provider/QuoteRequests'));
const Invoices = lazy(() => import('./pages/provider/Invoices'));
const InvoiceCreate = lazy(() => import('./pages/provider/InvoiceCreate'));
const InvoiceDetail = lazy(() => import('./pages/provider/InvoiceDetail'));
const AvoirCreate = lazy(() => import('./pages/provider/AvoirCreate'));
const AvoirDetail = lazy(() => import('./pages/provider/AvoirDetail'));
const Fleet = lazy(() => import('./pages/provider/Fleet'));
const Vehicles = lazy(() => import('./pages/provider/Vehicles'));
const VehicleForm = lazy(() => import('./pages/provider/VehicleForm'));
const Drivers = lazy(() => import('./pages/provider/Drivers'));
const DriverForm = lazy(() => import('./pages/provider/DriverForm'));
const Assignments = lazy(() => import('./pages/provider/Assignments'));
const AssignmentCreate = lazy(() => import('./pages/provider/AssignmentCreate'));
const AssignmentDetail = lazy(() => import('./pages/provider/AssignmentDetail'));
const ExpeditionRequests = lazy(() => import('./pages/provider/ExpeditionRequests'));
const ExpeditionRequestDetail = lazy(() => import('./pages/provider/ExpeditionRequestDetail'));
const ClientDashboard = lazy(() => import('./pages/client/ClientDashboard'));
const MyShipments = lazy(() => import('./pages/client/MyShipments'));
const MyInvoices = lazy(() => import('./pages/client/MyInvoices'));
const MyAccount = lazy(() => import('./pages/client/MyAccount'));
const ClientQuotes = lazy(() => import('./pages/client/ClientQuotes'));
const ClientQuoteDetail = lazy(() => import('./pages/client/ClientQuoteDetail'));
const ClientShipmentCreate = lazy(() => import('./pages/client/ClientShipmentCreate'));
const ClientQuoteRequestCreate = lazy(() => import('./pages/client/ClientQuoteRequestCreate'));
const ClientShipmentDetail = lazy(() => import('./pages/client/ClientShipmentDetail'));
const ClientInvoiceDetail = lazy(() => import('./pages/client/ClientInvoiceDetail'));
const ChangerStatut = lazy(() => import('./pages/employe/ChangerStatut'));
const MonHistorique = lazy(() => import('./pages/employe/MonHistorique'));
const Employes = lazy(() => import('./pages/provider/Employes'));
const EmployeTransactions = lazy(() => import('./pages/provider/EmployeTransactions'));

function App() {
  return (
    <ToastProvider>
      <SuccessModalProvider>
        <DialogProvider>
          <LoadingProvider>
          <AuthProvider>
            <BrowserRouter>
              <Suspense fallback={<LoadingOverlay />}>
              <Routes>
                <Route element={<PublicLayout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/qui-sommes-nous" element={<QuiSommesNous />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/suivi" element={<Tracking />} />
                  <Route path="/devis-express" element={<QuoteRequest />} />
                  <Route path="/demande-compte" element={<AccountRequest />} />
                  <Route path="/completer-expedition/:token" element={<CompleteExpedition />} />
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
                    <Route path="/dashboard/demandes-expedition" element={<ExpeditionRequests />} />
                    <Route path="/dashboard/demandes-expedition/:id" element={<ExpeditionRequestDetail />} />
                    <Route path="/dashboard/clients" element={<Clients />} />
                    <Route path="/dashboard/clients/nouveau" element={<ClientCreate />} />
                    <Route path="/dashboard/clients/:id" element={<ClientDetail />} />
                    <Route path="/dashboard/activite-clients" element={<ClientActivity />} />
                    <Route path="/dashboard/demandes-compte" element={<AccountRequests />} />
                    <Route path="/dashboard/factures" element={<Invoices />} />
                    <Route path="/dashboard/factures/nouveau" element={<InvoiceCreate />} />
                    <Route path="/dashboard/factures/:id" element={<InvoiceDetail />} />
                    <Route path="/dashboard/avoirs/nouveau" element={<AvoirCreate />} />
                    <Route path="/dashboard/avoirs/:id" element={<AvoirDetail />} />
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
                    <Route path="/dashboard/employes" element={<Employes />} />
                    <Route path="/dashboard/employes/historique" element={<EmployeTransactions />} />
                  </Route>
                </Route>

                <Route element={<ProtectedRoute role="client" />}>
                  <Route element={<ClientLayout />}>
                    <Route path="/client" element={<ClientDashboard />} />
                    <Route path="/client/mes-expeditions" element={<MyShipments />} />
                    <Route path="/client/mes-expeditions/:id" element={<ClientShipmentDetail />} />
                    <Route path="/client/expeditions/nouveau" element={<ClientShipmentCreate />} />
                    <Route path="/client/mes-factures" element={<MyInvoices />} />
                    <Route path="/client/mes-factures/:id" element={<ClientInvoiceDetail />} />
                    <Route path="/client/devis" element={<ClientQuotes />} />
                    <Route path="/client/devis/:id" element={<ClientQuoteDetail />} />
                    <Route path="/client/demande-devis/nouveau" element={<ClientQuoteRequestCreate />} />
                    <Route path="/client/mon-compte" element={<MyAccount />} />
                  </Route>
                </Route>

                <Route element={<ProtectedRoute role="employe" />}>
                  <Route element={<EmployeLayout />}>
                    <Route path="/employe" element={<Navigate to="/employe/changer-statut" replace />} />
                    <Route path="/employe/changer-statut" element={<ChangerStatut />} />
                    <Route path="/employe/mon-historique" element={<MonHistorique />} />
                  </Route>
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              </Suspense>
              <SessionExpiredModal />
              <DownloadOverlay />
            </BrowserRouter>
          </AuthProvider>
          </LoadingProvider>
    </DialogProvider>
    </SuccessModalProvider>
    </ToastProvider>
  );
}

export default App;
