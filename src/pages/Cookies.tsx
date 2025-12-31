import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { useLanguage } from '@/contexts/LanguageContext';
import { Info } from 'lucide-react';

const Cookies = () => {
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
        <h1 className="text-3xl font-bold text-foreground mb-8">Cookiepolicy</h1>
        
        <div className="prose prose-lg max-w-none text-foreground/80 space-y-6">
          <p className="text-sm text-muted-foreground">
            Senast uppdaterad: {new Date().toLocaleDateString('sv-SE')}
          </p>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">1. Vad är cookies?</h2>
            <p>
              Cookies är små textfiler som lagras på din enhet (dator, surfplatta eller 
              mobiltelefon) när du besöker en webbplats. De används för att webbplatsen 
              ska fungera korrekt och för att komma ihåg dina preferenser.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">2. Vilka cookies använder vi?</h2>
            
            <h3 className="text-lg font-medium text-foreground mt-6 mb-3">Nödvändiga cookies</h3>
            <p>
              Dessa cookies är nödvändiga för att Tjänsten ska fungera. De inkluderar:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>
                <strong>Autentiseringscookies:</strong> Används för att hålla dig inloggad 
                och verifiera din identitet via vår autentiseringstjänst (Clerk).
              </li>
              <li>
                <strong>Sessionscookies:</strong> Används för att hantera din session 
                och spara tillfälliga data under ditt besök.
              </li>
              <li>
                <strong>Språkpreferenser:</strong> Sparar ditt val av språk (svenska/engelska).
              </li>
              <li>
                <strong>Temapreferenser:</strong> Sparar ditt val av ljust/mörkt tema.
              </li>
            </ul>

            <h3 className="text-lg font-medium text-foreground mt-6 mb-3">Funktionella cookies</h3>
            <p>
              Dessa cookies möjliggör förbättrad funktionalitet och personalisering:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>
                <strong>Workshop-data:</strong> Tillfällig lagring av workshop-information 
                för att förbättra användarupplevelsen.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">3. Tredjepartscookies</h2>
            <p>
              Vi använder följande tredjepartstjänster som kan sätta cookies:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>
                <strong>Clerk:</strong> För säker autentisering och användarhantering.
              </li>
            </ul>
            <p className="mt-2">
              Dessa tredjeparter har sina egna integritetspolicyer som styr hur de 
              hanterar dina uppgifter.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">4. Hur du hanterar cookies</h2>
            <p>
              Du kan hantera cookies genom inställningarna i din webbläsare. 
              De flesta webbläsare låter dig:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Se vilka cookies som finns lagrade</li>
              <li>Ta bort enskilda eller alla cookies</li>
              <li>Blockera cookies från specifika webbplatser</li>
              <li>Blockera alla cookies</li>
              <li>Ta bort alla cookies när du stänger webbläsaren</li>
            </ul>
            <p className="mt-4">
              <strong>Observera:</strong> Om du blockerar nödvändiga cookies kan det 
              påverka Tjänstens funktionalitet, till exempel din möjlighet att logga in.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">5. Uppdateringar av denna policy</h2>
            <p>
              Vi kan uppdatera denna cookiepolicy vid behov. Eventuella ändringar 
              publiceras på denna sida med ett uppdaterat datum.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">6. Kontakt</h2>
            <p>
              Vid frågor om vår användning av cookies, kontakta oss på:{' '}
              <a 
                href="mailto:kontakt@criteroconsulting.se" 
                className="text-[#F1916D] hover:underline"
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

export default Cookies;
