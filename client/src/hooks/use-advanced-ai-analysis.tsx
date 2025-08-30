import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { nlpProcessor, quickAnalyze, NLPAnalysis } from "@/lib/advanced-nlp";
import { useToast } from "@/hooks/use-toast";

export interface AdvancedAnalysisResult {
  answer: string;
  confidence: number;
  relatedTopics: string[];
  nlpAnalysis: NLPAnalysis;
  responseType: 'answer' | 'explanation' | 'clarification' | 'suggestion';
  contextAware: boolean;
}

interface UseAdvancedAiAnalysisOptions {
  onSuccess?: (data: AdvancedAnalysisResult) => void;
  onError?: (error: Error) => void;
  enableRealTimeAnalysis?: boolean;
}

export function useAdvancedAiAnalysis({
  onSuccess,
  onError,
  enableRealTimeAnalysis = true
}: UseAdvancedAiAnalysisOptions = {}) {
  const [analysisHistory, setAnalysisHistory] = useState<AdvancedAnalysisResult[]>([]);
  const [currentContext, setCurrentContext] = useState<string[]>([]);
  const { toast } = useToast();

  // Hook principal para análise avançada
  const { mutate: analyzeAdvanced, isPending: isAnalyzing } = useMutation({
    mutationFn: async ({ 
      transcription, 
      question, 
      useContext = true 
    }: { 
      transcription: string; 
      question: string; 
      useContext?: boolean;
    }): Promise<AdvancedAnalysisResult> => {
      
      // Realizar análise NLP avançada primeiro
      const nlpAnalysis = await nlpProcessor.analyzeText(question, useContext ? currentContext : []);
      
      // Determinar tipo de resposta baseado na análise
      const responseType = determineResponseType(nlpAnalysis);
      
      // Preparar contexto inteligente
      const intelligentContext = useContext ? prepareIntelligentContext(transcription, nlpAnalysis) : transcription;
      
      // Fazer solicitação para o backend
      const response = await apiRequest('POST', '/api/ai/analyze-advanced', {
        transcription: intelligentContext,
        question,
        nlpAnalysis,
        context: useContext ? currentContext : [],
        responseType
      });
      
      const result = await response.json();
      
      return {
        ...result,
        nlpAnalysis,
        responseType,
        contextAware: useContext
      };
    },
    onSuccess: (data) => {
      // Atualizar histórico de análise
      setAnalysisHistory(prev => [...prev.slice(-19), data]);
      
      // Atualizar contexto
      setCurrentContext(prev => [...prev.slice(-9), data.answer]);
      
      onSuccess?.(data);
      
      if (enableRealTimeAnalysis) {
        toast({
          title: "🧠 Análise IA Completa",
          description: `${data.responseType} | Confiança: ${Math.round(data.confidence * 100)}%`,
        });
      }
    },
    onError: (error) => {
      onError?.(error);
      toast({
        title: "❌ Erro na Análise",
        description: "Falha na análise inteligente. Tente novamente.",
        variant: "destructive",
      });
    }
  });

  // Análise rápida para determinar se deve responder automaticamente
  const analyzeQuick = useCallback(async (text: string) => {
    try {
      const quickResult = await quickAnalyze(text);
      return quickResult;
    } catch (error) {
      console.error('Erro na análise rápida:', error);
      return { shouldRespond: false, priority: 'low' as const, summary: 'Erro' };
    }
  }, []);

  // Análise de sentimento em tempo real
  const { mutate: analyzeSentiment, isPending: isSentimentAnalyzing } = useMutation({
    mutationFn: async (text: string) => {
      const nlpAnalysis = await nlpProcessor.analyzeText(text);
      return nlpAnalysis.sentiment;
    },
    onSuccess: (sentiment) => {
      if (enableRealTimeAnalysis) {
        const emoji = sentiment.polarity === 'positive' ? '😊' : 
                     sentiment.polarity === 'negative' ? '😞' : '😐';
        
        toast({
          title: `${emoji} Sentimento Detectado`,
          description: `${sentiment.polarity} (${Math.round(sentiment.intensity * 100)}%)`,
        });
      }
    }
  });

  // Detecção de entidades em tempo real
  const { mutate: detectEntities, isPending: isDetectingEntities } = useMutation({
    mutationFn: async (text: string) => {
      const nlpAnalysis = await nlpProcessor.analyzeText(text);
      return nlpAnalysis.entities;
    },
    onSuccess: (entities) => {
      if (enableRealTimeAnalysis && entities.length > 0) {
        toast({
          title: `🎯 Entidades Detectadas`,
          description: `${entities.length} entidades encontradas: ${entities.slice(0, 3).map(e => e.text).join(', ')}`,
        });
      }
    }
  });

  // Análise de contexto conversacional
  const analyzeConversationContext = useCallback(async (newText: string) => {
    try {
      const nlpAnalysis = await nlpProcessor.analyzeText(newText, currentContext);
      
      if (nlpAnalysis.context.conversationFlow === 'topic_change') {
        toast({
          title: "🔄 Mudança de Tópico",
          description: "Detectada mudança de assunto na conversa",
        });
      }
      
      return nlpAnalysis.context;
    } catch (error) {
      console.error('Erro na análise de contexto:', error);
      return null;
    }
  }, [currentContext]);

  // Limpar contexto e histórico
  const clearContext = useCallback(() => {
    setCurrentContext([]);
    setAnalysisHistory([]);
    nlpProcessor.clearHistory();
    
    toast({
      title: "🧹 Contexto Limpo",
      description: "Histórico de conversa foi reiniciado",
    });
  }, []);

  return {
    // Análise principal
    analyzeAdvanced,
    isAnalyzing,
    
    // Análises específicas
    analyzeSentiment,
    isSentimentAnalyzing,
    detectEntities,
    isDetectingEntities,
    analyzeQuick,
    analyzeConversationContext,
    
    // Estado e controle
    analysisHistory,
    currentContext,
    clearContext,
    
    // Utilitários
    getImportanceScore: useCallback(async (text: string) => {
      const analysis = await nlpProcessor.analyzeText(text);
      return analysis.importance;
    }, []),
    
    getSentimentHistory: useCallback(() => {
      return nlpProcessor.getSentimentHistory();
    }, []),
    
    getTopicHistory: useCallback(() => {
      return nlpProcessor.getTopicHistory();
    }, [])
  };
}

/**
 * Determina o tipo de resposta baseado na análise NLP
 */
function determineResponseType(analysis: NLPAnalysis): 'answer' | 'explanation' | 'clarification' | 'suggestion' {
  if (analysis.intent.primary === 'question') {
    if (analysis.intent.subtype.includes('why') || analysis.intent.subtype.includes('how')) {
      return 'explanation';
    } else if (analysis.importance.overall < 0.3) {
      return 'clarification';
    } else {
      return 'answer';
    }
  } else if (analysis.intent.primary === 'request') {
    return 'suggestion';
  } else if (analysis.intent.requiresResponse) {
    return 'answer';
  } else {
    return 'explanation';
  }
}

/**
 * Prepara contexto inteligente baseado na análise NLP
 */
function prepareIntelligentContext(transcription: string, analysis: NLPAnalysis): string {
  let context = transcription;
  
  // Adicionar entidades importantes ao contexto
  if (analysis.entities.length > 0) {
    const importantEntities = analysis.entities
      .filter(e => e.confidence > 0.7)
      .map(e => `${e.type}: ${e.text}`)
      .join(', ');
    
    context += `\n[Entidades importantes: ${importantEntities}]`;
  }
  
  // Adicionar tópicos relevantes
  if (analysis.topics.length > 0) {
    const mainTopics = analysis.topics
      .filter(t => t.relevance > 0.5)
      .map(t => t.topic)
      .join(', ');
    
    context += `\n[Tópicos principais: ${mainTopics}]`;
  }
  
  // Adicionar informação de sentimento se relevante
  if (analysis.sentiment.intensity > 0.5) {
    context += `\n[Tom: ${analysis.sentiment.polarity} (${Math.round(analysis.sentiment.intensity * 100)}%)]`;
  }
  
  return context;
}

/**
 * Hook simples para análise de sentimento
 */
export function useSentimentAnalysis() {
  return useMutation({
    mutationFn: async (text: string) => {
      const analysis = await nlpProcessor.analyzeText(text);
      return analysis.sentiment;
    }
  });
}

/**
 * Hook para detecção de intenções
 */
export function useIntentDetection() {
  return useMutation({
    mutationFn: async (text: string) => {
      const analysis = await nlpProcessor.analyzeText(text);
      return analysis.intent;
    }
  });
}