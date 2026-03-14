import {
  BrowserRouter as Router,
  Routes,
  Route,
  Outlet,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import ScrollToTop from "./components/shared/ScrollToTop";
import { lazy } from "react";
import ErrorBoundary from "./components/ErrorBoundary";

// Layouts (non lazy — chargés immédiatement, légers)
import RootLayout from "./pages/(main)/RootLayout";
import UserLayout from "./pages/user/UserLayout";
import GestionnaireLayout from "./pages/gestionnaire/GestionnaireLayout";
import AuthLayout from "./pages/auth/AuthLayout";

// Pages publiques
const Home = lazy(() => import("./pages/(main)/Home"));
const Services = lazy(() => import("./pages/(main)/Services"));
const Contact = lazy(() => import("./pages/(main)/Contact"));
const About = lazy(() => import("./pages/(main)/About"));
const PDFViewer = lazy(() => import("./pages/(main)/PDFViewer"));

// Pages d'authentification
const Login = lazy(() => import("./pages/auth/Login"));
const Register = lazy(() => import("./pages/auth/Register"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));

// Pages user
const Profile = lazy(() => import("./pages/user/profile/MonProfile"));
const Maprocedure = lazy(() => import("./pages/user/procedures/Maprocedure"));
const MesRendezVous = lazy(
  () => import("./pages/user/rendezvous/MesRendezVous"),
);
const RendezVous = lazy(() => import("./pages/user/rendezvous/RendezVous"));

// Pages gestionnaire
const Statistiques = lazy(
  () => import("./pages/gestionnaire/statistiques/Statistiques"),
);
const Utilisateurs = lazy(
  () => import("./pages/gestionnaire/utilisateurs/Utilisateurs"),
);
const Destinations = lazy(
  () => import("./pages/gestionnaire/destinations/Destinations"),
);
const Rendezvous = lazy(
  () => import("./pages/gestionnaire/rendezvous/Rendezvous"),
);
const Messages = lazy(() => import("./pages/gestionnaire/messages/Messages"));
const Profil = lazy(() => import("./pages/gestionnaire/profil/Profil"));
const Procedures = lazy(
  () => import("./pages/gestionnaire/procedures/Procedures"),
);

// NotFound
const NotFound = lazy(() => import("./pages/NotFound"));

function App() {
  return (
    <>
      <Router>
        <ErrorBoundary>
          <AuthProvider>
            <ScrollToTop />
            <Routes>
              {/* Routes publiques avec RootLayout */}
              <Route path="/" element={<RootLayout />}>
                <Route index element={<Home />} />
                <Route path="services" element={<Services />} />
                <Route path="contact" element={<Contact />} />
                <Route path="a-propos" element={<About />} />
              </Route>

              {/* Routes d'authentification */}
              <Route
                path="/connexion"
                element={
                  <AuthLayout>
                    <Login />
                  </AuthLayout>
                }
              />
              <Route
                path="/inscription"
                element={
                  <AuthLayout>
                    <Register />
                  </AuthLayout>
                }
              />
              <Route
                path="/mot-de-passe-oublie"
                element={
                  <AuthLayout>
                    <ForgotPassword />
                  </AuthLayout>
                }
              />
              <Route
                path="/reinitialiser-mot-de-passe"
                element={
                  <AuthLayout>
                    <ResetPassword />
                  </AuthLayout>
                }
              />

              <Route
                path="/info/:documentName"
                element={
                  <ErrorBoundary>
                    <PDFViewer />
                  </ErrorBoundary>
                }
              />

              <Route
                path="/rendez-vous"
                element={
                    <RendezVous />
                }
              />

              {/* User routes avec UserLayout */}
              <Route
                path="/user"
                element={
                  <UserLayout>
                    <Outlet />
                  </UserLayout>
                }
              >
                <Route path="mon-profil" element={<Profile />} />
                <Route path="mes-procedures" element={<Maprocedure />} />
                <Route path="mes-rendezvous" element={<MesRendezVous />} />
              </Route>

              {/* Gestionnaire routes avec GestionnaireLayout */}
              <Route path="/gestionnaire" element={<GestionnaireLayout />}>
                <Route index element={<Statistiques />} />
                <Route path="statistiques" element={<Statistiques />} />
                <Route path="utilisateurs" element={<Utilisateurs />} />
                <Route path="destinations" element={<Destinations />} />
                <Route path="rendezvous" element={<Rendezvous />} />
                <Route path="procedures" element={<Procedures />} />
                <Route path="messages" element={<Messages />} />
                <Route path="profil" element={<Profil />} />
              </Route>

              {/* Page 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </ErrorBoundary>
      </Router>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#363636",
            color: "#fff",
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: "#10b981",
              secondary: "#fff",
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: "#ef4444",
              secondary: "#fff",
            },
          },
        }}
      />
    </>
  );
}

export default App;
