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

export const saveWorkshop = (workshop: Omit<SavedWorkshop, "id" | "createdAt" | "updatedAt"> & { id?: string; facilitatorId: string }): SavedWorkshop => {
  const workshops = getAllWorkshops();

  const normalizedCode = workshop.code
    ? workshop.code.toUpperCase().replace(/[^A-Z0-9]/g, "")
    : undefined;
  
  const savedWorkshop: SavedWorkshop = {
    ...workshop,
    code: normalizedCode,
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

  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    console.log("Workshop sparad med kod:", savedWorkshop.code, savedWorkshop);
    console.log("Workshops i localStorage:", all);
  } catch (e) {
    console.warn("Kunde inte logga workshops från localStorage", e);
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
  const workshops = getAllWorkshops();
  const normalized = code.trim().toUpperCase();
  console.log("Söker efter workshop med kod:", normalized);
  console.log("Hittade workshops:", workshops.length);
  const found = workshops.find(w => (w.code?.toUpperCase() || "") === normalized) || null;
  if (!found) {
    console.warn("Ingen workshop med angiven kod hittades.");
  } else {
    console.log("Workshop hittad:", { id: found.id, title: found.title, status: found.status, code: found.code });
  }
  return found;
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
