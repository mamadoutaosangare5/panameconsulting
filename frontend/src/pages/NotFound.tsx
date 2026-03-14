import { Link } from "react-router-dom";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* 404 Number */}
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-sky-600">404</h1>
          <div className="relative">
            <div className="absolute inset-0 bg-sky-200 opacity-20 blur-3xl"></div>
            <p className="text-2xl font-semibold text-gray-800 relative">
              Page non trouvée
            </p>
          </div>
        </div>

        {/* Error Message */}
        <p className="text-gray-600 mb-8 leading-relaxed">
          Désolé, la page que vous recherchez n'existe pas ou a été déplacée.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors shadow-md hover:shadow-lg transform hover:scale-105 duration-200"
          >
            <Home className="w-5 h-5" />
            Retour à l'accueil
          </Link>

          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-md hover:shadow-lg border border-gray-200"
          >
            <ArrowLeft className="w-5 h-5" />
            Page précédente
          </button>
        </div>

        {/* Popular Links */}
        <div className="mt-12 pt-8 border-t border-sky-200">
          <p className="text-sm text-gray-600 mb-4">Pages populaires :</p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Link
              to="/"
              className="px-3 py-1 text-sm bg-sky-100 text-sky-700 rounded-full hover:bg-sky-200 transition-colors"
            >
              Accueil
            </Link>
            <Link
              to="/services"
              className="px-3 py-1 text-sm bg-sky-100 text-sky-700 rounded-full hover:bg-sky-200 transition-colors"
            >
              Services
            </Link>
            <Link
              to="/connexion"
              className="px-3 py-1 text-sm bg-sky-100 text-sky-700 rounded-full hover:bg-sky-200 transition-colors"
            >
              Connexion
            </Link>
            <Link
              to="/contact"
              className="px-3 py-1 text-sm bg-sky-100 text-sky-700 rounded-full hover:bg-sky-200 transition-colors"
            >
              Contact
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
