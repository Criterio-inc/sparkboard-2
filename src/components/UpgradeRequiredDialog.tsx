import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface UpgradeRequiredDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UpgradeRequiredDialog = ({ open, onOpenChange }: UpgradeRequiredDialogProps) => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <AlertDialogTitle>{t('upgradeRequired.title')}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-left space-y-3">
            <p>
              {t('upgradeRequired.limitReached')}
            </p>
            <p className="font-medium">
              {t('upgradeRequired.unlockFeatures')}
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>{t('upgradeRequired.unlimitedWorkshops')}</li>
              <li>{t('upgradeRequired.unlimitedParticipants')}</li>
              <li>{t('upgradeRequired.aiAnalysis')}</li>
              <li>{t('upgradeRequired.prioritySupport')}</li>
            </ul>
            <p className="text-sm font-bold text-primary">
              {t('upgradeRequired.price')}
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('upgradeRequired.cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={() => navigate('/upgrade')}>
            {t('upgradeRequired.seePlans')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
