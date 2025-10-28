import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { 
  SignInButton, 
  SignUpButton, 
  UserButton, 
  useUser 
} from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSubscription } from '@/hooks/useSubscription';
import curagoLogo from '@/assets/curago-logo.png';
import { Sparkles } from 'lucide-react';

export const Navigation = () => {
  const { t } = useLanguage();
  const { isSignedIn, user } = useUser();
  const { isCuragoUser, isPro, isFree } = useSubscription();

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
              <>
                <Link 
                  to="/dashboard" 
                  className="hover:text-[#F1916D] transition-colors"
                >
                  {t('nav.myWorkshops')}
                </Link>
                
                {isFree && (
                  <Link to="/upgrade">
                    <Button 
                      size="sm"
                      className="bg-gradient-to-r from-[#F1916D] to-[#AE7DAC] hover:opacity-90 text-white font-semibold"
                    >
                      <Sparkles className="w-4 h-4 mr-1.5" />
                      Uppgradera
                    </Button>
                  </Link>
                )}
              </>
            )}
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <LanguageSwitcher />

            {isSignedIn ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm hidden sm:block">
                    {user.firstName || user.emailAddresses[0].emailAddress.split('@')[0]}
                  </span>
                  
                  {isCuragoUser && (
                    <Badge 
                      variant="secondary" 
                      className="bg-[#5A9BD5] text-white hover:bg-[#4A8BC5] flex items-center gap-1.5 px-2 py-0.5"
                    >
                      <img src={curagoLogo} alt="Curago" className="h-3 w-auto" />
                      <span className="text-xs font-semibold">Enterprise</span>
                    </Badge>
                  )}
                  
                  {isPro && !isCuragoUser && (
                    <Badge 
                      variant="default" 
                      className="bg-gradient-to-r from-[#F1916D] to-[#AE7DAC] text-white"
                    >
                      Pro
                    </Badge>
                  )}
                </div>
                
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
