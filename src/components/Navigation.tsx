import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import { 
  SignInButton, 
  SignUpButton, 
  UserButton, 
  useUser 
} from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';

export const Navigation = () => {
  const { t } = useLanguage();
  const { isSignedIn, user } = useUser();

  return (
    <header className="bg-gradient-to-r from-[#03122F] to-[#19305C] text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">✨</span>
            <h1 className="text-2xl font-bold">Sparkboard</h1>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {isSignedIn && (
              <Link 
                to="/dashboard" 
                className="hover:text-[#F1916D] transition-colors"
              >
                {t('nav.myWorkshops')}
              </Link>
            )}
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            <LanguageSwitcher />

            {isSignedIn ? (
              <div className="flex items-center gap-3">
                <span className="text-sm hidden sm:block">
                  {user.firstName || user.emailAddresses[0].emailAddress.split('@')[0]}
                </span>
                <UserButton 
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      avatarBox: "w-10 h-10 rounded-full ring-2 ring-[#F1916D]",
                    }
                  }}
                />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <SignInButton mode="modal">
                  <Button 
                    variant="ghost" 
                    className="text-white hover:bg-white/10"
                  >
                    {t('auth.login')}
                  </Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button className="bg-gradient-to-r from-[#F1916D] to-[#AE7DAC] hover:opacity-90 text-white font-semibold">
                    {t('auth.signup')}
                  </Button>
                </SignUpButton>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
