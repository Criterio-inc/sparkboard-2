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
import { useLanguage } from "@/contexts/LanguageContext";

interface FacilitatorAuthProps {
  open: boolean;
  onAuthenticated: () => void;
}

type Mode = "login" | "register" | "forgot-pin";

const FacilitatorAuth = ({ open, onAuthenticated }: FacilitatorAuthProps) => {
  const { toast } = useToast();
  const { t } = useLanguage();
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
        title: t('auth.pinMismatch'),
        description: t('auth.pinMismatchDesc'),
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
        title: t('auth.welcome'),
        description: t('auth.welcomeDesc'),
      });
      onAuthenticated();
    } else {
      toast({
        title: t('auth.registerFailed'),
        description: result.error,
        variant: "destructive",
      });
    }
  };

  const handleLogin = async () => {
    if (lockedOut) {
      toast({
        title: t('auth.accountLocked'),
        description: t('auth.accountLockedDesc'),
        variant: "destructive",
      });
      return;
    }

    if (!loginName.trim()) {
      toast({
        title: t('auth.nameRequired'),
        description: t('auth.nameRequiredDesc'),
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
        title: t('auth.accountNotFound'),
        description: t('auth.accountNotFoundDesc'),
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
        title: t('auth.loggedIn'),
        description: t('auth.welcomeBack'),
      });
      onAuthenticated();
    } else {
      const remaining = getRemainingAttempts();
      toast({
        title: t('auth.incorrectPin'),
        description: remaining > 0 
          ? t('auth.attemptsLeft', { count: remaining.toString() })
          : t('auth.accountNowLocked'),
        variant: "destructive",
      });
      setLoginPin("");
    }
  };

  const handleForgotPin = async () => {
    if (newPin !== newPinConfirm) {
      toast({
        title: t('auth.pinMismatch'),
        variant: "destructive",
      });
      return;
    }

    if (!selectedFacilitator) {
      toast({
        title: t('auth.noAccountSelected'),
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
        title: t('auth.pinReset'),
        description: t('auth.pinResetDesc'),
      });
      setMode("login");
      setForgotAnswer("");
      setNewPin("");
      setNewPinConfirm("");
      setSelectedFacilitator(null);
    } else {
      toast({
        title: t('auth.resetFailed'),
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
          {t('auth.loginTitle')}
        </DialogTitle>
        <DialogDescription>
          {t('auth.loginDescription')}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        {lockedOut && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('auth.lockedOut')}
            </AlertDescription>
          </Alert>
        )}

        {!lockedOut && remainingAttempts < 3 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('auth.attemptsRemaining', { count: remainingAttempts.toString() })}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="login-name">{t('auth.name')}</Label>
          <Input
            id="login-name"
            type="text"
            value={loginName}
            onChange={(e) => setLoginName(e.target.value)}
            placeholder={t('auth.namePlaceholder')}
            disabled={lockedOut || loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="login-pin">{t('auth.pin')}</Label>
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
            placeholder={t('auth.pinPlaceholder')}
            disabled={lockedOut || loading}
            className="text-center text-2xl tracking-widest"
          />
        </div>

        <Button
          onClick={handleLogin}
          disabled={loginPin.length < 4 || !loginName.trim() || lockedOut || loading}
          className="w-full"
        >
          {t('auth.loginButton')}
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              {t('auth.or')}
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => setMode("register")}
        >
          {t('auth.createAccount')}
        </Button>
      </div>
    </>
  );

  const renderRegister = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          {t('auth.registerTitle')}
        </DialogTitle>
        <DialogDescription>
          {t('auth.registerDescription')}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="name">{t('auth.nameOptional')}</Label>
          <Input
            id="name"
            value={registerName}
            onChange={(e) => setRegisterName(e.target.value)}
            placeholder={t('auth.nameOptionalPlaceholder')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pin">{t('auth.createPin')}</Label>
          <Input
            id="pin"
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={registerPin}
            onChange={(e) => setRegisterPin(e.target.value.replace(/\D/g, ""))}
            placeholder={t('auth.pinPlaceholder')}
            className="text-center text-2xl tracking-widest"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pin-confirm">{t('auth.confirmPin')}</Label>
          <Input
            id="pin-confirm"
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={registerPinConfirm}
            onChange={(e) => setRegisterPinConfirm(e.target.value.replace(/\D/g, ""))}
            placeholder={t('auth.pinPlaceholder')}
            className="text-center text-2xl tracking-widest"
          />
        </div>

        <div className="border-t pt-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('auth.securityInfo')}
          </p>
          
          <div className="space-y-2">
            <Label htmlFor="security-question">{t('auth.securityQuestion')}</Label>
            <Input
              id="security-question"
              value={securityQuestion}
              onChange={(e) => setSecurityQuestion(e.target.value)}
              placeholder={t('auth.securityQuestionPlaceholder')}
            />
          </div>

          {securityQuestion && (
            <div className="space-y-2">
              <Label htmlFor="security-answer">{t('auth.securityAnswer')}</Label>
              <Input
                id="security-answer"
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                placeholder={t('auth.securityAnswerPlaceholder')}
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
            {t('auth.cancel')}
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
            {t('auth.createAccountButton')}
          </Button>
        </div>
      </div>
    </>
  );

  const renderForgotPin = () => (
    <>
      <DialogHeader>
        <DialogTitle>{t('auth.resetPinTitle')}</DialogTitle>
        <DialogDescription>
          {t('auth.resetPinDescription')}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label>{t('auth.securityQuestionLabel')}</Label>
          <p className="text-sm font-medium">{selectedFacilitator?.securityQuestion}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="security-answer">{t('auth.yourAnswer')}</Label>
          <Input
            id="security-answer"
            value={forgotAnswer}
            onChange={(e) => setForgotAnswer(e.target.value)}
            placeholder={t('auth.yourAnswerPlaceholder')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="new-pin">{t('auth.newPin')}</Label>
          <Input
            id="new-pin"
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
            placeholder={t('auth.pinPlaceholder')}
            className="text-center text-2xl tracking-widest"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="new-pin-confirm">{t('auth.confirmNewPin')}</Label>
          <Input
            id="new-pin-confirm"
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={newPinConfirm}
            onChange={(e) => setNewPinConfirm(e.target.value.replace(/\D/g, ""))}
            placeholder={t('auth.pinPlaceholder')}
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
            {t('auth.cancel')}
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
            {t('auth.resetButton')}
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
