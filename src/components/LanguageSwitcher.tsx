import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';

export const LanguageSwitcher = () => {
  const { language, changeLanguage } = useTranslation();
  
  return (
    <div className="flex gap-2">
      <Button
        variant={language === 'sv' ? 'default' : 'outline'}
        size="sm"
        onClick={() => changeLanguage('sv')}
        className="min-w-[50px]"
      >
        SV
      </Button>
      <Button
        variant={language === 'en' ? 'default' : 'outline'}
        size="sm"
        onClick={() => changeLanguage('en')}
        className="min-w-[50px]"
      >
        EN
      </Button>
    </div>
  );
};
