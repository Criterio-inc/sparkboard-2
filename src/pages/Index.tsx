import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Users, UserPlus, Sparkles, Bot } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageThemeToggle } from "@/components/LanguageThemeToggle";
import heroImage from "@/assets/hero-braindrain.jpg";
const Index = () => {
  const { t } = useTranslation();

  return <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: `url(${heroImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }} />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
        
        {/* Language & Theme Toggle */}
        <div className="absolute top-4 right-4 z-10">
          <LanguageThemeToggle />
        </div>
        
        <div className="relative container mx-auto px-4 py-20">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-6">
              
              
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              {t('landing.title')}
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto">
              {t('landing.subtitle')}
            </p>

            {/* Role Selection Cards */}
            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {/* Facilitator Card */}
              <Card className="p-8 hover:shadow-[var(--shadow-glow)] transition-all duration-300 hover:scale-105 bg-gradient-to-br from-card to-muted/20 border-2 border-transparent hover:border-primary/20">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-card-foreground">{t('landing.facilitator.title')}</h2>
                  <p className="text-muted-foreground">
                    {t('landing.facilitator.description')}
                  </p>
                  <Link to="/dashboard" className="w-full">
                    <Button variant="hero" size="lg" className="w-full">
                      {t('landing.facilitator.button')}
                    </Button>
                  </Link>
                </div>
              </Card>

              {/* Participant Card */}
              <Card className="p-8 hover:shadow-[var(--shadow-accent)] transition-all duration-300 hover:scale-105 bg-gradient-to-br from-card to-accent/5 border-2 border-transparent hover:border-accent/20">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
                    <UserPlus className="w-8 h-8 text-accent" />
                  </div>
                  <h2 className="text-2xl font-bold text-card-foreground">{t('landing.participant.title')}</h2>
                  <p className="text-muted-foreground">
                    {t('landing.participant.description')}
                  </p>
                  <Link to="/join" className="w-full">
                    <Button variant="accent" size="lg" className="w-full">
                      {t('landing.participant.button')}
                    </Button>
                  </Link>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          <div className="text-center">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{t('landing.features.realtime.title')}</h3>
            <p className="text-muted-foreground text-sm">
              {t('landing.features.realtime.description')}
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6 text-secondary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{t('landing.features.easy.title')}</h3>
            <p className="text-muted-foreground text-sm">
              {t('landing.features.easy.description')}
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <UserPlus className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{t('landing.features.responsive.title')}</h3>
            <p className="text-muted-foreground text-sm">
              {t('landing.features.responsive.description')}
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Bot className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{t('landing.features.ai.title')}</h3>
            <p className="text-muted-foreground text-sm">
              {t('landing.features.ai.description')}
            </p>
          </div>
        </div>
      </div>
    </div>;
};
export default Index;