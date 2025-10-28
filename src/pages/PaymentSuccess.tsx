import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        // Anropa check-subscription edge function
        const { data, error } = await supabase.functions.invoke('check-subscription');

        if (error) {
          console.error('Subscription check error:', error);
        } else {
          console.log('Subscription check result:', data);
        }

        // Vänta 2 sekunder innan redirect för att användaren ska se meddelandet
        setTimeout(() => {
          toast({
            title: '🎉 Välkommen till Pro!',
            description: 'Du kan nu skapa obegränsat med workshops',
          });
          navigate('/dashboard');
        }, 2000);
      } catch (error) {
        console.error('Error checking subscription:', error);
        setChecking(false);
      }
    };

    checkSubscription();
  }, [navigate, toast]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F3DADF] to-white">
      <Navigation />
      
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <Card className="border-2 border-green-200 shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              {checking ? (
                <Loader2 className="w-20 h-20 text-green-600 animate-spin" />
              ) : (
                <CheckCircle2 className="w-20 h-20 text-green-600" />
              )}
            </div>
            <CardTitle className="text-3xl font-bold text-green-800">
              Betalning genomförd!
            </CardTitle>
            <CardDescription className="text-lg mt-2">
              Tack för att du uppgraderade till Pro
            </CardDescription>
          </CardHeader>
          
          <CardContent className="text-center space-y-6 pt-6">
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
              <p className="text-green-800 font-medium flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5" />
                Du har nu tillgång till alla Pro-funktioner!
              </p>
            </div>

            <div className="space-y-2 text-left">
              <p className="flex items-center gap-2 text-gray-700">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Obegränsat antal workshops
              </p>
              <p className="flex items-center gap-2 text-gray-700">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Obegränsat antal deltagare
              </p>
              <p className="flex items-center gap-2 text-gray-700">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                AI-analys av resultaten
              </p>
            </div>

            {checking ? (
              <p className="text-gray-600 text-sm animate-pulse">
                Uppdaterar ditt konto...
              </p>
            ) : (
              <Button 
                onClick={() => navigate('/dashboard')}
                className="bg-gradient-to-r from-[#F1916D] to-[#AE7DAC] text-white"
              >
                Gå till Dashboard
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentSuccess;
