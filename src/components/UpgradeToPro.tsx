import { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, X, Loader2 } from 'lucide-react';
import { STRIPE_PRICES } from '@/lib/stripe';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import { useLanguage } from '@/contexts/LanguageContext';

export const UpgradeToPro = () => {
  const { user } = useUser();
  const { plan } = useSubscription();
  const { t } = useLanguage();
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
        body: { 
          priceId,
          userEmail: user.primaryEmailAddress?.emailAddress
        }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      toast({
        title: t('common.error'),
        description: t('upgrade.error'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">{t('upgrade.title')}</h2>
        <p className="text-muted-foreground">{t('upgrade.subtitle')}</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* FREE PLAN */}
        <Card className={plan === 'free' ? 'ring-2 ring-primary/50' : 'opacity-75'}>
          <CardHeader>
            <CardTitle>{t('upgrade.free.title')}</CardTitle>
            <CardDescription>
              <span className="text-3xl font-bold text-foreground">{t('upgrade.free.price')}</span>
              <span className="text-muted-foreground">{t('upgrade.free.period')}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span>{t('upgrade.free.workshop')}</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span>{t('upgrade.free.participants')}</span>
              </li>
              <li className="flex items-center gap-2">
                <X className="w-5 h-5 text-red-500 flex-shrink-0" />
                <span className="text-muted-foreground">{t('upgrade.free.noAi')}</span>
              </li>
              <li className="flex items-center gap-2">
                <X className="w-5 h-5 text-red-500 flex-shrink-0" />
                <span className="text-muted-foreground">{t('upgrade.free.noSupport')}</span>
              </li>
            </ul>
            {plan === 'free' && (
              <div className="mt-4 text-center text-sm text-muted-foreground font-medium">
                {t('upgrade.free.currentPlan')}
              </div>
            )}
          </CardContent>
        </Card>

        {/* MÅNADSVIS */}
        <Card 
          className={`cursor-pointer transition-all ${
            selectedPlan === 'monthly' ? 'ring-2 ring-primary' : ''
          }`}
          onClick={() => setSelectedPlan('monthly')}
        >
          <CardHeader>
            <CardTitle>{t('upgrade.monthly.title')}</CardTitle>
            <CardDescription>
              <span className="text-3xl font-bold text-foreground">{t('upgrade.monthly.price')}</span>
              <span className="text-muted-foreground">{t('upgrade.monthly.period')}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span>{t('upgrade.pro.workshops')}</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span>{t('upgrade.pro.participants')}</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span>{t('upgrade.pro.ai')}</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span>{t('upgrade.pro.support')}</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* ÅRLIG */}
        <Card 
          className={`cursor-pointer transition-all relative ${
            selectedPlan === 'yearly' ? 'ring-2 ring-primary' : ''
          }`}
          onClick={() => setSelectedPlan('yearly')}
        >
          <div className="absolute -top-3 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold">
            {t('upgrade.yearly.save')}
          </div>
          <CardHeader>
            <CardTitle>{t('upgrade.yearly.title')}</CardTitle>
            <CardDescription>
              <span className="text-3xl font-bold text-foreground">{t('upgrade.yearly.price')}</span>
              <span className="text-muted-foreground">{t('upgrade.yearly.period')}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span>{t('upgrade.pro.workshops')}</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span>{t('upgrade.pro.participants')}</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span>{t('upgrade.pro.ai')}</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span>{t('upgrade.pro.support')}</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="font-bold">{t('upgrade.yearly.saveMonths')}</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {plan !== 'pro' && plan !== 'curago' && (
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
                {t('upgrade.loading')}
              </>
            ) : (
              `${t('upgrade.button')} - ${selectedPlan === 'monthly' ? '99 SEK/mån' : '950 SEK/år'}`
            )}
          </Button>
        </div>
      )}
    </div>
  );
};