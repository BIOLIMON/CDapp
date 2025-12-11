export type UserRole = 'user' | 'admin';

export type AuthStage = 'landing' | 'login' | 'register' | 'verify' | 'authenticated' | 'admin_login' | 'admin_authenticated';

export interface UserProfile {
  id: string;
  name: string;
  email: string; // New
  password?: string; // New (Mock only)
  gender?: string; // New
  birthDate?: string; // New
  avatar?: string; // New (Base64)
  kitCode: string;
  startDate: string; // ISO Date string
  role: UserRole;
  score: number;
}

export type PotId = '1' | '2' | '3' | '4';

export interface PotImages {
  front?: string;
  top?: string;
  profile?: string;
}

export interface PotData {
  weight: number | '';
  height: number | '';
  visualStatus: string;
  ph: number | '';
  notes: string;
  images: PotImages;
}

export interface ExperimentEntry {
  id: string;
  userId: string;
  date: string; // ISO Date string
  dayNumber: number; // Days since start
  pots: {
    [key in PotId]: PotData;
  };
  generalNotes: string;
}

export type ViewState = 'dashboard' | 'form' | 'assistant' | 'resources' | 'admin';

export enum PlantStatus {
  GERMINATING = 'Germinación',
  LEAVES = 'Primeras Hojas',
  GROWING = 'Crecimiento Vegetativo',
  WILTING = 'Marchitez / Estrés',
  FLOWERING = 'Floración',
  FRUITING = 'Fructificación',
  DEAD = 'Planta Muerta',
  NONE = 'Sin Germinar'
}

export interface GlobalStats {
  totalUsers: number;
  totalEntries: number;
  totalPhotos: number;
  activeExperiments: number;
}