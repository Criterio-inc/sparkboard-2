import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSubscription } from '@/hooks/useSubscription';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, CreditCard, AlertCircle, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { sv, enUS } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

const AccountSettings = () => {
  const { profile, isPro, isFree, isCuragoUser } = useSubscription();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();
  const { t, language } = useLanguage();
  
  const dateLocale = language === 'sv' ? sv : enUS;

  const handleManageSubscription = async () => {
    if (!user?.primaryEmailAddress?.emailAddress) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        body: { 
          userEmail: user.primaryEmailAddress.emailAddress 
        }
      });

      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        title: t('account.errorOccurred'),
        description: t('account.stripeError'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshStatus = async () => {
    if (!user?.primaryEmailAddress?.emailAddress) return;
    
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        body: { 
          userEmail: user.primaryEmailAddress.emailAddress,
          userId: user.id
        }
      });

      if (error) throw error;
      
      toast({
        title: `✅ ${t('account.statusUpdated')}`,
        description: t('account.statusSynced'),
      });
    } catch (error) {
      console.error('Error refreshing subscription:', error);
      toast({
        title: t('account.updateFailed'),
        description: t('account.tryAgainLater'),
        variant: 'destructive'
      });
    } finally {
      setRefreshing(false);
    }
  };

  const getPlanBadge = () => {
    if (isCuragoUser) {
      return <Badge className="bg-curago text-white">🏢 Curago Enterprise</Badge>;
    }
    if (isPro) {
      return <Badge className="bg-gradient-to-r from-accent to-secondary text-white">⭐ Pro</Badge>;
    }
    return <Badge variant="secondary">🆓 Free</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold mb-8">{t('account.title')}</h1>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t('account.profile')}</CardTitle>
            <CardDescription>{t('account.profileInfo')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">{t('account.name')}</label>
              <p className="text-lg">{user?.firstName} {user?.lastName || ''}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">{t('account.email')}</label>
              <p className="text-lg">{user?.primaryEmailAddress?.emailAddress}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              {t('account.subscription')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-2">{t('account.currentPlan')}</label>
                {getPlanBadge()}
              </div>
              
              {isPro && profile?.subscription_current_period_end && (
                <div className="text-right">
                  <label className="text-sm font-medium text-muted-foreground block mb-1">{t('account.nextPayment')}</label>
                  <p className="text-sm">
                    {format(new Date(profile.subscription_current_period_end), 'PPP', { locale: dateLocale })}
                  </p>
                </div>
              )}
            </div>

            {isFree && (
              <>
                <Alert>
                  <Sparkles className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{t('account.upgradeCta')}</strong>
                  </AlertDescription>
                </Alert>
                
                <Link to="/upgrade">
                  <Button className="w-full bg-gradient-to-r from-accent to-secondary text-accent-foreground">
                    <Sparkles className="w-4 h-4 mr-2" />
                    {t('account.seePlans')}
                  </Button>
                </Link>
              </>
            )}

            {isPro && profile?.plan_source === 'stripe' && (
              <>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="space-y-2">
                    <p className="font-medium">📋 {t('account.manageSubscription')}</p>
                    <p className="text-sm">{t('account.manageInfo')}</p>
                    <ul className="text-sm list-disc list-inside space-y-1 ml-2">
                      <li>{t('account.cancelInfo')}</li>
                      <li>{t('account.changePayment')}</li>
                      <li>{t('account.updateMethod')}</li>
                      <li>{t('account.viewInvoices')}</li>
                    </ul>
                    <p className="text-sm text-muted-foreground mt-2">
                      ⚠️ <strong>{t('account.cancellationWarning', { 
                        date: profile?.subscription_current_period_end 
                          ? format(new Date(profile.subscription_current_period_end), 'PPP', { locale: dateLocale })
                          : ''
                      })}</strong>
                    </p>
                  </AlertDescription>
                </Alert>

                <div className="flex gap-2">
                  <Button 
                    onClick={handleManageSubscription}
                    disabled={loading || refreshing}
                    className="flex-1"
                    variant="outline"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t('account.opening')}
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        {t('account.manageInStripe')}
                      </>
                    )}
                  </Button>
                  <Button 
                    onClick={handleRefreshStatus}
                    disabled={loading || refreshing}
                    variant="outline"
                    size="icon"
                    title={t('account.refreshStatus')}
                  >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </>
            )}

            {isCuragoUser && (
              <Alert className="bg-curago/10 border-curago">
                <AlertDescription>
                  <p className="font-medium">🏢 {t('account.enterpriseTitle')}</p>
                  <p className="text-sm mt-1">
                    {t('account.enterpriseInfo')}
                  </p>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('account.featuresTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isPro || isCuragoUser ? 'bg-green-500' : 'bg-muted-foreground/40'}`} />
                <span className={isPro || isCuragoUser ? '' : 'text-muted-foreground'}>
                  {isPro || isCuragoUser ? t('account.unlimitedWorkshops') : t('account.activeWorkshops', { count: '1' })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>{t('account.unlimitedParticipants')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isPro || isCuragoUser ? 'bg-green-500' : 'bg-muted-foreground/40'}`} />
                <span className={isPro || isCuragoUser ? '' : 'text-muted-foreground'}>
                  {t('account.aiAnalysis')} {!isPro && !isCuragoUser && t('account.proOnly')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isPro || isCuragoUser ? 'bg-green-500' : 'bg-muted-foreground/40'}`} />
                <span className={isPro || isCuragoUser ? '' : 'text-muted-foreground'}>
                  {t('account.prioritySupport')} {!isPro && !isCuragoUser && t('account.proOnly')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AccountSettings;
