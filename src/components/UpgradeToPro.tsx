import { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Loader2 } from 'lucide-react';
import { STRIPE_PRICES } from '@/lib/stripe';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const UpgradeToPro = () => {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');

  const handleUpgrade = async () => {
    if (!user) return;

    setLoading(true);

    try {
      const priceId = selectedPlan === 'monthly' 
        ? STRIPE_PRICES.monthly
        : STRIPE_PRICES.yearly;

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      toast({
        title: 'Fel',
        description: 'Något gick fel. Försök igen.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">Uppgradera till Pro</h2>
        <p className="text-muted-foreground">Skapa obegränsat med workshops</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Månadsvis */}
        <Card 
          className={`cursor-pointer transition-all ${
            selectedPlan === 'monthly' ? 'ring-2 ring-primary' : ''
          }`}
          onClick={() => setSelectedPlan('monthly')}
        >
          <CardHeader>
            <CardTitle>Månadsvis</CardTitle>
            <CardDescription>
              <span className="text-3xl font-bold text-foreground">99 SEK</span>
              <span className="text-muted-foreground">/månad</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                <span>Obegränsat workshops</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                <span>Obegränsat deltagare</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                <span>AI-analys</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Årlig */}
        <Card 
          className={`cursor-pointer transition-all relative ${
            selectedPlan === 'yearly' ? 'ring-2 ring-primary' : ''
          }`}
          onClick={() => setSelectedPlan('yearly')}
        >
          <div className="absolute -top-3 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold">
            Spara 99 SEK
          </div>
          <CardHeader>
            <CardTitle>Årlig</CardTitle>
            <CardDescription>
              <span className="text-3xl font-bold text-foreground">1089 SEK</span>
              <span className="text-muted-foreground">/år</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                <span>Obegränsat workshops</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                <span>Obegränsat deltagare</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                <span>AI-analys</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                <span className="font-bold">1 månad gratis!</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 text-center">
        <Button 
          size="lg" 
          onClick={handleUpgrade}
          disabled={loading}
          className="min-w-[200px]"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Laddar...
            </>
          ) : (
            `Uppgradera nu - ${selectedPlan === 'monthly' ? '99 SEK/mån' : '1089 SEK/år'}`
          )}
        </Button>
      </div>
    </div>
  );
};
