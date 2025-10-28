import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSubscription } from '@/hooks/useSubscription';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, CreditCard, AlertCircle, ExternalLink, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

const AccountSettings = () => {
  const { profile, isPro, isFree, isCuragoUser } = useSubscription();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);

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
      alert('Något gick fel. Försök igen.');
    } finally {
      setLoading(false);
    }
  };

  const getPlanBadge = () => {
    if (isCuragoUser) {
      return <Badge className="bg-[#5A9BD5] text-white">🏢 Curago Enterprise</Badge>;
    }
    if (isPro) {
      return <Badge className="bg-gradient-to-r from-[#F1916D] to-[#AE7DAC] text-white">⭐ Pro</Badge>;
    }
    return <Badge variant="secondary">🆓 Free</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F3DADF] to-white">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold mb-8">Konto & Prenumeration</h1>

        {/* Account Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Din profil</CardTitle>
            <CardDescription>Kontoinformation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Namn</label>
              <p className="text-lg">{user?.firstName} {user?.lastName || ''}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">E-post</label>
              <p className="text-lg">{user?.primaryEmailAddress?.emailAddress}</p>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Din prenumeration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-2">Nuvarande plan</label>
                {getPlanBadge()}
              </div>
              
              {isPro && profile?.subscription_current_period_end && (
                <div className="text-right">
                  <label className="text-sm font-medium text-muted-foreground block mb-1">Nästa betalning</label>
                  <p className="text-sm">
                    {format(new Date(profile.subscription_current_period_end), 'PPP', { locale: sv })}
                  </p>
                </div>
              )}
            </div>

            {/* Free User - Upgrade CTA */}
            {isFree && (
              <>
                <Alert>
                  <Sparkles className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Uppgradera till Pro</strong> för obegränsat workshops, AI-analys och prioriterad support!
                  </AlertDescription>
                </Alert>
                
                <Link to="/upgrade">
                  <Button className="w-full bg-gradient-to-r from-[#F1916D] to-[#AE7DAC] text-white">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Se Pro-planer
                  </Button>
                </Link>
              </>
            )}

            {/* Pro User (Stripe) - Manage Subscription */}
            {isPro && profile?.plan_source === 'stripe' && (
              <>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="space-y-2">
                    <p className="font-medium">📋 Hantera din prenumeration</p>
                    <p className="text-sm">Du kan när som helst:</p>
                    <ul className="text-sm list-disc list-inside space-y-1 ml-2">
                      <li>Avbryta din prenumeration (du behåller Pro till periodens slut)</li>
                      <li>Ändra från månadsvis till årlig betalning (eller tvärtom)</li>
                      <li>Uppdatera betalningsmetod</li>
                      <li>Se alla dina fakturor</li>
                    </ul>
                    <p className="text-sm text-muted-foreground mt-2">
                      ⚠️ <strong>Vid avbokning:</strong> Du behåller Pro-funktioner till{' '}
                      {profile?.subscription_current_period_end && 
                        format(new Date(profile.subscription_current_period_end), 'PPP', { locale: sv })}, 
                      därefter nedgraderas du automatiskt till Free (max 1 workshop).
                    </p>
                  </AlertDescription>
                </Alert>

                <Button 
                  onClick={handleManageSubscription}
                  disabled={loading}
                  className="w-full"
                  variant="outline"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Öppnar...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Hantera prenumeration i Stripe
                    </>
                  )}
                </Button>
              </>
            )}

            {/* Curago Enterprise User */}
            {isCuragoUser && (
              <Alert className="bg-[#5A9BD5]/10 border-[#5A9BD5]">
                <AlertDescription>
                  <p className="font-medium">🏢 Curago Enterprise</p>
                  <p className="text-sm mt-1">
                    Din prenumeration hanteras av din organisation. 
                    Kontakta din administratör för ändringar.
                  </p>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Plan Features */}
        <Card>
          <CardHeader>
            <CardTitle>Funktioner i din plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isPro || isCuragoUser ? 'bg-green-500' : 'bg-gray-400'}`} />
                <span className={isPro || isCuragoUser ? '' : 'text-muted-foreground'}>
                  {isPro || isCuragoUser ? 'Obegränsat' : 'Max 1'} aktiv workshop
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>Obegränsat deltagare</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isPro || isCuragoUser ? 'bg-green-500' : 'bg-gray-400'}`} />
                <span className={isPro || isCuragoUser ? '' : 'text-muted-foreground'}>
                  AI-analys av resultat
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isPro || isCuragoUser ? 'bg-green-500' : 'bg-gray-400'}`} />
                <span className={isPro || isCuragoUser ? '' : 'text-muted-foreground'}>
                  Prioriterad support
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
