import { Outlet } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Footer from "../../components/shared/Footer";
import Header from "../../components/shared/Header";

const RootLayout = () => {
  return (
    <>
      <Helmet>
        <title>Paname Consulting </title>
        <meta
          name="description"
          content="Paname Consulting - Votre partenaire expert pour l'immigration, les études à l'étranger et les projets internationaux"
        />
      </Helmet>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
          <Header />
        </header>
        <main className="flex-1 w-full">
          <Outlet />
        </main>
        <footer className="bg-white border-t border-gray-200 mt-auto">
          <Footer />
        </footer>
      </div>
    </>
  );
};

export default RootLayout;
