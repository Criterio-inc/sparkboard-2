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

interface UpgradeRequiredDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UpgradeRequiredDialog = ({ open, onOpenChange }: UpgradeRequiredDialogProps) => {
  const navigate = useNavigate();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <AlertDialogTitle>Uppgradera till Pro</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-left space-y-3">
            <p>
              Du har nått gränsen för gratis-planen (1 aktiv workshop).
            </p>
            <p className="font-medium">
              Uppgradera till Pro för att skapa obegränsat med workshops:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Obegränsat workshops</li>
              <li>Obegränsat deltagare</li>
              <li>AI-analys av resultat</li>
              <li>Prioriterad support</li>
            </ul>
            <p className="text-sm font-bold text-primary">
              Från endast 99 SEK/månad
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Avbryt</AlertDialogCancel>
          <AlertDialogAction onClick={() => navigate('/upgrade')}>
            Se planer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};