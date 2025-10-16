import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';

export const LanguageSwitcher = () => {
  const { language, setLanguage } = useLanguage();
  
  return (
    <div className="flex items-center gap-2">
      <Globe className="w-4 h-4 text-muted-foreground" />
      <div className="flex gap-1 border rounded-lg p-1">
        <Button
          variant={language === 'sv' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setLanguage('sv')}
          className="h-8 px-3"
        >
          SV
        </Button>
        <Button
          variant={language === 'en' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setLanguage('en')}
          className="h-8 px-3"
        >
          EN
        </Button>
      </div>
    </div>
  );
};
