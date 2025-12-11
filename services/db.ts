import { ExperimentEntry, GlobalStats, UserProfile } from '../types';

// Keys for localStorage
const USERS_KEY = 'cultivadatos_users_db';
const ENTRIES_KEY = 'cultivadatos_entries_db';
const CURRENT_USER_KEY = 'cultivadatos_current_user';

// Mock Data for "Community" stats
const MOCK_STATS = {
  users: 124,
  entries: 1850,
  photos: 5400
};

const MOCK_LEADERBOARD = [
  { name: 'Ana M.', score: 4500 },
  { name: 'Carlos R.', score: 4120 },
  { name: 'Escuela Rural 5', score: 3890 },
];

// Helper to get all data
const getDB = () => {
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  const entries = JSON.parse(localStorage.getItem(ENTRIES_KEY) || '[]');
  return { users, entries };
};

// Calculate Score
export const calculateScore = (entries: ExperimentEntry[]): number => {
  let score = 0;
  
  // 1. Quantity Points
  score += entries.length * 100;

  // 2. Photo Points
  entries.forEach(entry => {
    Object.values(entry.pots).forEach(pot => {
      if (pot.images.front) score += 50;
      if (pot.images.top) score += 50;
      if (pot.images.profile) score += 50;
    });
  });

  // 3. Consistency/Streak (Simplified)
  // In a real app, we'd check consecutive dates. 
  // Here we just give a bonus for regular logging (e.g., > 2 entries per week avg).
  if (entries.length > 5) score += 200;
  if (entries.length > 10) score += 500;

  return score;
};

export const db = {
  // Authentication
  authenticateUser: (email: string, password: string): UserProfile | null => {
      const { users } = getDB();
      // Simple mock auth
      const user = users.find((u: UserProfile) => u.email === email && u.password === password);
      if (user) {
          localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
          return user;
      }
      return null;
  },

  checkEmailExists: (email: string): boolean => {
      const { users } = getDB();
      return users.some((u: UserProfile) => u.email === email);
  },

  // User Management
  registerUser: (profile: UserProfile): UserProfile => {
    const { users } = getDB();
    
    // Check if updating or creating
    const existingIndex = users.findIndex((u: UserProfile) => u.id === profile.id);
    
    let userToSave = { ...profile, score: 0 };
    
    if (existingIndex >= 0) {
      userToSave = { ...users[existingIndex], ...profile };
      users[existingIndex] = userToSave;
    } else {
      // If ID not provided or new
      if (!userToSave.id) userToSave.id = Date.now().toString();
      users.push(userToSave);
    }
    
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    // Don't log in automatically yet if we are in registration flow, 
    // but usually registration implies login. 
    // For this app flow, we login after verification.
    return userToSave;
  },

  login: (profile: UserProfile) => {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(profile));
      return profile;
  },

  getCurrentUser: (): UserProfile | null => {
    const stored = localStorage.getItem(CURRENT_USER_KEY);
    return stored ? JSON.parse(stored) : null;
  },

  logout: () => {
    localStorage.removeItem(CURRENT_USER_KEY);
  },

  // Entry Management
  addEntry: (entry: ExperimentEntry) => {
    const { entries, users } = getDB();
    entries.push(entry);
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));

    // Update User Score
    const userEntries = entries.filter((e: ExperimentEntry) => e.userId === entry.userId);
    const newScore = calculateScore(userEntries);
    
    // Update User record
    const userIndex = users.findIndex((u: UserProfile) => u.id === entry.userId);
    if (userIndex >= 0) {
      users[userIndex].score = newScore;
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      
      // Update current session if applicable
      const currentUser = db.getCurrentUser();
      if (currentUser && currentUser.id === entry.userId) {
        currentUser.score = newScore;
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
      }
    }
    
    return newScore;
  },

  getUserEntries: (userId: string): ExperimentEntry[] => {
    const { entries } = getDB();
    return entries
      .filter((e: ExperimentEntry) => e.userId === userId)
      .sort((a: ExperimentEntry, b: ExperimentEntry) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  // Admin / Global
  getAllUsers: (): UserProfile[] => {
    const { users } = getDB();
    return users;
  },

  getAllEntries: (): ExperimentEntry[] => {
    const { entries } = getDB();
    return entries;
  },

  getGlobalStats: (): GlobalStats & { leaderboard: typeof MOCK_LEADERBOARD } => {
    const { users, entries } = getDB();
    
    // Count local photos
    let localPhotos = 0;
    entries.forEach((e: ExperimentEntry) => {
      Object.values(e.pots).forEach(p => {
        if (p.images.front) localPhotos++;
        if (p.images.top) localPhotos++;
        if (p.images.profile) localPhotos++;
      });
    });

    return {
      totalUsers: MOCK_STATS.users + users.length,
      totalEntries: MOCK_STATS.entries + entries.length,
      totalPhotos: MOCK_STATS.photos + localPhotos,
      activeExperiments: MOCK_STATS.users + users.length, 
      leaderboard: [
        ...MOCK_LEADERBOARD,
        ...users.map((u: UserProfile) => ({ name: u.name, score: u.score }))
      ].sort((a, b) => b.score - a.score).slice(0, 3)
    };
  }
};