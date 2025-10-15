interface Question {
  id: string;
  title: string;
}

interface Board {
  id: string;
  title: string;
  timeLimit: number;
  questions: Question[];
  colorIndex: number;
}

export interface SavedWorkshop {
  id: string;
  title: string;
  description: string;
  boards: Board[];
  code?: string;
  status: "draft" | "active";
  facilitatorId: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "workshops";

// Generera unik workshop-kod (6 tecken, A-Z och 0-9)
export const generateUniqueWorkshopCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const allWorkshops = getAllWorkshops();
  
  while (true) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Kontrollera att koden är unik (case-insensitive)
    const exists = allWorkshops.some(w => 
      (w.code || '').toUpperCase() === code.toUpperCase()
    );
    
    if (!exists) {
      console.log("✅ Genererad unik kod:", code);
      return code;
    }
    console.log("⚠️ Kod redan används:", code, "- genererar ny");
  }
};

export const saveWorkshop = (workshop: Omit<SavedWorkshop, "id" | "createdAt" | "updatedAt"> & { id?: string; facilitatorId: string }): SavedWorkshop => {
  const workshops = getAllWorkshops();

  // Normalisera och säkerställ kod (A-Z, 0-9, 6 tecken)
  let codeToUse = workshop.code ? workshop.code.toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
  
  // Validera och generera unik kod om behövs
  if (!codeToUse || codeToUse.length !== 6) {
    console.warn("⚠️ VARNING: Workshop saknar kod eller ogiltig längd! Genererar ny unik kod");
    codeToUse = generateUniqueWorkshopCode();
  } else {
    // Kontrollera om koden kolliderar med annan workshop (annat id)
    const collision = workshops.find(w => 
      w.id !== workshop.id && 
      (w.code || '').toUpperCase() === codeToUse.toUpperCase()
    );
    if (collision) {
      console.warn("⚠️ VARNING: Kodkollision upptäckt! Genererar ny unik kod");
      codeToUse = generateUniqueWorkshopCode();
    }
  }
  
  const savedWorkshop: SavedWorkshop = {
    ...workshop,
    code: codeToUse,
    id: workshop.id || `workshop-${Date.now()}`,
    createdAt: workshop.id ? (workshops.find(w => w.id === workshop.id)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (workshop.id) {
    // Update existing
    const index = workshops.findIndex(w => w.id === workshop.id);
    if (index !== -1) {
      workshops[index] = savedWorkshop;
    } else {
      workshops.push(savedWorkshop);
    }
  } else {
    // Add new
    workshops.push(savedWorkshop);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(workshops));

  // Omfattande verifiering och loggning
  console.log("✅ Workshop sparad med kod:", savedWorkshop.code);
  console.log("📋 Workshop-objekt:", savedWorkshop);
  
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    console.log("📦 Workshops i localStorage:", all);
    console.log("📊 Totalt antal workshops:", all.length);
    
    // Verifiering 1: Hitta via ID
    const verifyById = all.find((w: any) => w.id === savedWorkshop.id);
    console.log("🔍 Verifiering via ID:", verifyById ? "✅ JA" : "❌ NEJ");
    
    // Verifiering 2: Hitta via kod
    const verifyByCode = all.find((w: any) => (w.code || '').toUpperCase() === codeToUse.toUpperCase());
    console.log("🔍 Verifiering via kod:", verifyByCode ? "✅ JA" : "❌ NEJ");
    
    // Verifiering 3: Kontrollera att kod matchar
    if (verifyById && verifyById.code !== savedWorkshop.code) {
      console.error("❌ KRITISKT FEL: Sparad kod matchar inte förväntat värde!", {
        expected: savedWorkshop.code,
        actual: verifyById.code
      });
    } else {
      console.log("✅ Kod-verifiering: OK");
    }
  } catch (e) {
    console.error("❌ Kunde inte verifiera workshop i localStorage:", e);
  }

  return savedWorkshop;
};

export const getAllWorkshops = (): SavedWorkshop[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Failed to load workshops:", error);
    return [];
  }
};

export const getWorkshopsByFacilitator = (facilitatorId: string): SavedWorkshop[] => {
  const allWorkshops = getAllWorkshops();
  return allWorkshops.filter(w => w.facilitatorId === facilitatorId);
};

export const getWorkshopById = (id: string): SavedWorkshop | null => {
  const workshops = getAllWorkshops();
  return workshops.find(w => w.id === id) || null;
};

export const getWorkshopByCode = (code: string): SavedWorkshop | null => {
  console.log("🔍 === getWorkshopByCode ANROPAD ===");
  console.log("🔑 Söker efter kod:", code);

  // KRITISKT: Sök i ALLA workshops, oavsett facilitatorId
  // Detta tillåter deltagare att ansluta till workshops från alla facilitatorer
  const workshops = getAllWorkshops();
  console.log("📊 Totalt antal workshops att söka i:", workshops.length);

  const normalizedSearchCode = code.trim().toUpperCase();
  console.log("🔄 Normaliserad sökkod:", normalizedSearchCode);
  console.log("📏 Kod-längd:", normalizedSearchCode.length);

  let found: SavedWorkshop | null = null;
  
  // Logga alla workshops för debugging
  console.log("📋 Alla workshops i sökning:");
  workshops.forEach((w, index) => {
    const workshopCode = (w.code || '').trim().toUpperCase();
    console.log(`  [${index}] Kod: "${workshopCode}" | Titel: "${w.title}" | Status: ${w.status}`);
  });

  // Sök efter matchande kod
  for (let i = 0; i < workshops.length; i++) {
    const w = workshops[i];
    const workshopCode = (w.code || '').trim().toUpperCase();
    const match = workshopCode === normalizedSearchCode;
    console.log(`🔍 Jämför [${i}]: "${normalizedSearchCode}" === "${workshopCode}" → ${match ? '✅' : '❌'}`);
    if (match) {
      found = w;
      break;
    }
  }

  if (found) {
    console.log("✅ HITTADE WORKSHOP:", found.title);
    console.log("📌 Workshop-status:", found.status);
    console.log("👤 Facilitator ID:", found.facilitatorId);
    // VIKTIGT: Returnera workshop OAVSETT status (draft/active)
    // Status-validering görs i JoinWorkshop.tsx istället
    return found;
  } else {
    console.log("❌ WORKSHOP HITTADES INTE");
    console.log("🔑 Tillgängliga koder:", workshops.map(w => w.code || '(ingen kod)'));
    return null;
  }
};

export const deleteWorkshop = (id: string): void => {
  const workshops = getAllWorkshops();
  const filtered = workshops.filter(w => w.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};

export const duplicateWorkshop = (id: string, facilitatorId: string): SavedWorkshop | null => {
  const workshop = getWorkshopById(id);
  if (!workshop) return null;

  const duplicated: Omit<SavedWorkshop, "id" | "createdAt" | "updatedAt"> & { facilitatorId: string } = {
    title: `${workshop.title} (Kopia)`,
    description: workshop.description,
    boards: workshop.boards.map(board => ({
      ...board,
      id: `board-${Date.now()}-${Math.random()}`,
      questions: board.questions.map(q => ({
        ...q,
        id: `question-${Date.now()}-${Math.random()}`
      }))
    })),
    status: "draft",
    facilitatorId,
  };

  return saveWorkshop(duplicated);
};
