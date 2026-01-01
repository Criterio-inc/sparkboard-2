import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { useLanguage } from '@/contexts/LanguageContext';
import { Info } from 'lucide-react';

const Terms = () => {
  const { language } = useLanguage();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {language === 'en' && (
          <div className="mb-6 p-4 bg-muted/50 border border-border rounded-lg flex items-start gap-3">
            <Info className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              This page is only available in Swedish. For questions, please contact us at{' '}
              <a href="mailto:kontakt@criteroconsulting.se" className="text-primary hover:underline">
                kontakt@criteroconsulting.se
              </a>
            </p>
          </div>
        )}
        <h1 className="text-3xl font-bold text-foreground mb-8">Användarvillkor</h1>
        
        <div className="prose prose-lg max-w-none text-foreground/80 space-y-6">
          <p className="text-sm text-muted-foreground">
            Senast uppdaterad: {new Date().toLocaleDateString('sv-SE')}
          </p>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">1. Acceptans av villkor</h2>
            <p>
              Genom att använda Sparkboard ("Tjänsten") accepterar du dessa användarvillkor. 
              Om du inte accepterar villkoren ska du inte använda Tjänsten.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">2. Tjänstebeskrivning</h2>
            <p>
              Sparkboard är ett digitalt workshopverktyg som gör det möjligt för facilitatorer 
              att skapa och leda interaktiva workshops med deltagare i realtid. Tjänsten 
              tillhandahålls av CRITERO Consulting.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">3. Användarkonton</h2>
            <p>
              För att använda vissa funktioner i Tjänsten kan du behöva skapa ett konto. 
              Du ansvarar för att hålla dina inloggningsuppgifter säkra och för all 
              aktivitet som sker under ditt konto.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">4. Användarens åtaganden</h2>
            <p>Som användare av Tjänsten åtar du dig att:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Använda Tjänsten i enlighet med gällande lagar och förordningar</li>
              <li>Inte sprida olagligt, kränkande eller skadligt innehåll</li>
              <li>Inte försöka störa eller skada Tjänstens funktion</li>
              <li>Respektera andra användares integritet och rättigheter</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">5. Immateriella rättigheter</h2>
            <p>
              Tjänsten och dess innehåll, inklusive men inte begränsat till text, grafik, 
              logotyper och programvara, ägs av CRITERO Consulting eller dess licensgivare 
              och skyddas av upphovsrättslagar.
            </p>
            <p className="mt-2">
              Innehåll som du skapar i Tjänsten (t.ex. workshop-anteckningar) förblir din egendom.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">6. Ansvarsbegränsning</h2>
            <p>
              Tjänsten tillhandahålls "i befintligt skick" utan några garantier. 
              CRITERO Consulting ansvarar inte för eventuella förluster eller skador 
              som uppstår till följd av användning av Tjänsten, i den utsträckning 
              som tillåts enligt lag.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">7. Ändringar av villkor</h2>
            <p>
              Vi förbehåller oss rätten att ändra dessa villkor när som helst. 
              Väsentliga ändringar meddelas via Tjänsten eller e-post. 
              Fortsatt användning efter ändringar innebär acceptans av de nya villkoren.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">8. Tillämplig lag</h2>
            <p>
              Dessa villkor regleras av svensk lag. Eventuella tvister ska i första hand 
              lösas genom förhandling och i andra hand avgöras av svensk domstol.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">9. Kontakt</h2>
            <p>
              Vid frågor om dessa användarvillkor, kontakta oss på:{' '}
              <a 
                href="mailto:kontakt@criteroconsulting.se" 
                className="text-accent hover:underline"
              >
                kontakt@criteroconsulting.se
              </a>
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Terms;
