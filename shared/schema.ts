import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const transcriptionSessions = pgTable("transcription_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  content: text("content").notNull(),
  languages: jsonb("languages").$type<string[]>().notNull().default([]),
  duration: integer("duration").notNull(), // in seconds
  wordCount: integer("word_count").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isActive: boolean("is_active").default(false).notNull(),
});

export const aiAnalyses = pgTable("ai_analyses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => transcriptionSessions.id).notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertTranscriptionSessionSchema = createInsertSchema(transcriptionSessions).omit({
  id: true,
  createdAt: true,
});

export const insertAiAnalysisSchema = createInsertSchema(aiAnalyses).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type TranscriptionSession = typeof transcriptionSessions.$inferSelect;
export type InsertTranscriptionSession = z.infer<typeof insertTranscriptionSessionSchema>;
export type AiAnalysis = typeof aiAnalyses.$inferSelect;
export type InsertAiAnalysis = z.infer<typeof insertAiAnalysisSchema>;
