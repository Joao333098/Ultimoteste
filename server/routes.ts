import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTranscriptionSessionSchema, insertAiAnalysisSchema } from "@shared/schema";
import { analyzeTranscriptionContent, generateSummary, detectLanguageFromText, enhanceTranscriptionText, analyzeSentiment, translateText } from "./services/gemini";
import { analyzeAdvancedSentiment, detectAdvancedIntent, extractAdvancedEntities, analyzeAdvancedContent, extractAdvancedTopics, detectSuperAdvancedIntent } from "./services/advanced-nlp-backend";

export async function registerRoutes(app: Express): Promise<Server> {

  // Get all transcription sessions
  app.get("/api/sessions", async (req, res) => {
    try {
      const sessions = await storage.getAllTranscriptionSessions();
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Falha ao buscar sessões" });
    }
  });

  // Create new transcription session
  app.post("/api/sessions", async (req, res) => {
    try {
      const validatedData = insertTranscriptionSessionSchema.parse(req.body);
      const session = await storage.createTranscriptionSession(validatedData);
      res.json(session);
    } catch (error) {
      res.status(400).json({ message: "Dados inválidos para criação da sessão" });
    }
  });

  // Get specific session
  app.get("/api/sessions/:id", async (req, res) => {
    try {
      const session = await storage.getTranscriptionSession(req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Sessão não encontrada" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Falha ao buscar sessão" });
    }
  });

  // Update session
  app.patch("/api/sessions/:id", async (req, res) => {
    try {
      const session = await storage.updateTranscriptionSession(req.params.id, req.body);
      if (!session) {
        return res.status(404).json({ message: "Sessão não encontrada" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Falha ao atualizar sessão" });
    }
  });

  // Delete session
  app.delete("/api/sessions/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteTranscriptionSession(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Sessão não encontrada" });
      }
      res.json({ message: "Sessão deletada com sucesso" });
    } catch (error) {
      res.status(500).json({ message: "Falha ao deletar sessão" });
    }
  });

  // Analyze transcription with AI
  app.post("/api/ai/analyze", async (req, res) => {
    try {
      const { transcription, question } = req.body;

      if (!transcription || !question) {
        return res.status(400).json({ message: "Transcrição e pergunta são obrigatórias" });
      }

      const analysis = await analyzeTranscriptionContent(transcription, question);
      res.json(analysis);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha na análise de IA";
      res.status(500).json({ message });
    }
  });

  // Generate summary
  app.post("/api/ai/summary", async (req, res) => {
    try {
      const { transcription } = req.body;

      if (!transcription) {
        return res.status(400).json({ message: "Transcrição é obrigatória" });
      }

      const summary = await generateSummary(transcription);
      res.json({ summary });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao gerar resumo";
      res.status(500).json({ message });
    }
  });

  // Detect language with alternatives and context
  app.post("/api/ai/detect-language", async (req, res) => {
    try {
      const { text, alternatives, context } = req.body;

      if (!text) {
        return res.status(400).json({ message: "Texto é obrigatório" });
      }

      console.log(`🎯 Detecção solicitada para: "${text.substring(0, 50)}..."`);
      console.log(`📋 Alternativas:`, alternatives?.length || 0);
      console.log(`🎚️ Contexto:`, context);

      const detection = await detectLanguageFromText(text, alternatives, context);
      res.json(detection);
    } catch (error) {
      console.error('Erro na detecção:', error);
      res.status(500).json({ message: "Falha na detecção de idioma" });
    }
  });

  // Enhance transcription text with AI
  app.post("/api/ai/enhance", async (req, res) => {
    try {
      const { text, targetLanguage } = req.body;

      if (!text) {
        return res.status(400).json({ message: "Texto é obrigatório" });
      }

      const enhancement = await enhanceTranscriptionText(text, targetLanguage);
      res.json(enhancement);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha no aprimoramento do texto";
      res.status(500).json({ message });
    }
  });

  // Analyze sentiment
  app.post("/api/ai/sentiment", async (req, res) => {
    try {
      const { text } = req.body;

      if (!text) {
        return res.status(400).json({ message: "Texto é obrigatório" });
      }

      const sentiment = await analyzeSentiment(text);
      res.json(sentiment);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha na análise de sentimento";
      res.status(500).json({ message });
    }
  });

  // Translate text
  app.post("/api/ai/translate", async (req, res) => {
    try {
      const { text, targetLanguage, isAutoTranslation } = req.body;

      if (!text || !targetLanguage) {
        return res.status(400).json({ message: "Texto e idioma de destino são obrigatórios" });
      }

      const translation = await translateText(text, targetLanguage, isAutoTranslation || false);
      res.json(translation);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha na tradução";
      res.status(500).json({ message });
    }
  });

  // ========== ROTAS AVANÇADAS DE NLP ==========

  // Análise super avançada de intenção (detecta perguntas implícitas)
  app.post("/api/ai/super-intent", async (req, res) => {
    try {
      const { text, context } = req.body;

      if (!text) {
        return res.status(400).json({ message: "Texto é obrigatório" });
      }

      const superIntent = await detectSuperAdvancedIntent(text, context);
      res.json(superIntent);
    } catch (error) {
      console.error('Erro na detecção super avançada de intenção:', error);
      const message = error instanceof Error ? error.message : "Falha na detecção super avançada de intenção";
      res.status(500).json({ message });
    }
  });

  // Análise avançada de sentimento
  app.post("/api/ai/sentiment-advanced", async (req, res) => {
    try {
      const { text } = req.body;

      if (!text) {
        return res.status(400).json({ message: "Texto é obrigatório" });
      }

      const sentiment = await analyzeAdvancedSentiment(text);
      res.json(sentiment);
    } catch (error) {
      console.error('Erro na análise de sentimento avançada:', error);
      const message = error instanceof Error ? error.message : "Falha na análise de sentimento avançada";
      res.status(500).json({ message });
    }
  });

  // Detecção avançada de intenção
  app.post("/api/ai/intent-advanced", async (req, res) => {
    try {
      const { text, context } = req.body;

      if (!text) {
        return res.status(400).json({ message: "Texto é obrigatório" });
      }

      const intent = await detectAdvancedIntent(text, context);
      res.json(intent);
    } catch (error) {
      console.error('Erro na detecção de intenção avançada:', error);
      const message = error instanceof Error ? error.message : "Falha na detecção de intenção avançada";
      res.status(500).json({ message });
    }
  });

  // Extração avançada de entidades
  app.post("/api/ai/entities-advanced", async (req, res) => {
    try {
      const { text } = req.body;

      if (!text) {
        return res.status(400).json({ message: "Texto é obrigatório" });
      }

      const entities = await extractAdvancedEntities(text);
      res.json(entities);
    } catch (error) {
      console.error('Erro na extração de entidades avançada:', error);
      const message = error instanceof Error ? error.message : "Falha na extração de entidades avançada";
      res.status(500).json({ message });
    }
  });

  // Extração avançada de tópicos
  app.post("/api/ai/topics-advanced", async (req, res) => {
    try {
      const { text } = req.body;

      if (!text) {
        return res.status(400).json({ message: "Texto é obrigatório" });
      }

      const topics = await extractAdvancedTopics(text);
      res.json(topics);
    } catch (error) {
      console.error('Erro na extração de tópicos avançada:', error);
      const message = error instanceof Error ? error.message : "Falha na extração de tópicos avançada";
      res.status(500).json({ message });
    }
  });

  // Análise avançada de conteúdo - ENDPOINT PRINCIPAL CORRIGIDO
  app.post("/api/ai/analyze-advanced", async (req, res) => {
    try {
      const { transcription, question, nlpAnalysis, context, responseType } = req.body;

      if (!transcription || !question) {
        return res.status(400).json({ message: "Transcrição e pergunta são obrigatórias" });
      }

      console.log(`🧠 Análise avançada solicitada para: "${question}"`);
      console.log(`📝 Transcrição: "${transcription.substring(0, 100)}..."`);

      const analysis = await analyzeAdvancedContent(
        transcription,
        question,
        nlpAnalysis,
        context,
        responseType || 'answer'
      );

      console.log(`✅ Análise concluída com confiança: ${Math.round(analysis.confidence * 100)}%`);
      res.json(analysis);
    } catch (error) {
      console.error('Erro na análise avançada:', error);
      const message = error instanceof Error ? error.message : "Falha na análise avançada";
      res.status(500).json({ message });
    }
  });

  // Analyze transcription content - endpoint existente mantido para compatibilidade
  app.post("/api/ai/analyze", async (req, res) => {
    try {
      const { transcription, question } = req.body;

      if (!transcription || !question) {
        return res.status(400).json({ message: "Transcrição e pergunta são obrigatórias" });
      }

      const analysis = await analyzeTranscriptionContent(transcription, question);
      res.json(analysis);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha na análise de IA";
      res.status(500).json({ message });
    }
  });

  // Generate summary
  app.post("/api/ai/summary", async (req, res) => {
    try {
      const { transcription } = req.body;

      if (!transcription) {
        return res.status(400).json({ message: "Transcrição é obrigatória" });
      }

      const summary = await generateSummary(transcription);
      res.json({ summary });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao gerar resumo";
      res.status(500).json({ message });
    }
  });

  // Detect language with alternatives and context
  app.post("/api/ai/detect-language", async (req, res) => {
    try {
      const { text, alternatives, context } = req.body;

      if (!text) {
        return res.status(400).json({ message: "Texto é obrigatório" });
      }

      console.log(`🎯 Detecção solicitada para: "${text.substring(0, 50)}..."`);
      console.log(`📋 Alternativas:`, alternatives?.length || 0);
      console.log(`🎚️ Contexto:`, context);

      const detection = await detectLanguageFromText(text, alternatives, context);
      res.json(detection);
    } catch (error) {
      console.error('Erro na detecção:', error);
      res.status(500).json({ message: "Falha na detecção de idioma" });
    }
  });

  // ========== FIM DAS ROTAS AVANÇADAS ==========


  // Save AI analysis
  app.post("/api/analyses", async (req, res) => {
    try {
      const validatedData = insertAiAnalysisSchema.parse(req.body);
      const analysis = await storage.createAiAnalysis(validatedData);
      res.json(analysis);
    } catch (error) {
      res.status(400).json({ message: "Dados inválidos para análise" });
    }
  });

  // Get analyses for session
  app.get("/api/sessions/:id/analyses", async (req, res) => {
    try {
      const analyses = await storage.getAiAnalysesBySession(req.params.id);
      res.json(analyses);
    } catch (error) {
      res.status(500).json({ message: "Falha ao buscar análises" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}