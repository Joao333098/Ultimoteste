/**
 * Backend NLP Services para análise avançada
 * Integra com GLM-4 para análise inteligente
 */

import axios from 'axios';
import { config } from '../config';

// Helper function para fazer requests para GLM-4
async function callGLM4API(prompt: string, options: {
  temperature?: number;
  max_tokens?: number;
} = {}): Promise<string> {
  try {
    const response = await axios.post(
      config.ai.endpoint,
      {
        model: config.ai.model,
        messages: [{
          role: "user",
          content: prompt
        }],
        temperature: options.temperature || 0.3,
        max_tokens: options.max_tokens || 500
      },
      {
        headers: {
          'Authorization': `Bearer ${config.GLM4_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    return response.data.choices[0].message.content;
  } catch (error: any) {
    console.error('Erro na API GLM-4:', error.message);
    throw new Error('Falha na comunicação com a API GLM-4');
  }
}

// Interface para resultado de análise avançada
export interface AdvancedAnalysisResult {
  answer: string;
  confidence: number;
  relatedTopics: string[];
  responseType: 'answer' | 'explanation' | 'clarification' | 'suggestion';
  contextAware: boolean;
  reasoning: string;
  additionalInsights: string[];
}

// Análise avançada de sentimento com GLM-4
export async function analyzeAdvancedSentiment(text: string): Promise<{
  sentiment: 'positive' | 'negative' | 'neutral';
  intensity: number;
  confidence: number;
  emotions: {
    joy: number;
    anger: number;
    fear: number;
    sadness: number;
    surprise: number;
    disgust: number;
  };
  explanation: string;
}> {
  try {
    const prompt = `Analise o sentimento do seguinte texto de forma muito detalhada:

TEXTO: "${text}"

Faça uma análise profunda incluindo:
1. Sentimento geral (positive/negative/neutral)
2. Intensidade (0-1)
3. Confiança na análise (0-1) 
4. Emoções específicas (joy, anger, fear, sadness, surprise, disgust) em escala 0-1
5. Explicação do raciocínio

Responda em formato JSON:
{
  "sentiment": "positive|negative|neutral",
  "intensity": 0.8,
  "confidence": 0.9,
  "emotions": {
    "joy": 0.7,
    "anger": 0.1,
    "fear": 0.0,
    "sadness": 0.1,
    "surprise": 0.2,
    "disgust": 0.0
  },
  "explanation": "Explicação detalhada da análise"
}`;

    const responseText = await callGLM4API(prompt, {
      temperature: 0.3,
      max_tokens: 500
    });

    try {
      const parsed = JSON.parse(responseText);
      return {
        sentiment: parsed.sentiment || 'neutral',
        intensity: Math.max(0, Math.min(1, parsed.intensity || 0.5)),
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.7)),
        emotions: {
          joy: Math.max(0, Math.min(1, parsed.emotions?.joy || 0)),
          anger: Math.max(0, Math.min(1, parsed.emotions?.anger || 0)),
          fear: Math.max(0, Math.min(1, parsed.emotions?.fear || 0)),
          sadness: Math.max(0, Math.min(1, parsed.emotions?.sadness || 0)),
          surprise: Math.max(0, Math.min(1, parsed.emotions?.surprise || 0)),
          disgust: Math.max(0, Math.min(1, parsed.emotions?.disgust || 0))
        },
        explanation: parsed.explanation || "Análise de sentimento concluída"
      };
    } catch (parseError) {
      console.error('Erro ao parsear resposta de sentimento:', parseError);
      return {
        sentiment: 'neutral',
        intensity: 0.5,
        confidence: 0.3,
        emotions: { joy: 0, anger: 0, fear: 0, sadness: 0, surprise: 0, disgust: 0 },
        explanation: "Erro na análise - resposta padrão"
      };
    }
  } catch (error) {
    console.error('Erro na análise de sentimento avançada:', error);
    throw new Error('Falha na análise de sentimento');
  }
}

// Detecção avançada de intenções
export async function detectAdvancedIntent(text: string, context?: string[]): Promise<{
  primary: 'question' | 'command' | 'statement' | 'exclamation' | 'request';
  confidence: number;
  subtype: string;
  requiresResponse: boolean;
  priority: 'high' | 'medium' | 'low';
  reasoning: string;
  suggestedActions: string[];
}> {
  try {
    const contextInfo = context && context.length > 0 
      ? `\nCONTEXTO ANTERIOR:\n${context.slice(-3).join('\n')}`
      : '';

    const prompt = `Analise a intenção do seguinte texto de forma muito precisa:

TEXTO: "${text}"${contextInfo}

Determine:
1. Intenção primária: question, command, statement, exclamation, ou request
2. Confiança na análise (0-1)
3. Subtipo específico da intenção
4. Se requer resposta (true/false)
5. Prioridade: high, medium, ou low
6. Raciocínio da análise
7. Ações sugeridas

Responda em formato JSON:
{
  "primary": "question|command|statement|exclamation|request",
  "confidence": 0.9,
  "subtype": "what_question|general_statement|etc",
  "requiresResponse": true,
  "priority": "high|medium|low",
  "reasoning": "Explicação do raciocínio",
  "suggestedActions": ["ação1", "ação2"]
}`;

    const responseText = await callGLM4API(prompt, {
      temperature: 0.2,
      max_tokens: 400
    });

    try {
      const parsed = JSON.parse(responseText);
      return {
        primary: parsed.primary || 'statement',
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.7)),
        subtype: parsed.subtype || 'general',
        requiresResponse: Boolean(parsed.requiresResponse),
        priority: parsed.priority || 'medium',
        reasoning: parsed.reasoning || "Análise de intenção concluída",
        suggestedActions: Array.isArray(parsed.suggestedActions) ? parsed.suggestedActions : []
      };
    } catch (parseError) {
      console.error('Erro ao parsear resposta de intenção:', parseError);
      return {
        primary: 'statement',
        confidence: 0.3,
        subtype: 'general',
        requiresResponse: false,
        priority: 'low',
        reasoning: "Erro na análise - resposta padrão",
        suggestedActions: []
      };
    }
  } catch (error) {
    console.error('Erro na detecção de intenção avançada:', error);
    throw new Error('Falha na detecção de intenção');
  }
}

// Extração avançada de entidades
export async function extractAdvancedEntities(text: string): Promise<{
  entities: Array<{
    text: string;
    type: string;
    confidence: number;
    startIndex: number;
    endIndex: number;
    description: string;
  }>;
  summary: string;
}> {
  try {
    const prompt = `Extraia todas as entidades importantes do seguinte texto:

TEXTO: "${text}"

Identifique e extraia:
- PESSOAS (nomes, títulos, profissões)
- LUGARES (países, cidades, endereços)
- ORGANIZAÇÕES (empresas, instituições)
- DATAS E HORÁRIOS
- NÚMEROS E VALORES
- PRODUTOS E MARCAS
- EVENTOS

Para cada entidade, forneça:
- Texto exato
- Tipo da entidade
- Confiança (0-1)
- Posição no texto
- Breve descrição

Responda em formato JSON:
{
  "entities": [
    {
      "text": "São Paulo",
      "type": "LOCATION",
      "confidence": 0.95,
      "startIndex": 10,
      "endIndex": 19,
      "description": "Cidade no Brasil"
    }
  ],
  "summary": "Resumo das entidades encontradas"
}`;

    const responseText = await callGLM4API(prompt, {
      temperature: 0.1,
      max_tokens: 600
    });

    try {
      const parsed = JSON.parse(responseText);
      return {
        entities: Array.isArray(parsed.entities) ? parsed.entities.map((entity: any) => ({
          text: entity.text || '',
          type: entity.type || 'UNKNOWN',
          confidence: Math.max(0, Math.min(1, entity.confidence || 0.5)),
          startIndex: Math.max(0, entity.startIndex || 0),
          endIndex: Math.max(0, entity.endIndex || 0),
          description: entity.description || ''
        })) : [],
        summary: parsed.summary || "Extração de entidades concluída"
      };
    } catch (parseError) {
      console.error('Erro ao parsear resposta de entidades:', parseError);
      return {
        entities: [],
        summary: "Erro na extração - nenhuma entidade encontrada"
      };
    }
  } catch (error) {
    console.error('Erro na extração de entidades avançada:', error);
    throw new Error('Falha na extração de entidades');
  }
}

// Análise contextual avançada
export async function analyzeAdvancedContent(
  transcription: string,
  question: string,
  nlpAnalysis?: any,
  context?: string[],
  responseType: 'answer' | 'explanation' | 'clarification' | 'suggestion' = 'answer'
): Promise<AdvancedAnalysisResult> {
  try {
    const contextInfo = context && context.length > 0 
      ? `\n\nCONTEXTO DA CONVERSA ANTERIOR:\n${context.join('\n')}`
      : '';

    const nlpInfo = nlpAnalysis 
      ? `\n\nANÁLISE NLP PRÉVIA:
- Sentimento: ${nlpAnalysis.sentiment?.polarity} (${Math.round((nlpAnalysis.sentiment?.intensity || 0) * 100)}%)
- Intenção: ${nlpAnalysis.intent?.primary} - ${nlpAnalysis.intent?.subtype}
- Importância: ${Math.round((nlpAnalysis.importance?.overall || 0) * 100)}%
- Entidades: ${nlpAnalysis.entities?.map((e: any) => e.text).join(', ') || 'Nenhuma'}
- Tópicos: ${nlpAnalysis.topics?.map((t: any) => t.topic).join(', ') || 'Nenhum'}`
      : '';

    let promptInstruction = '';
    switch (responseType) {
      case 'explanation':
        promptInstruction = 'Forneça uma explicação detalhada e educativa.';
        break;
      case 'clarification':
        promptInstruction = 'Peça esclarecimentos ou forneça uma resposta breve.';
        break;
      case 'suggestion':
        promptInstruction = 'Ofereça sugestões práticas e úteis.';
        break;
      default:
        promptInstruction = 'Forneça uma resposta direta e precisa.';
    }

    const prompt = `Você é uma IA especialista em análise inteligente de texto. ${promptInstruction}

TRANSCRIÇÃO: "${transcription}"

PERGUNTA/SOLICITAÇÃO: "${question}"${contextInfo}${nlpInfo}

Com base na análise completa, forneça uma resposta estruturada em JSON:
{
  "answer": "Resposta principal detalhada",
  "confidence": 0.9,
  "relatedTopics": ["tópico1", "tópico2", "tópico3"],
  "reasoning": "Explicação do raciocínio usado",
  "additionalInsights": ["insight1", "insight2"],
  "contextAware": true
}

Seja inteligente, contextual e útil. Use toda a informação disponível para dar a melhor resposta possível.`;

    const responseText = await callGLM4API(prompt, {
      temperature: 0.4,
      max_tokens: 800
    });

    try {
      const parsed = JSON.parse(responseText);
      return {
        answer: parsed.answer || "Não foi possível gerar uma resposta adequada.",
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.7)),
        relatedTopics: Array.isArray(parsed.relatedTopics) ? parsed.relatedTopics : [],
        responseType,
        contextAware: Boolean(parsed.contextAware),
        reasoning: parsed.reasoning || "Análise contextual aplicada",
        additionalInsights: Array.isArray(parsed.additionalInsights) ? parsed.additionalInsights : []
      };
    } catch (parseError) {
      console.error('Erro ao parsear resposta de análise avançada:', parseError);
      return {
        answer: responseText || "Não foi possível processar a solicitação.",
        confidence: 0.6,
        relatedTopics: ['análise', 'transcrição'],
        responseType,
        contextAware: false,
        reasoning: "Resposta direta sem parse JSON",
        additionalInsights: []
      };
    }
  } catch (error) {
    console.error('Erro na análise avançada de conteúdo:', error);
    throw new Error('Falha na análise avançada de conteúdo');
  }
}

// Detecção inteligente de tópicos
export async function extractAdvancedTopics(text: string): Promise<{
  topics: Array<{
    topic: string;
    relevance: number;
    category: string;
    keywords: string[];
    confidence: number;
  }>;
  mainTheme: string;
  summary: string;
}> {
  try {
    const prompt = `Analise o seguinte texto e extraia os tópicos principais:

TEXTO: "${text}"

Identifique:
1. Tópicos principais e sua relevância (0-1)
2. Categoria de cada tópico
3. Palavras-chave relacionadas
4. Tema principal geral
5. Confiança na detecção

Responda em formato JSON:
{
  "topics": [
    {
      "topic": "Tecnologia",
      "relevance": 0.8,
      "category": "Tech",
      "keywords": ["software", "app", "sistema"],
      "confidence": 0.9
    }
  ],
  "mainTheme": "Tema principal do texto",
  "summary": "Resumo dos tópicos encontrados"
}`;

    const responseText = await callGLM4API(prompt, {
      temperature: 0.3,
      max_tokens: 500
    });

    try {
      const parsed = JSON.parse(responseText);
      return {
        topics: Array.isArray(parsed.topics) ? parsed.topics.map((topic: any) => ({
          topic: topic.topic || 'Desconhecido',
          relevance: Math.max(0, Math.min(1, topic.relevance || 0.5)),
          category: topic.category || 'Geral',
          keywords: Array.isArray(topic.keywords) ? topic.keywords : [],
          confidence: Math.max(0, Math.min(1, topic.confidence || 0.7))
        })) : [],
        mainTheme: parsed.mainTheme || "Tema não identificado",
        summary: parsed.summary || "Análise de tópicos concluída"
      };
    } catch (parseError) {
      console.error('Erro ao parsear resposta de tópicos:', parseError);
      return {
        topics: [],
        mainTheme: "Erro na análise",
        summary: "Não foi possível extrair tópicos"
      };
    }
  } catch (error) {
    console.error('Erro na extração avançada de tópicos:', error);
    throw new Error('Falha na extração de tópicos');
  }
}