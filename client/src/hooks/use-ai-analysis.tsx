import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface AnalyzeContentParams {
  transcription: string;
  question: string;
}

interface AnalysisResult {
  answer: string;
  confidence: number;
  relatedTopics: string[];
}

interface UseAiAnalysisOptions {
  onSuccess?: (data: AnalysisResult) => void;
  onError?: (error: Error) => void;
}

export function useAiAnalysis({ onSuccess, onError }: UseAiAnalysisOptions = {}) {
  return useMutation({
    mutationFn: async ({ transcription, question }: AnalyzeContentParams): Promise<AnalysisResult> => {
      const response = await apiRequest('POST', '/api/ai/analyze', {
        transcription,
        question
      });
      return response.json();
    },
    onSuccess,
    onError
  });
}

export function useGenerateSummary() {
  return useMutation({
    mutationFn: async (transcription: string): Promise<{ summary: string }> => {
      const response = await apiRequest('POST', '/api/ai/summary', {
        transcription
      });
      return response.json();
    }
  });
}

export function useLanguageDetection() {
  return useMutation({
    mutationFn: async (text: string): Promise<{
      language: string;
      confidence: number;
      languageCode: string;
    }> => {
      const response = await apiRequest('POST', '/api/ai/detect-language', {
        text
      });
      return response.json();
    }
  });
}

export function useSentimentAnalysis() {
  return useMutation({
    mutationFn: async (text: string): Promise<{
      rating: number;
      confidence: number;
      sentiment: string;
    }> => {
      const response = await apiRequest('POST', '/api/ai/sentiment', {
        text
      });
      return response.json();
    }
  });
}

export function useTextEnhancement() {
  return useMutation({
    mutationFn: async ({ text, targetLanguage }: { text: string; targetLanguage?: string }): Promise<{
      enhancedText: string;
      corrections: string[];
      confidence: number;
    }> => {
      const response = await apiRequest('POST', '/api/ai/enhance', {
        text,
        targetLanguage
      });
      return response.json();
    }
  });
}
