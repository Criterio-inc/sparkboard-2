import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

export const Footer = () => {
  const { t } = useLanguage();
  
  return (
    <footer className="bg-gradient-to-r from-primary-dark to-primary text-primary-foreground py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">✨</span>
            <span className="font-semibold">Sparkboard</span>
          </div>
          
          <div className="flex items-center gap-6 text-sm">
            <Link 
              to="/privacy" 
              className="hover:text-accent transition-colors"
            >
              {t('footer.privacy')}
            </Link>
            <Link 
              to="/terms" 
              className="hover:text-accent transition-colors"
            >
              {t('footer.terms')}
            </Link>
            <Link 
              to="/cookies" 
              className="hover:text-accent transition-colors"
            >
              {t('footer.cookies')}
            </Link>
            <a 
              href="mailto:kontakt@criteroconsulting.se" 
              className="hover:text-accent transition-colors"
            >
              {t('footer.contact')}
            </a>
          </div>
          
          <p className="text-sm text-primary-foreground/70">
            © {new Date().getFullYear()} CRITERO Consulting. {t('footer.rights')}
          </p>
        </div>
      </div>
    </footer>
  );
};
