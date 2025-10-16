import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Lock, User, Shield, AlertCircle } from "lucide-react";
import {
  createFacilitator,
  validatePin,
  createSession,
  getAllFacilitators,
  isLockedOut,
  recordLoginAttempt,
  getRemainingAttempts,
  resetPinWithSecurityAnswer,
} from "@/utils/facilitatorStorage";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FacilitatorAuthProps {
  open: boolean;
  onAuthenticated: () => void;
}

type Mode = "select" | "login" | "register" | "forgot-pin";

const FacilitatorAuth = ({ open, onAuthenticated }: FacilitatorAuthProps) => {
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>("select");
  const [selectedFacilitatorId, setSelectedFacilitatorId] = useState("");
  
  // Register fields
  const [registerName, setRegisterName] = useState("");
  const [registerPin, setRegisterPin] = useState("");
  const [registerPinConfirm, setRegisterPinConfirm] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  
  // Login fields
  const [loginPin, setLoginPin] = useState("");
  
  // Forgot PIN fields
  const [forgotAnswer, setForgotAnswer] = useState("");
  const [newPin, setNewPin] = useState("");
  const [newPinConfirm, setNewPinConfirm] = useState("");
  
  const [loading, setLoading] = useState(false);

  const facilitators = getAllFacilitators();
  const lockedOut = isLockedOut();
  const remainingAttempts = getRemainingAttempts();

  const handleRegister = async () => {
    if (registerPin !== registerPinConfirm) {
      toast({
        title: "PIN-koderna matchar inte",
        description: "Kontrollera att båda PIN-koderna är identiska",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const result = await createFacilitator(
      registerName,
      registerPin,
      securityQuestion || undefined,
      securityAnswer || undefined
    );
    setLoading(false);

    if (result.success && result.facilitator) {
      await createSession(result.facilitator.id);
      toast({
        title: "Välkommen!",
        description: "Ditt facilitator-konto har skapats",
      });
      onAuthenticated();
    } else {
      toast({
        title: "Registrering misslyckades",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  const handleLogin = async () => {
    if (lockedOut) {
      toast({
        title: "Kontot är låst",
        description: "Försök igen om 5 minuter",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const isValid = await validatePin(selectedFacilitatorId, loginPin);
    setLoading(false);

    recordLoginAttempt(isValid);

    if (isValid) {
      await createSession(selectedFacilitatorId);
      toast({
        title: "Inloggad!",
        description: "Välkommen tillbaka",
      });
      onAuthenticated();
    } else {
      const remaining = getRemainingAttempts();
      toast({
        title: "Felaktig PIN-kod",
        description: remaining > 0 
          ? `${remaining} försök kvar` 
          : "Kontot är nu låst i 5 minuter",
        variant: "destructive",
      });
      setLoginPin("");
    }
  };

  const handleForgotPin = async () => {
    if (newPin !== newPinConfirm) {
      toast({
        title: "PIN-koderna matchar inte",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const result = await resetPinWithSecurityAnswer(
      selectedFacilitatorId,
      forgotAnswer,
      newPin
    );
    setLoading(false);

    if (result.success) {
      toast({
        title: "PIN återställd!",
        description: "Du kan nu logga in med din nya PIN",
      });
      setMode("login");
      setForgotAnswer("");
      setNewPin("");
      setNewPinConfirm("");
    } else {
      toast({
        title: "Återställning misslyckades",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  const renderSelect = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Facilitator Inloggning
        </DialogTitle>
        <DialogDescription>
          Välj ditt konto eller skapa ett nytt
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        {facilitators.length > 0 && (
          <div className="space-y-2">
            <Label>Välj facilitator</Label>
            {facilitators.map((facilitator) => (
              <Button
                key={facilitator.id}
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  setSelectedFacilitatorId(facilitator.id);
                  setMode("login");
                }}
              >
                <User className="w-4 h-4 mr-2" />
                {facilitator.name}
              </Button>
            ))}
          </div>
        )}

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              {facilitators.length > 0 ? "Eller" : "Kom igång"}
            </span>
          </div>
        </div>

        <Button
          onClick={() => setMode("register")}
          className="w-full"
          variant="default"
        >
          Skapa nytt facilitator-konto
        </Button>
      </div>
    </>
  );

  const renderLogin = () => {
    const facilitator = facilitators.find(f => f.id === selectedFacilitatorId);
    
    return (
      <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            Ange PIN-kod
          </DialogTitle>
          <DialogDescription>
            Logga in som {facilitator?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {lockedOut && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                För många felaktiga försök. Kontot är låst i 5 minuter.
              </AlertDescription>
            </Alert>
          )}

          {!lockedOut && remainingAttempts < 3 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {remainingAttempts} försök kvar innan kontot låses
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="login-pin">PIN-kod (4-6 siffror)</Label>
            <Input
              id="login-pin"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={loginPin}
              onChange={(e) => setLoginPin(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && loginPin.length >= 4) {
                  handleLogin();
                }
              }}
              placeholder="••••"
              disabled={lockedOut || loading}
              className="text-center text-2xl tracking-widest"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => {
                setMode("select");
                setLoginPin("");
              }}
              variant="outline"
              className="flex-1"
            >
              Tillbaka
            </Button>
            <Button
              onClick={handleLogin}
              disabled={loginPin.length < 4 || lockedOut || loading}
              className="flex-1"
            >
              Logga in
            </Button>
          </div>

          {facilitator?.securityQuestion && (
            <Button
              variant="link"
              className="w-full text-sm"
              onClick={() => setMode("forgot-pin")}
            >
              Glömt PIN-kod?
            </Button>
          )}
        </div>
      </>
    );
  };

  const renderRegister = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          Skapa Facilitator-konto
        </DialogTitle>
        <DialogDescription>
          Fyll i dina uppgifter för att komma igång
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="name">Namn / Företag (valfritt)</Label>
          <Input
            id="name"
            value={registerName}
            onChange={(e) => setRegisterName(e.target.value)}
            placeholder="T.ex. Anna Andersson"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pin">Skapa PIN-kod (4-6 siffror) *</Label>
          <Input
            id="pin"
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={registerPin}
            onChange={(e) => setRegisterPin(e.target.value.replace(/\D/g, ""))}
            placeholder="••••"
            className="text-center text-2xl tracking-widest"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pin-confirm">Bekräfta PIN-kod *</Label>
          <Input
            id="pin-confirm"
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={registerPinConfirm}
            onChange={(e) => setRegisterPinConfirm(e.target.value.replace(/\D/g, ""))}
            placeholder="••••"
            className="text-center text-2xl tracking-widest"
          />
        </div>

        <div className="border-t pt-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Säkerhetsfråga (valfritt, för att återställa PIN)
          </p>
          
          <div className="space-y-2">
            <Label htmlFor="security-question">Fråga</Label>
            <Input
              id="security-question"
              value={securityQuestion}
              onChange={(e) => setSecurityQuestion(e.target.value)}
              placeholder="T.ex. Vad heter ditt första husdjur?"
            />
          </div>

          {securityQuestion && (
            <div className="space-y-2">
              <Label htmlFor="security-answer">Svar</Label>
              <Input
                id="security-answer"
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                placeholder="Ditt svar"
              />
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => setMode("select")}
            variant="outline"
            className="flex-1"
          >
            Avbryt
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
            Skapa konto
          </Button>
        </div>
      </div>
    </>
  );

  const renderForgotPin = () => {
    const facilitator = facilitators.find(f => f.id === selectedFacilitatorId);
    
    return (
      <>
        <DialogHeader>
          <DialogTitle>Återställ PIN-kod</DialogTitle>
          <DialogDescription>
            Svara på säkerhetsfrågan för att skapa en ny PIN
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Säkerhetsfråga</Label>
            <p className="text-sm font-medium">{facilitator?.securityQuestion}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="security-answer">Ditt svar</Label>
            <Input
              id="security-answer"
              value={forgotAnswer}
              onChange={(e) => setForgotAnswer(e.target.value)}
              placeholder="Ange ditt svar"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-pin">Ny PIN-kod (4-6 siffror)</Label>
            <Input
              id="new-pin"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
              className="text-center text-2xl tracking-widest"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-pin-confirm">Bekräfta ny PIN-kod</Label>
            <Input
              id="new-pin-confirm"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={newPinConfirm}
              onChange={(e) => setNewPinConfirm(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
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
              Avbryt
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
              Återställ PIN
            </Button>
          </div>
        </div>
      </>
    );
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        {mode === "select" && renderSelect()}
        {mode === "login" && renderLogin()}
        {mode === "register" && renderRegister()}
        {mode === "forgot-pin" && renderForgotPin()}
      </DialogContent>
    </Dialog>
  );
};

export default FacilitatorAuth;
