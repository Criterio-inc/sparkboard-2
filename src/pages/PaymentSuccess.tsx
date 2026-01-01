import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Sparkles, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser, useAuth } from '@clerk/clerk-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useUser();
  const { getToken } = useAuth();
  const { t } = useLanguage();
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const checkSubscription = async (attempt = 1) => {
      if (!user) return;
      
      try {
        console.log(`🔄 Checking subscription (attempt ${attempt})...`);
        const token = await getToken();
        const { data, error } = await supabase.functions.invoke('check-subscription', {
          body: { 
            userEmail: user.primaryEmailAddress?.emailAddress,
            userId: user.id
          },
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (error) {
          console.error('Subscription check error:', error);
          throw error;
        }
        
        console.log('✅ Subscription check result:', data);
        setChecking(false);

        setTimeout(() => {
          toast({
            title: `🎉 ${t('payment.success.welcome')}`,
            description: t('payment.success.welcomeDesc'),
          });
          navigate('/dashboard');
        }, 1500);
      } catch (err) {
        console.error('Error checking subscription:', err);
        
        if (attempt === 1 && retryCount === 0) {
          setRetryCount(1);
          setTimeout(() => {
            checkSubscription(2);
          }, 2000);
        } else {
          setError(t('payment.success.verifyError'));
          setChecking(false);
          setTimeout(() => {
            navigate('/dashboard');
          }, 3000);
        }
      }
    };

    checkSubscription();
  }, [navigate, toast, user, retryCount, t]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <Card className="border-2 border-green-200 dark:border-green-800 shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              {checking ? (
                <Loader2 className="w-20 h-20 text-green-600 animate-spin" />
              ) : (
                <CheckCircle2 className="w-20 h-20 text-green-600" />
              )}
            </div>
            <CardTitle className="text-3xl font-bold text-green-800 dark:text-green-400">
              {t('payment.success.title')}
            </CardTitle>
            <CardDescription className="text-lg mt-2">
              {t('payment.success.description')}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="text-center space-y-6 pt-6">
            <div className="bg-green-50 dark:bg-green-950/30 border-l-4 border-green-500 p-4 rounded">
              <p className="text-green-800 dark:text-green-300 font-medium flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5" />
                {t('payment.success.features')}
              </p>
            </div>

            <div className="space-y-2 text-left">
              <p className="flex items-center gap-2 text-foreground">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                {t('payment.success.unlimitedWorkshops')}
              </p>
              <p className="flex items-center gap-2 text-foreground">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                {t('payment.success.unlimitedParticipants')}
              </p>
              <p className="flex items-center gap-2 text-foreground">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                {t('payment.success.aiAnalysis')}
              </p>
            </div>

            {error && (
              <div className="bg-yellow-50 dark:bg-yellow-950/30 border-l-4 border-yellow-500 p-3 rounded text-sm text-yellow-800 dark:text-yellow-200">
                {error}
              </div>
            )}

            {checking ? (
              <p className="text-muted-foreground text-sm animate-pulse">
                {retryCount > 0 ? t('payment.success.retrying') : t('payment.success.updating')}
              </p>
            ) : (
              <Button 
                onClick={() => navigate('/dashboard')}
                className="bg-gradient-to-r from-accent to-secondary text-accent-foreground"
              >
                {t('payment.success.goToDashboard')}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentSuccess;
