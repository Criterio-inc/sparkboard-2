import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Users, UserPlus, Sparkles, Bot } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Footer } from "@/components/Footer";
import heroImage from "@/assets/hero-braindrain.jpg";
const Index = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        <div 
          className="absolute inset-0 opacity-20" 
          style={{
            backgroundImage: `url(${heroImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
          role="img"
          aria-label="Workshop collaboration background with sticky notes and brainstorming"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
        
        {/* Language & Theme Toggle */}
        <nav className="absolute top-4 right-4 z-10 flex gap-2" aria-label="Settings">
          <ThemeToggle />
          <LanguageSwitcher />
        </nav>
        
        <div className="relative container mx-auto px-4 py-20">
          <div className="text-center max-w-4xl mx-auto">
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              {t('app.title')}
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto">
              {t('app.tagline')}
            </p>

            {/* Role Selection Cards */}
            <section aria-label="Choose your role" className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {/* Facilitator Card */}
              <article>
                <Card className="p-8 hover:shadow-[var(--shadow-glow)] transition-all duration-300 hover:scale-105 bg-gradient-to-br from-card to-muted/20 border-2 border-transparent hover:border-primary/20">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div 
                      className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"
                      aria-hidden="true"
                    >
                      <Users className="w-8 h-8 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold text-card-foreground">{t('landing.facilitator.title')}</h2>
                    <p className="text-muted-foreground">
                      {t('landing.facilitator.description')}
                    </p>
                    <Link to="/dashboard" className="w-full">
                      <Button 
                        variant="hero" 
                        size="lg" 
                        className="w-full"
                        aria-label={t('landing.facilitator.button')}
                      >
                        {t('landing.facilitator.button')}
                      </Button>
                    </Link>
                  </div>
                </Card>
              </article>

              {/* Participant Card */}
              <article>
                <Card className="p-8 hover:shadow-[var(--shadow-accent)] transition-all duration-300 hover:scale-105 bg-gradient-to-br from-card to-accent/5 border-2 border-transparent hover:border-accent/20">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div 
                      className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center"
                      aria-hidden="true"
                    >
                      <UserPlus className="w-8 h-8 text-accent" />
                    </div>
                    <h2 className="text-2xl font-bold text-card-foreground">{t('landing.participant.title')}</h2>
                    <p className="text-muted-foreground">
                      {t('landing.participant.description')}
                    </p>
                    <Link to="/join" className="w-full">
                      <Button 
                        variant="accent" 
                        size="lg" 
                        className="w-full"
                        aria-label={t('landing.participant.button')}
                      >
                        {t('landing.participant.button')}
                      </Button>
                    </Link>
                  </div>
                </Card>
              </article>
            </section>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <main>
        <section aria-labelledby="features-heading" className="container mx-auto px-4 py-20">
          <h2 id="features-heading" className="sr-only">Platform Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            <article className="text-center">
              <div 
                className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4"
                aria-hidden="true"
              >
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{t('landing.features.realtime.title')}</h3>
              <p className="text-muted-foreground text-sm">
                {t('landing.features.realtime.description')}
              </p>
            </article>
            
            <article className="text-center">
              <div 
                className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center mx-auto mb-4"
                aria-hidden="true"
              >
                <Users className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{t('landing.features.easy.title')}</h3>
              <p className="text-muted-foreground text-sm">
                {t('landing.features.easy.description')}
              </p>
            </article>
            
            <article className="text-center">
              <div 
                className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mx-auto mb-4"
                aria-hidden="true"
              >
                <UserPlus className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{t('landing.features.responsive.title')}</h3>
              <p className="text-muted-foreground text-sm">
                {t('landing.features.responsive.description')}
              </p>
            </article>
            
            <article className="text-center">
              <div 
                className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4"
                aria-hidden="true"
              >
                <Bot className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{t('landing.features.ai.title')}</h3>
              <p className="text-muted-foreground text-sm">
                {t('landing.features.ai.description')}
              </p>
            </article>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};
export default Index;