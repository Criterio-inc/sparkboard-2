import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { useLanguage } from '@/contexts/LanguageContext';
import { Info } from 'lucide-react';

const Privacy = () => {
  const { language } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      
      <main className="flex-1 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
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
          <h1 className="text-3xl font-bold text-foreground mb-8">Integritetspolicy</h1>
          
          <div className="prose prose-lg max-w-none text-foreground/90 space-y-8">
            <p className="text-muted-foreground">
              Senast uppdaterad: {new Date().toLocaleDateString('sv-SE')}
            </p>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">Personuppgiftsansvarig</h2>
              <p>
                CRITERO Consulting är personuppgiftsansvarig för behandlingen av dina personuppgifter 
                i samband med användningen av Sparkboard.
              </p>
              <p className="mt-2">
                Kontakt:{' '}
                <a 
                  href="mailto:kontakt@criteroconsulting.se" 
                  className="text-accent hover:underline"
                >
                  kontakt@criteroconsulting.se
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">Vilka personuppgifter samlar vi in?</h2>
              <p>Vi samlar in följande personuppgifter:</p>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li>Namn och e-postadress vid registrering</li>
                <li>Profilbild (om du väljer att ladda upp en)</li>
                <li>Information du delar i workshops (anteckningar och idéer)</li>
                <li>Teknisk information som IP-adress och webbläsartyp</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">Hur använder vi dina uppgifter?</h2>
              <p>Vi använder dina personuppgifter för att:</p>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li>Tillhandahålla och förbättra våra tjänster</li>
                <li>Administrera ditt användarkonto</li>
                <li>Möjliggöra samarbete i workshops</li>
                <li>Kommunicera med dig om tjänsten</li>
                <li>Säkerställa tjänstens säkerhet och förhindra missbruk</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">Rättslig grund för behandling</h2>
              <p>Vi behandlar dina personuppgifter baserat på:</p>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li><strong>Avtal:</strong> För att fullgöra vårt avtal med dig som användare</li>
                <li><strong>Berättigat intresse:</strong> För att förbättra och säkra våra tjänster</li>
                <li><strong>Samtycke:</strong> För marknadsföring och analys (om du har samtyckt)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">Lagring och säkerhet</h2>
              <p>
                Dina personuppgifter lagras säkert på servrar inom EU/EES. Vi använder kryptering 
                och andra tekniska säkerhetsåtgärder för att skydda dina uppgifter mot obehörig åtkomst.
              </p>
              <p className="mt-2">
                Vi bevarar dina uppgifter så länge du har ett aktivt konto eller så länge det krävs 
                för att uppfylla de ändamål som beskrivs i denna policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">Delning av uppgifter</h2>
              <p>
                Vi säljer aldrig dina personuppgifter till tredje part. Vi kan dock dela uppgifter med:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li>Tjänsteleverantörer som hjälper oss att driva tjänsten (t.ex. hosting, autentisering)</li>
                <li>Myndigheter om vi är skyldiga enligt lag</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">Cookies</h2>
              <p>
                Vi använder nödvändiga cookies för att tjänsten ska fungera korrekt, inklusive 
                inloggningssessioner och språkinställningar. Dessa cookies är nödvändiga för 
                tjänstens funktion och kräver inte samtycke.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">Dina rättigheter enligt GDPR</h2>
              <p>Du har rätt att:</p>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li><strong>Få tillgång till:</strong> Begära en kopia av dina personuppgifter</li>
                <li><strong>Rätta:</strong> Begära rättelse av felaktiga uppgifter</li>
                <li><strong>Radera:</strong> Begära att vi raderar dina uppgifter ("rätten att bli bortglömd")</li>
                <li><strong>Begränsa:</strong> Begära begränsning av behandlingen</li>
                <li><strong>Dataportabilitet:</strong> Få dina uppgifter i ett maskinläsbart format</li>
                <li><strong>Invända:</strong> Invända mot behandling baserad på berättigat intresse</li>
              </ul>
              <p className="mt-4">
                För att utöva dina rättigheter, kontakta oss på{' '}
                <a 
                  href="mailto:kontakt@criteroconsulting.se" 
                  className="text-accent hover:underline"
                >
                  kontakt@criteroconsulting.se
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">Klagomål</h2>
              <p>
                Om du har klagomål på hur vi behandlar dina personuppgifter kan du kontakta 
                Integritetsskyddsmyndigheten (IMY):{' '}
                <a 
                  href="https://www.imy.se" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  www.imy.se
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-4">Ändringar i policyn</h2>
              <p>
                Vi kan komma att uppdatera denna integritetspolicy. Vid väsentliga ändringar 
                informerar vi dig via e-post eller genom ett meddelande i tjänsten.
              </p>
            </section>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Privacy;
