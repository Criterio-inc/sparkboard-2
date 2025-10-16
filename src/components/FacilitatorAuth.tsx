import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Lock, User, Shield, AlertCircle } from "lucide-react";
import {
  createFacilitatorInBackend,
  getFacilitatorByName,
  validatePinById,
  createSession,
  isLockedOut,
  recordLoginAttempt,
  getRemainingAttempts,
  resetPinWithSecurityAnswer,
} from "@/utils/facilitatorStorage";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTranslation } from "react-i18next";

interface FacilitatorAuthProps {
  open: boolean;
  onAuthenticated: () => void;
}

type Mode = "login" | "register" | "forgot-pin";

const FacilitatorAuth = ({ open, onAuthenticated }: FacilitatorAuthProps) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>("login");
  const [selectedFacilitator, setSelectedFacilitator] = useState<any>(null);
  
  // Register fields
  const [registerName, setRegisterName] = useState("");
  const [registerPin, setRegisterPin] = useState("");
  const [registerPinConfirm, setRegisterPinConfirm] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  
  // Login fields
  const [loginName, setLoginName] = useState("");
  const [loginPin, setLoginPin] = useState("");
  
  // Forgot PIN fields
  const [forgotAnswer, setForgotAnswer] = useState("");
  const [newPin, setNewPin] = useState("");
  const [newPinConfirm, setNewPinConfirm] = useState("");
  
  const [loading, setLoading] = useState(false);

  const lockedOut = isLockedOut();
  const remainingAttempts = getRemainingAttempts();

  const handleRegister = async () => {
    if (registerPin !== registerPinConfirm) {
      toast({
        title: t('facilitatorAuth.pinMismatch'),
        description: t('facilitatorAuth.pinMismatchDesc'),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const result = await createFacilitatorInBackend(
      registerName,
      registerPin,
      securityQuestion || undefined,
      securityAnswer || undefined
    );
    setLoading(false);

    if (result.success && result.facilitator) {
      await createSession(result.facilitator.id);
      toast({
        title: t('facilitatorAuth.welcome'),
        description: t('facilitatorAuth.welcomeDesc'),
      });
      onAuthenticated();
    } else {
      toast({
        title: t('facilitatorAuth.registerFailed'),
        description: result.error,
        variant: "destructive",
      });
    }
  };

  const handleLogin = async () => {
    if (lockedOut) {
      toast({
        title: t('facilitatorAuth.accountLocked'),
        description: t('facilitatorAuth.accountLockedDesc'),
        variant: "destructive",
      });
      return;
    }

    if (!loginName.trim()) {
      toast({
        title: t('facilitatorAuth.nameRequired'),
        description: t('facilitatorAuth.nameRequiredDesc'),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    // Fetch facilitator by name
    const facilitator = await getFacilitatorByName(loginName);
    
    if (!facilitator) {
      setLoading(false);
      toast({
        title: t('facilitatorAuth.accountNotFound'),
        description: t('facilitatorAuth.accountNotFoundDesc'),
        variant: "destructive",
      });
      return;
    }

    const isValid = await validatePinById(facilitator.id, loginPin);
    setLoading(false);

    recordLoginAttempt(isValid);

    if (isValid) {
      await createSession(facilitator.id);
      toast({
        title: t('facilitatorAuth.loggedIn'),
        description: t('facilitatorAuth.welcomeBack'),
      });
      onAuthenticated();
    } else {
      const remaining = getRemainingAttempts();
      toast({
        title: t('facilitatorAuth.incorrectPin'),
        description: remaining > 0 
          ? t('facilitatorAuth.attemptsLeft', { count: remaining })
          : t('facilitatorAuth.accountNowLocked'),
        variant: "destructive",
      });
      setLoginPin("");
    }
  };

  const handleForgotPin = async () => {
    if (newPin !== newPinConfirm) {
      toast({
        title: t('facilitatorAuth.pinMismatch'),
        variant: "destructive",
      });
      return;
    }

    if (!selectedFacilitator) {
      toast({
        title: t('facilitatorAuth.noAccountSelected'),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const result = await resetPinWithSecurityAnswer(
      selectedFacilitator.id,
      forgotAnswer,
      newPin
    );
    setLoading(false);

    if (result.success) {
      toast({
        title: t('facilitatorAuth.pinReset'),
        description: t('facilitatorAuth.pinResetDesc'),
      });
      setMode("login");
      setForgotAnswer("");
      setNewPin("");
      setNewPinConfirm("");
      setSelectedFacilitator(null);
    } else {
      toast({
        title: t('facilitatorAuth.resetFailed'),
        description: result.error,
        variant: "destructive",
      });
    }
  };

  const renderLogin = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-primary" />
          {t('facilitatorAuth.loginTitle')}
        </DialogTitle>
        <DialogDescription>
          {t('facilitatorAuth.loginDescription')}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        {lockedOut && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('facilitatorAuth.lockedOut')}
            </AlertDescription>
          </Alert>
        )}

        {!lockedOut && remainingAttempts < 3 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('facilitatorAuth.attemptsRemaining', { count: remainingAttempts })}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="login-name">{t('facilitatorAuth.name')}</Label>
          <Input
            id="login-name"
            type="text"
            value={loginName}
            onChange={(e) => setLoginName(e.target.value)}
            placeholder={t('facilitatorAuth.namePlaceholder')}
            disabled={lockedOut || loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="login-pin">{t('facilitatorAuth.pin')}</Label>
          <Input
            id="login-pin"
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={loginPin}
            onChange={(e) => setLoginPin(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && loginPin.length >= 4 && loginName.trim()) {
                handleLogin();
              }
            }}
            placeholder={t('facilitatorAuth.pinPlaceholder')}
            disabled={lockedOut || loading}
            className="text-center text-2xl tracking-widest"
          />
        </div>

        <Button
          onClick={handleLogin}
          disabled={loginPin.length < 4 || !loginName.trim() || lockedOut || loading}
          className="w-full"
        >
          {t('facilitatorAuth.loginButton')}
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              {t('facilitatorAuth.or')}
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => setMode("register")}
        >
          {t('facilitatorAuth.createAccount')}
        </Button>
      </div>
    </>
  );

  const renderRegister = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          {t('facilitatorAuth.registerTitle')}
        </DialogTitle>
        <DialogDescription>
          {t('facilitatorAuth.registerDescription')}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="name">{t('facilitatorAuth.nameOptional')}</Label>
          <Input
            id="name"
            value={registerName}
            onChange={(e) => setRegisterName(e.target.value)}
            placeholder={t('facilitatorAuth.nameOptionalPlaceholder')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pin">{t('facilitatorAuth.createPin')}</Label>
          <Input
            id="pin"
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={registerPin}
            onChange={(e) => setRegisterPin(e.target.value.replace(/\D/g, ""))}
            placeholder={t('facilitatorAuth.pinPlaceholder')}
            className="text-center text-2xl tracking-widest"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pin-confirm">{t('facilitatorAuth.confirmPin')}</Label>
          <Input
            id="pin-confirm"
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={registerPinConfirm}
            onChange={(e) => setRegisterPinConfirm(e.target.value.replace(/\D/g, ""))}
            placeholder={t('facilitatorAuth.pinPlaceholder')}
            className="text-center text-2xl tracking-widest"
          />
        </div>

        <div className="border-t pt-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('facilitatorAuth.securityInfo')}
          </p>
          
          <div className="space-y-2">
            <Label htmlFor="security-question">{t('facilitatorAuth.securityQuestion')}</Label>
            <Input
              id="security-question"
              value={securityQuestion}
              onChange={(e) => setSecurityQuestion(e.target.value)}
              placeholder={t('facilitatorAuth.securityQuestionPlaceholder')}
            />
          </div>

          {securityQuestion && (
            <div className="space-y-2">
              <Label htmlFor="security-answer">{t('facilitatorAuth.securityAnswer')}</Label>
              <Input
                id="security-answer"
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                placeholder={t('facilitatorAuth.securityAnswerPlaceholder')}
              />
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => setMode("login")}
            variant="outline"
            className="flex-1"
          >
            {t('facilitatorAuth.cancel')}
          </Button>
          <Button
            onClick={handleRegister}
            disabled={
              registerPin.length < 4 ||
              registerPin !== registerPinConfirm ||
              loading
            }
            className="flex-1"
          >
            {t('facilitatorAuth.createAccountButton')}
          </Button>
        </div>
      </div>
    </>
  );

  const renderForgotPin = () => (
    <>
      <DialogHeader>
        <DialogTitle>{t('facilitatorAuth.resetPinTitle')}</DialogTitle>
        <DialogDescription>
          {t('facilitatorAuth.resetPinDescription')}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label>{t('facilitatorAuth.securityQuestionLabel')}</Label>
          <p className="text-sm font-medium">{selectedFacilitator?.securityQuestion}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="security-answer">{t('facilitatorAuth.yourAnswer')}</Label>
          <Input
            id="security-answer"
            value={forgotAnswer}
            onChange={(e) => setForgotAnswer(e.target.value)}
            placeholder={t('facilitatorAuth.yourAnswerPlaceholder')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="new-pin">{t('facilitatorAuth.newPin')}</Label>
          <Input
            id="new-pin"
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
            placeholder={t('facilitatorAuth.pinPlaceholder')}
            className="text-center text-2xl tracking-widest"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="new-pin-confirm">{t('facilitatorAuth.confirmNewPin')}</Label>
          <Input
            id="new-pin-confirm"
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={newPinConfirm}
            onChange={(e) => setNewPinConfirm(e.target.value.replace(/\D/g, ""))}
            placeholder={t('facilitatorAuth.pinPlaceholder')}
            className="text-center text-2xl tracking-widest"
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => {
              setMode("login");
              setForgotAnswer("");
              setNewPin("");
              setNewPinConfirm("");
            }}
            variant="outline"
            className="flex-1"
          >
            {t('facilitatorAuth.cancel')}
          </Button>
          <Button
            onClick={handleForgotPin}
            disabled={
              !forgotAnswer ||
              newPin.length < 4 ||
              newPin !== newPinConfirm ||
              loading
            }
            className="flex-1"
          >
            {t('facilitatorAuth.resetButton')}
          </Button>
        </div>
      </div>
    </>
  );

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        {mode === "login" && renderLogin()}
        {mode === "register" && renderRegister()}
        {mode === "forgot-pin" && renderForgotPin()}
      </DialogContent>
    </Dialog>
  );
};

export default FacilitatorAuth;
