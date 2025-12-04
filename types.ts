import { Chat } from "@google/genai";

export enum AppStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Stored in localStorage for demo
}

export interface HistoryItem {
  id: string;
  userId: string;
  date: string;
  jobTitle: string; 
  jobDescriptionSummary: string; // Short snippet
  fullJobDescription: string;
  result: AnalysisResult;
}

export interface InterviewDetails {
  type: 'Phone' | 'Video' | 'Onsite' | 'Technical' | 'Behavioral';
  date: string;
  time: string;
  locationLink?: string; // Zoom link or address
  contactName?: string;
  contactPhone?: string;
  notes?: string;
}

export interface JobApplication {
  id: string;
  userId: string;
  companyName: string;
  jobTitle: string;
  // Kanban Statuses
  status: 'Saved' | 'Applied' | 'Interview' | 'Offer';
  dateApplied: string; // or date saved
  notes: string;
  interviewDetails?: InterviewDetails;
}

export interface BotConfig {
  type: 'outreach' | 'interview';
  systemPrompt: string;
  temperature: number; // 0.0 to 2.0
}

export interface Removal {
  text: string;
  reason: string;
}

export interface ExperienceImprovement {
  companyAndRole: string;
  suggestedBulletPoints: string[]; // 15+ points
}

export interface SkillCategory {
  category: string;
  skills: string[];
}

export interface StructuredSuggestions {
  personalSummary: string;
  summaryExtensionPoints: string[]; // ~10 extra points
  coreSkills: SkillCategory[]; // Categorized
  experience: ExperienceImprovement[];
}

export interface AnalysisResult {
  jobTitleDetected: string;
  matchScore: number;
  foundKeywords: string[];
  missingKeywords: string[];
  suggestedResume: StructuredSuggestions;
  removals: Removal[];
  executiveSummary: string;
}

export interface UploadedFileState {
  file: File | null;
  textContent?: string; // For DOCX
  previewUrl: string | null;
  type: 'pdf' | 'docx';
}

export interface OutreachContent {
  emailSubject: string;
  emailBody: string;
  linkedinMessage: string;
}

export interface InterviewState {
  isOpen: boolean;
  tellMeAboutYourself: string;
  chatSession: Chat | null;
  messages: { role: 'user' | 'model'; text: string }[];
  isLoading: boolean;
}