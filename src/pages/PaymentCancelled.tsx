import { Link } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, ArrowLeft, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const PaymentCancelled = () => {
  const { t } = useLanguage();
  
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <Card className="border-2 border-orange-200 dark:border-orange-800 shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <XCircle className="w-20 h-20 text-orange-500" />
            </div>
            <CardTitle className="text-3xl font-bold text-orange-800 dark:text-orange-400">
              {t('payment.cancelled.title')}
            </CardTitle>
            <CardDescription className="text-lg mt-2">
              {t('payment.cancelled.description')}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="text-center space-y-6 pt-6">
            <p className="text-muted-foreground">
              {t('payment.cancelled.info')}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/upgrade">
                <Button className="bg-gradient-to-r from-accent to-secondary text-accent-foreground">
                  <Sparkles className="w-4 h-4 mr-2" />
                  {t('payment.cancelled.tryAgain')}
                </Button>
              </Link>
              
              <Link to="/dashboard">
                <Button variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t('payment.cancelled.backToDashboard')}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentCancelled;
