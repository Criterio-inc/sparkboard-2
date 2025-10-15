export interface Facilitator {
  id: string;
  name: string;
  pinHash: string;
  createdAt: string;
  securityQuestion?: string;
  securityAnswerHash?: string;
}

const FACILITATORS_KEY = "facilitators";
const CURRENT_SESSION_KEY = "current_facilitator_session";
const LOGIN_ATTEMPTS_KEY = "login_attempts";
const LOCKOUT_KEY = "facilitator_lockout";

const SESSION_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours
const LOCKOUT_DURATION = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 3;

// Simple hash function for PIN (not cryptographically secure, but sufficient for localStorage)
const hashPin = async (pin: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const getAllFacilitators = (): Facilitator[] => {
  try {
    const data = localStorage.getItem(FACILITATORS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Failed to load facilitators:", error);
    return [];
  }
};

export const createFacilitator = async (
  name: string,
  pin: string,
  securityQuestion?: string,
  securityAnswer?: string
): Promise<{ success: boolean; facilitator?: Facilitator; error?: string }> => {
  if (pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
    return { success: false, error: "PIN måste vara 4-6 siffror" };
  }

  const facilitators = getAllFacilitators();
  const pinHash = await hashPin(pin);
  
  const newFacilitator: Facilitator = {
    id: `facilitator-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    name: name.trim() || "Facilitator",
    pinHash,
    createdAt: new Date().toISOString(),
    securityQuestion,
    securityAnswerHash: securityAnswer ? await hashPin(securityAnswer.toLowerCase().trim()) : undefined,
  };

  facilitators.push(newFacilitator);
  localStorage.setItem(FACILITATORS_KEY, JSON.stringify(facilitators));

  return { success: true, facilitator: newFacilitator };
};

export const validatePin = async (facilitatorId: string, pin: string): Promise<boolean> => {
  const facilitators = getAllFacilitators();
  const facilitator = facilitators.find(f => f.id === facilitatorId);
  
  if (!facilitator) return false;
  
  const pinHash = await hashPin(pin);
  return pinHash === facilitator.pinHash;
};

export const isLockedOut = (): boolean => {
  const lockout = localStorage.getItem(LOCKOUT_KEY);
  if (!lockout) return false;
  
  const lockoutTime = parseInt(lockout, 10);
  const now = Date.now();
  
  if (now - lockoutTime < LOCKOUT_DURATION) {
    return true;
  }
  
  localStorage.removeItem(LOCKOUT_KEY);
  localStorage.removeItem(LOGIN_ATTEMPTS_KEY);
  return false;
};

export const recordLoginAttempt = (success: boolean): void => {
  if (success) {
    localStorage.removeItem(LOGIN_ATTEMPTS_KEY);
    localStorage.removeItem(LOCKOUT_KEY);
    return;
  }

  const attempts = parseInt(localStorage.getItem(LOGIN_ATTEMPTS_KEY) || "0", 10);
  const newAttempts = attempts + 1;
  
  localStorage.setItem(LOGIN_ATTEMPTS_KEY, newAttempts.toString());
  
  if (newAttempts >= MAX_ATTEMPTS) {
    localStorage.setItem(LOCKOUT_KEY, Date.now().toString());
  }
};

export const getRemainingAttempts = (): number => {
  const attempts = parseInt(localStorage.getItem(LOGIN_ATTEMPTS_KEY) || "0", 10);
  return Math.max(0, MAX_ATTEMPTS - attempts);
};

export const createSession = (facilitatorId: string): void => {
  const session = {
    facilitatorId,
    timestamp: Date.now(),
  };
  sessionStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(session));
};

export const getCurrentSession = (): { facilitatorId: string; timestamp: number } | null => {
  try {
    const data = sessionStorage.getItem(CURRENT_SESSION_KEY);
    if (!data) return null;
    
    const session = JSON.parse(data);
    const now = Date.now();
    
    if (now - session.timestamp > SESSION_TIMEOUT) {
      clearSession();
      return null;
    }
    
    return session;
  } catch (error) {
    console.error("Failed to get session:", error);
    return null;
  }
};

export const getCurrentFacilitator = (): Facilitator | null => {
  const session = getCurrentSession();
  if (!session) return null;
  
  const facilitators = getAllFacilitators();
  return facilitators.find(f => f.id === session.facilitatorId) || null;
};

export const clearSession = (): void => {
  sessionStorage.removeItem(CURRENT_SESSION_KEY);
};

export const updateSessionTimestamp = (): void => {
  const session = getCurrentSession();
  if (session) {
    session.timestamp = Date.now();
    sessionStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(session));
  }
};

export const resetPinWithSecurityAnswer = async (
  facilitatorId: string,
  securityAnswer: string,
  newPin: string
): Promise<{ success: boolean; error?: string }> => {
  const facilitators = getAllFacilitators();
  const index = facilitators.findIndex(f => f.id === facilitatorId);
  
  if (index === -1) {
    return { success: false, error: "Facilitator hittades inte" };
  }
  
  const facilitator = facilitators[index];
  
  if (!facilitator.securityAnswerHash) {
    return { success: false, error: "Ingen säkerhetsfråga konfigurerad" };
  }
  
  const answerHash = await hashPin(securityAnswer.toLowerCase().trim());
  
  if (answerHash !== facilitator.securityAnswerHash) {
    return { success: false, error: "Felaktigt svar på säkerhetsfrågan" };
  }
  
  if (newPin.length < 4 || newPin.length > 6 || !/^\d+$/.test(newPin)) {
    return { success: false, error: "PIN måste vara 4-6 siffror" };
  }
  
  facilitator.pinHash = await hashPin(newPin);
  localStorage.setItem(FACILITATORS_KEY, JSON.stringify(facilitators));
  
  return { success: true };
};
