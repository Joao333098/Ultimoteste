import { type User, type InsertUser, type TranscriptionSession, type InsertTranscriptionSession, type AiAnalysis, type InsertAiAnalysis } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Transcription Sessions
  createTranscriptionSession(session: InsertTranscriptionSession): Promise<TranscriptionSession>;
  getTranscriptionSession(id: string): Promise<TranscriptionSession | undefined>;
  getAllTranscriptionSessions(): Promise<TranscriptionSession[]>;
  updateTranscriptionSession(id: string, session: Partial<TranscriptionSession>): Promise<TranscriptionSession | undefined>;
  deleteTranscriptionSession(id: string): Promise<boolean>;
  
  // AI Analyses
  createAiAnalysis(analysis: InsertAiAnalysis): Promise<AiAnalysis>;
  getAiAnalysesBySession(sessionId: string): Promise<AiAnalysis[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private transcriptionSessions: Map<string, TranscriptionSession>;
  private aiAnalyses: Map<string, AiAnalysis>;

  constructor() {
    this.users = new Map();
    this.transcriptionSessions = new Map();
    this.aiAnalyses = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createTranscriptionSession(insertSession: InsertTranscriptionSession): Promise<TranscriptionSession> {
    const id = randomUUID();
    const session: TranscriptionSession = {
      ...insertSession,
      id,
      createdAt: new Date(),
      languages: Array.isArray(insertSession.languages) ? insertSession.languages as string[] : [],
      isActive: insertSession.isActive ?? false,
    };
    this.transcriptionSessions.set(id, session);
    return session;
  }

  async getTranscriptionSession(id: string): Promise<TranscriptionSession | undefined> {
    return this.transcriptionSessions.get(id);
  }

  async getAllTranscriptionSessions(): Promise<TranscriptionSession[]> {
    return Array.from(this.transcriptionSessions.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateTranscriptionSession(id: string, updates: Partial<TranscriptionSession>): Promise<TranscriptionSession | undefined> {
    const session = this.transcriptionSessions.get(id);
    if (!session) return undefined;
    
    const updatedSession = { ...session, ...updates };
    this.transcriptionSessions.set(id, updatedSession);
    return updatedSession;
  }

  async deleteTranscriptionSession(id: string): Promise<boolean> {
    return this.transcriptionSessions.delete(id);
  }

  async createAiAnalysis(insertAnalysis: InsertAiAnalysis): Promise<AiAnalysis> {
    const id = randomUUID();
    const analysis: AiAnalysis = {
      ...insertAnalysis,
      id,
      createdAt: new Date(),
    };
    this.aiAnalyses.set(id, analysis);
    return analysis;
  }

  async getAiAnalysesBySession(sessionId: string): Promise<AiAnalysis[]> {
    return Array.from(this.aiAnalyses.values())
      .filter(analysis => analysis.sessionId === sessionId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
}

export const storage = new MemStorage();
