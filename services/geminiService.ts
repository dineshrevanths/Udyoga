import { GoogleGenAI, Type, Schema, Chat } from "@google/genai";
import { AnalysisResult, OutreachContent } from "../types";
import { MODEL_NAME, SYSTEM_INSTRUCTION, GLOBAL_CHAT_INSTRUCTION } from "../constants";
import { getBotConfig } from "./storage";
import mammoth from "mammoth";

// Helper to convert File to Base64 (for PDF)
const fileToBase64 = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result as string;
      const base64Content = base64Data.split(',')[1];
      resolve(base64Content);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Helper to extract text from DOCX
const extractDocxText = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
};

export const analyzeResume = async (file: File, jobDescription: string): Promise<AnalysisResult> => {
  if (!process.env.API_KEY) throw new Error("API Key is missing.");

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const isPdf = file.type === 'application/pdf';

  let contentPart: any;

  if (isPdf) {
    const base64Data = await fileToBase64(file);
    contentPart = {
      inlineData: {
        data: base64Data,
        mimeType: 'application/pdf',
      },
    };
  } else {
    // Assume DOCX/Text
    const text = await extractDocxText(file);
    contentPart = {
      text: `RESUME CONTENT:\n${text}`
    };
  }

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      jobTitleDetected: { type: Type.STRING, description: "The likely job title from the JD" },
      matchScore: { type: Type.INTEGER },
      foundKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
      missingKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
      suggestedResume: {
        type: Type.OBJECT,
        properties: {
          personalSummary: { type: Type.STRING },
          summaryExtensionPoints: { type: Type.ARRAY, items: { type: Type.STRING }, description: "10 extra summary bullet points" },
          coreSkills: { 
            type: Type.ARRAY, 
            items: { 
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING },
                skills: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            } 
          },
          experience: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                companyAndRole: { type: Type.STRING },
                suggestedBulletPoints: { type: Type.ARRAY, items: { type: Type.STRING }, description: "15+ optimized bullet points" }
              }
            }
          }
        }
      },
      removals: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            reason: { type: Type.STRING }
          }
        }
      },
      executiveSummary: { type: Type.STRING }
    },
    required: ["jobTitleDetected", "matchScore", "foundKeywords", "missingKeywords", "suggestedResume", "removals", "executiveSummary"]
  };

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          contentPart,
          { text: `Here is the Job Description:\n\n${jobDescription}\n\nAnalyze the resume against this JD following the system instructions carefully.` }
        ]
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as AnalysisResult;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Failed to analyze resume. Please try again.");
  }
};

export const generateOutreachMessages = async (file: File, jobDescription: string): Promise<OutreachContent> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const isPdf = file.type === 'application/pdf';
  let contentPart: any;

  if (isPdf) {
    const base64Data = await fileToBase64(file);
    contentPart = { inlineData: { data: base64Data, mimeType: 'application/pdf' } };
  } else {
    const text = await extractDocxText(file);
    contentPart = { text: `RESUME CONTENT:\n${text}` };
  }

  // LOAD CUSTOM CONFIG
  const config = getBotConfig('outreach');

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      emailSubject: { type: Type.STRING },
      emailBody: { type: Type.STRING },
      linkedinMessage: { type: Type.STRING }
    }
  };

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: {
      parts: [contentPart, { text: `Job Description:\n${jobDescription}\n\nGenerate human-sounding outreach messages.` }]
    },
    config: {
      systemInstruction: config.systemPrompt,
      temperature: config.temperature,
      responseMimeType: "application/json",
      responseSchema: responseSchema
    }
  });

  return JSON.parse(response.text!) as OutreachContent;
};

export const createInterviewChat = async (file: File, jobDescription: string): Promise<{ chat: Chat, tellMeAboutYourself: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const isPdf = file.type === 'application/pdf';
  let contentPart: any;

  if (isPdf) {
    const base64Data = await fileToBase64(file);
    contentPart = { inlineData: { data: base64Data, mimeType: 'application/pdf' } };
  } else {
    const text = await extractDocxText(file);
    contentPart = { text: `RESUME CONTENT:\n${text}` };
  }

  // LOAD CUSTOM CONFIG
  const config = getBotConfig('interview');

  const chat = ai.chats.create({
    model: MODEL_NAME,
    config: { 
      systemInstruction: config.systemPrompt,
      temperature: config.temperature
    }
  });

  // Initial prompt to get the "Tell Me About Yourself"
  const response = await chat.sendMessage({
    message: [
      contentPart, 
      { text: `Here is my Resume and the Job Description:\n${jobDescription}\n\nTask 1: Generate a perfect "Tell me about yourself" answer (max 200 words) that bridges my actual experience to this specific JD. Even if my experience is different, reframe it to match.` }
    ]
  });

  return {
    chat,
    tellMeAboutYourself: response.text || "Could not generate answer."
  };
};

export const createGlobalChat = (): Chat => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return ai.chats.create({
    model: MODEL_NAME,
    config: { systemInstruction: GLOBAL_CHAT_INSTRUCTION }
  });
};