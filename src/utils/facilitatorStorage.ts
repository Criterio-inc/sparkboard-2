import { supabase } from "@/integrations/supabase/client";

export interface Facilitator {
  id: string;
  name: string;
  pinHash: string;
  createdAt: string;
  securityQuestion?: string;
  securityAnswerHash?: string;
}

const FACILITATORS_KEY = "facilitators";
const SESSION_TOKEN_KEY = "facilitator_session_token";
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

export const createSession = async (facilitatorId: string): Promise<void> => {
  // Generate unique session token
  const sessionToken = `${facilitatorId}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  const expiresAt = new Date(Date.now() + SESSION_TIMEOUT);

  // Store session in Supabase
  const { error } = await supabase
    .from('facilitator_sessions')
    .insert({
      facilitator_id: facilitatorId,
      session_token: sessionToken,
      expires_at: expiresAt.toISOString(),
    });

  if (error) {
    console.error("Failed to create session:", error);
    return;
  }

  // Store session token in localStorage (shared across tabs in same browser)
  localStorage.setItem(SESSION_TOKEN_KEY, sessionToken);
};

export const getCurrentSession = async (): Promise<{ facilitatorId: string; timestamp: number } | null> => {
  try {
    const sessionToken = localStorage.getItem(SESSION_TOKEN_KEY);
    if (!sessionToken) return null;

    // Validate session in Supabase
    const { data: session, error } = await supabase
      .from('facilitator_sessions')
      .select('*')
      .eq('session_token', sessionToken)
      .single();

    if (error || !session) {
      await clearSession();
      return null;
    }

    // Check if session is expired
    const now = new Date();
    const expiresAt = new Date(session.expires_at);
    
    if (now > expiresAt) {
      await clearSession();
      return null;
    }

    // Update last_active_at
    await supabase
      .from('facilitator_sessions')
      .update({ last_active_at: now.toISOString() })
      .eq('session_token', sessionToken);

    return {
      facilitatorId: session.facilitator_id,
      timestamp: new Date(session.last_active_at).getTime(),
    };
  } catch (error) {
    console.error("Failed to get session:", error);
    return null;
  }
};

export const getCurrentFacilitator = async (): Promise<Facilitator | null> => {
  const session = await getCurrentSession();
  if (!session) return null;
  
  const facilitators = getAllFacilitators();
  return facilitators.find(f => f.id === session.facilitatorId) || null;
};

export const clearSession = async (): Promise<void> => {
  const sessionToken = localStorage.getItem(SESSION_TOKEN_KEY);
  
  if (sessionToken) {
    // Delete session from Supabase
    await supabase
      .from('facilitator_sessions')
      .delete()
      .eq('session_token', sessionToken);
  }
  
  // Remove from localStorage
  localStorage.removeItem(SESSION_TOKEN_KEY);
};

export const updateSessionTimestamp = async (): Promise<void> => {
  const sessionToken = localStorage.getItem(SESSION_TOKEN_KEY);
  if (!sessionToken) return;

  const now = new Date();
  await supabase
    .from('facilitator_sessions')
    .update({ last_active_at: now.toISOString() })
    .eq('session_token', sessionToken);
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

export const deleteFacilitator = async (facilitatorId: string): Promise<boolean> => {
  const facilitators = getAllFacilitators();
  const filtered = facilitators.filter(f => f.id !== facilitatorId);
  
  if (filtered.length === facilitators.length) {
    return false; // Facilitator not found
  }
  
  localStorage.setItem(FACILITATORS_KEY, JSON.stringify(filtered));
  
  // Clear session if deleting current facilitator
  const session = await getCurrentSession();
  if (session?.facilitatorId === facilitatorId) {
    await clearSession();
  }
  
  return true;
};
