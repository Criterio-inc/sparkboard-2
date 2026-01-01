import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface WorkshopQRDialogProps {
  code: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WorkshopQRDialog = ({ code, open, onOpenChange }: WorkshopQRDialogProps) => {
  const { t } = useLanguage();

  const getJoinUrl = () => {
    return `${window.location.origin}/join?code=${code}`;
  };

  const downloadQRCode = () => {
    const svg = document.getElementById("qr-code-svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");

      const downloadLink = document.createElement("a");
      downloadLink.download = `workshop-${code}-qr.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('qr.title')}</DialogTitle>
          <DialogDescription>
            {t('qr.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="text-center">
            <div className="inline-block p-4 bg-white rounded-lg">
              <QRCodeSVG id="qr-code-svg" value={getJoinUrl()} size={200} />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadQRCode}
              className="mt-2"
            >
              {t('qr.download')}
            </Button>
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">{t('qr.code')}</p>
            <p className="text-4xl font-bold font-mono tracking-wider text-primary">
              {code}
            </p>
          </div>

          <div className="space-y-2">
            <Label>{t('qr.participantLink')}</Label>
            <div className="flex gap-2">
              <Input value={getJoinUrl()} readOnly className="font-mono text-sm" />
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(getJoinUrl());
                  toast({
                    title: t('qr.copied'),
                    description: t('qr.copiedDesc'),
                  });
                }}
              >
                {t('qr.copy')}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
