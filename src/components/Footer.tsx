import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="bg-gradient-to-r from-[#03122F] to-[#19305C] text-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">✨</span>
            <span className="font-semibold">Sparkboard</span>
          </div>
          
          <div className="flex items-center gap-6 text-sm">
            <Link 
              to="/privacy" 
              className="hover:text-[#F1916D] transition-colors"
            >
              Integritetspolicy
            </Link>
            <a 
              href="mailto:kontakt@criteroconsulting.se" 
              className="hover:text-[#F1916D] transition-colors"
            >
              Kontakt
            </a>
          </div>
          
          <p className="text-sm text-white/70">
            © {new Date().getFullYear()} CRITERO Consulting. Alla rättigheter förbehållna.
          </p>
        </div>
      </div>
    </footer>
  );
};
