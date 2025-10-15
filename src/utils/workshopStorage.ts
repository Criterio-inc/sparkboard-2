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
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "workshops";

export const saveWorkshop = (workshop: Omit<SavedWorkshop, "id" | "createdAt" | "updatedAt"> & { id?: string }): SavedWorkshop => {
  const workshops = getAllWorkshops();
  
  const savedWorkshop: SavedWorkshop = {
    ...workshop,
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

export const getWorkshopById = (id: string): SavedWorkshop | null => {
  const workshops = getAllWorkshops();
  return workshops.find(w => w.id === id) || null;
};

export const deleteWorkshop = (id: string): void => {
  const workshops = getAllWorkshops();
  const filtered = workshops.filter(w => w.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};

export const duplicateWorkshop = (id: string): SavedWorkshop | null => {
  const workshop = getWorkshopById(id);
  if (!workshop) return null;

  const duplicated: Omit<SavedWorkshop, "id" | "createdAt" | "updatedAt"> = {
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
  };

  return saveWorkshop(duplicated);
};
