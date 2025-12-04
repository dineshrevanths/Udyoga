import { User, HistoryItem, AnalysisResult, JobApplication, BotConfig } from '../types';
import { OUTREACH_SYSTEM_INSTRUCTION, INTERVIEW_COACH_INSTRUCTION } from '../constants';

const STORAGE_KEYS = {
  USERS: 'ats_optimizer_users',
  CURRENT_USER_ID: 'ats_optimizer_current_user_id',
  HISTORY: 'ats_optimizer_history',
  APPLICATIONS: 'ats_optimizer_applications',
  BOT_CONFIG: 'ats_optimizer_bot_config'
};

// --- AUTH ---

export const getUsers = (): User[] => {
  const data = localStorage.getItem(STORAGE_KEYS.USERS);
  return data ? JSON.parse(data) : [];
};

export const saveUser = (user: User): void => {
  const users = getUsers();
  const existing = users.findIndex(u => u.id === user.id);
  if (existing >= 0) {
    users[existing] = user;
  } else {
    users.push(user);
  }
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
};

export const getCurrentUser = (): User | null => {
  const id = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
  if (!id) return null;
  const users = getUsers();
  return users.find(u => u.id === id) || null;
};

export const login = (email: string, password: string): User | null => {
  if (!email || !password) return null;
  const users = getUsers();
  const user = users.find(u => u.email === email && u.password === password);
  if (user) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, user.id);
    return user;
  }
  return null;
};

export const logout = (): void => {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
};

export const signup = (name: string, email: string, password: string): User => {
  if (!name || !email || !password) throw new Error("All fields are required");
  const users = getUsers();
  if (users.find(u => u.email === email)) throw new Error("User already exists");
  
  const newUser: User = {
    id: crypto.randomUUID(),
    name,
    email,
    password
  };
  saveUser(newUser);
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, newUser.id);
  return newUser;
};

// --- HISTORY ---

export const saveHistory = (userId: string, jobTitle: string, jobDescription: string, result: AnalysisResult): void => {
  const history: HistoryItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY) || '[]');
  const newItem: HistoryItem = {
    id: crypto.randomUUID(),
    userId,
    date: new Date().toISOString(),
    jobTitle,
    jobDescriptionSummary: jobDescription.substring(0, 100) + '...',
    fullJobDescription: jobDescription,
    result
  };
  history.unshift(newItem); // Add to top
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
};

export const getHistory = (userId: string): HistoryItem[] => {
  const history: HistoryItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY) || '[]');
  return history.filter(h => h.userId === userId);
};

export const deleteHistory = (id: string): void => {
   let history: HistoryItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY) || '[]');
   history = history.filter(h => h.id !== id);
   localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
}

// --- JOB APPLICATIONS ---

export const getApplications = (userId: string): JobApplication[] => {
  const apps: JobApplication[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.APPLICATIONS) || '[]');
  return apps.filter(a => a.userId === userId);
};

export const saveApplication = (app: JobApplication): void => {
  const apps: JobApplication[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.APPLICATIONS) || '[]');
  const existingIndex = apps.findIndex(a => a.id === app.id);
  if (existingIndex >= 0) {
    apps[existingIndex] = app;
  } else {
    apps.push(app);
  }
  localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(apps));
};

export const deleteApplication = (id: string): void => {
  let apps: JobApplication[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.APPLICATIONS) || '[]');
  apps = apps.filter(a => a.id !== id);
  localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(apps));
};

// --- AI CONFIG ---

export const saveBotConfig = (config: BotConfig): void => {
  const configs: BotConfig[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.BOT_CONFIG) || '[]');
  const index = configs.findIndex(c => c.type === config.type);
  if (index >= 0) {
    configs[index] = config;
  } else {
    configs.push(config);
  }
  localStorage.setItem(STORAGE_KEYS.BOT_CONFIG, JSON.stringify(configs));
};

export const getBotConfig = (type: 'outreach' | 'interview'): BotConfig => {
  const configs: BotConfig[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.BOT_CONFIG) || '[]');
  const config = configs.find(c => c.type === type);
  if (config) return config;

  // Defaults if not set
  return {
    type,
    systemPrompt: type === 'outreach' ? OUTREACH_SYSTEM_INSTRUCTION : INTERVIEW_COACH_INSTRUCTION,
    temperature: 0.7
  };
};