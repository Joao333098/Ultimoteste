/**
 * Sistema Avançado de NLP para VoiceScribe AI
 * Implementa técnicas avançadas de processamento de linguagem natural
 */

// Tipos para análise avançada de NLP
export interface NLPAnalysis {
  sentiment: SentimentAnalysis;
  intent: IntentDetection;
  entities: EntityExtraction[];
  topics: TopicExtraction[];
  importance: ImportanceScore;
  context: ContextAnalysis;
}

export interface SentimentAnalysis {
  polarity: 'positive' | 'negative' | 'neutral';
  intensity: number; // 0-1
  confidence: number;
  emotions: {
    joy: number;
    anger: number;
    fear: number;
    sadness: number;
    surprise: number;
    disgust: number;
  };
}

export interface IntentDetection {
  primary: 'question' | 'command' | 'statement' | 'exclamation' | 'request';
  confidence: number;
  subtype: string;
  requiresResponse: boolean;
  priority: 'high' | 'medium' | 'low';
}

export interface EntityExtraction {
  text: string;
  type: 'PERSON' | 'LOCATION' | 'DATE' | 'TIME' | 'NUMBER' | 'ORGANIZATION' | 'PRODUCT' | 'EVENT';
  confidence: number;
  startIndex: number;
  endIndex: number;
}

export interface TopicExtraction {
  topic: string;
  relevance: number;
  category: string;
  keywords: string[];
}

export interface ImportanceScore {
  overall: number; // 0-1
  factors: {
    hasQuestion: number;
    hasEntities: number;
    sentimentIntensity: number;
    textLength: number;
    contextRelevance: number;
  };
}

export interface ContextAnalysis {
  previousContext: string[];
  conversationFlow: 'opening' | 'continuation' | 'conclusion' | 'topic_change';
  referenceResolution: string[];
  coherenceScore: number;
}

/**
 * Classe principal para análise avançada de NLP
 */
export class AdvancedNLPProcessor {
  private conversationHistory: string[] = [];
  private topicHistory: TopicExtraction[] = [];
  private sentimentHistory: SentimentAnalysis[] = [];

  /**
   * Análise completa de um texto usando múltiplas técnicas de NLP
   */
  async analyzeText(text: string, context?: string[]): Promise<NLPAnalysis> {
    const [
      sentiment,
      intent,
      entities,
      topics,
      contextAnalysis
    ] = await Promise.all([
      this.analyzeSentiment(text),
      this.detectIntent(text),
      this.extractEntities(text),
      this.extractTopics(text),
      this.analyzeContext(text, context)
    ]);

    const importance = this.calculateImportance(text, sentiment, intent, entities, topics);

    const analysis: NLPAnalysis = {
      sentiment,
      intent,
      entities,
      topics,
      importance,
      context: contextAnalysis
    };

    // Atualizar histórico
    this.updateHistory(text, analysis);

    return analysis;
  }

  /**
   * Análise avançada de sentimento com detecção de emoções
   */
  private async analyzeSentiment(text: string): Promise<SentimentAnalysis> {
    // Palavras-chave para detecção de sentimento e emoções
    const positiveWords = [
      'bom', 'ótimo', 'excelente', 'maravilhoso', 'fantástico', 'perfeito', 'incrível',
      'good', 'great', 'excellent', 'wonderful', 'fantastic', 'perfect', 'amazing',
      'bueno', 'excelente', 'maravilloso', 'fantástico', 'perfecto', 'increíble',
      'feliz', 'alegre', 'contente', 'satisfeito', 'happy', 'glad', 'content', 'satisfied'
    ];

    const negativeWords = [
      'ruim', 'péssimo', 'terrível', 'horrível', 'desastroso', 'problemático',
      'bad', 'terrible', 'horrible', 'awful', 'disastrous', 'problematic',
      'malo', 'terrible', 'horrible', 'desastroso', 'problemático',
      'triste', 'chateado', 'irritado', 'furioso', 'sad', 'upset', 'angry', 'furious'
    ];

    const joyWords = ['feliz', 'alegre', 'contente', 'happy', 'joy', 'cheerful', 'alegría'];
    const angerWords = ['raiva', 'irritado', 'furioso', 'angry', 'mad', 'furious', 'ira'];
    const fearWords = ['medo', 'assustado', 'temor', 'fear', 'scared', 'afraid', 'miedo'];
    const sadnessWords = ['triste', 'deprimido', 'melancólico', 'sad', 'depressed', 'triste'];

    const lowerText = text.toLowerCase();
    
    // Calcular polaridade
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    
    let polarity: 'positive' | 'negative' | 'neutral';
    let intensity = 0;
    
    if (positiveCount > negativeCount) {
      polarity = 'positive';
      intensity = Math.min(1, positiveCount / 10);
    } else if (negativeCount > positiveCount) {
      polarity = 'negative';  
      intensity = Math.min(1, negativeCount / 10);
    } else {
      polarity = 'neutral';
      intensity = 0.1;
    }

    // Calcular emoções específicas
    const emotions = {
      joy: joyWords.filter(word => lowerText.includes(word)).length / 10,
      anger: angerWords.filter(word => lowerText.includes(word)).length / 10,
      fear: fearWords.filter(word => lowerText.includes(word)).length / 10,
      sadness: sadnessWords.filter(word => lowerText.includes(word)).length / 10,
      surprise: (lowerText.match(/[!]/g) || []).length / 10,
      disgust: 0.1
    };

    // Normalizar emoções
    Object.keys(emotions).forEach(key => {
      emotions[key as keyof typeof emotions] = Math.min(1, emotions[key as keyof typeof emotions]);
    });

    return {
      polarity,
      intensity,
      confidence: Math.min(0.95, 0.5 + intensity),
      emotions
    };
  }

  /**
   * Detecção avançada de intenção
   */
  private async detectIntent(text: string): Promise<IntentDetection> {
    const lowerText = text.toLowerCase().trim();
    
    // Padrões avançados para detecção de intenção
    const questionPatterns = [
      /^(que|what|who|where|when|why|how|como|onde|quando|por que|porque|qual|quem|o que|qual é|como é|where is|what is|qué|quién|dónde|cuándo|por qué|cómo)/i,
      /[?¿]/,
      /\b(pergunta|question|dúvida|doubt|pregunta)\b/i,
      /\b(pode|poderia|can|could|puedes|podrías)\b/i
    ];

    const commandPatterns = [
      /^(faça|faça|do|make|haga|realice)/i,
      /^(execute|run|start|stop|pare|inicie|ejecute)/i,
      /^(abra|open|close|feche|abre|cierra)/i,
      /^(salve|save|delete|apague|guarde|elimine)/i
    ];

    const requestPatterns = [
      /\b(por favor|please|por favor|poderia|could you|podrías)\b/i,
      /\b(me ajude|help me|ayúdame)\b/i,
      /\b(preciso|need|necesito)\b/i
    ];

    const exclamationPatterns = [
      /[!]/,
      /\b(uau|wow|incredible|incrível|increíble)\b/i,
      /^(que|how)\s+\w+[!]/i
    ];

    let primary: IntentDetection['primary'] = 'statement';
    let confidence = 0.5;
    let subtype = 'general';
    let requiresResponse = false;
    let priority: 'high' | 'medium' | 'low' = 'low';

    // Detectar intenção primária
    if (questionPatterns.some(pattern => pattern.test(text))) {
      primary = 'question';
      confidence = 0.9;
      subtype = this.detectQuestionSubtype(text);
      requiresResponse = true;
      priority = 'high';
    } else if (commandPatterns.some(pattern => pattern.test(text))) {
      primary = 'command';
      confidence = 0.85;
      subtype = 'action_required';
      requiresResponse = true;
      priority = 'high';
    } else if (requestPatterns.some(pattern => pattern.test(text))) {
      primary = 'request';
      confidence = 0.8;
      subtype = 'assistance';
      requiresResponse = true;
      priority = 'medium';
    } else if (exclamationPatterns.some(pattern => pattern.test(text))) {
      primary = 'exclamation';
      confidence = 0.75;
      subtype = 'emotional';
      requiresResponse = false;
      priority = 'medium';
    }

    return {
      primary,
      confidence,
      subtype,
      requiresResponse,
      priority
    };
  }

  /**
   * Detecta subtipos de perguntas
   */
  private detectQuestionSubtype(text: string): string {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('que') || lowerText.includes('what') || lowerText.includes('qué')) {
      return 'what_question';
    } else if (lowerText.includes('quem') || lowerText.includes('who') || lowerText.includes('quién')) {
      return 'who_question';
    } else if (lowerText.includes('onde') || lowerText.includes('where') || lowerText.includes('dónde')) {
      return 'where_question';
    } else if (lowerText.includes('quando') || lowerText.includes('when') || lowerText.includes('cuándo')) {
      return 'when_question';
    } else if (lowerText.includes('por que') || lowerText.includes('porque') || lowerText.includes('why') || lowerText.includes('por qué')) {
      return 'why_question';
    } else if (lowerText.includes('como') || lowerText.includes('how') || lowerText.includes('cómo')) {
      return 'how_question';
    }
    return 'general_question';
  }

  /**
   * Extração avançada de entidades
   */
  private async extractEntities(text: string): Promise<EntityExtraction[]> {
    const entities: EntityExtraction[] = [];
    
    // Padrões para diferentes tipos de entidades
    const patterns = {
      PERSON: [
        /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, // Nome Sobrenome
        /\b(Sr\.|Sra\.|Dr\.|Dra\.|Prof\.|Profª\.) [A-Z][a-z]+/g, // Títulos + Nome
        /\b(Mr\.|Mrs\.|Dr\.|Prof\.) [A-Z][a-z]+/g
      ],
      LOCATION: [
        /\b(Brasil|Brazil|Portugal|Argentina|México|Spain|Estados Unidos|EUA|USA)\b/g,
        /\b(São Paulo|Rio de Janeiro|Belo Horizonte|Madrid|Barcelona|New York|London)\b/g,
        /\b(em|in|na|no|para|to|desde|from) ([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/g
      ],
      DATE: [
        /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g, // dd/mm/yyyy
        /\b(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/gi,
        /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/gi,
        /\b(hoje|amanhã|ontem|today|tomorrow|yesterday|hoy|mañana|ayer)\b/gi
      ],
      TIME: [
        /\b\d{1,2}:\d{2}(?::\d{2})?\b/g, // HH:MM:SS ou HH:MM
        /\b(manhã|tarde|noite|morning|afternoon|evening|night|mañana|tarde|noche)\b/gi,
        /\b(agora|now|ahora|já|already|ya)\b/gi
      ],
      NUMBER: [
        /\b\d+(?:\.\d+)?\b/g, // Números inteiros e decimais
        /\b(um|uma|dois|duas|três|quatro|cinco|seis|sete|eight|nine|ten|uno|dos|tres)\b/gi
      ],
      ORGANIZATION: [
        /\b([A-Z][a-z]+ (?:Ltda|Ltd|Inc|Corp|S\.A\.|Ltda\.))\b/g,
        /\b(Google|Microsoft|Apple|Amazon|Facebook|Meta|OpenAI|IBM|Oracle)\b/g
      ]
    };

    // Extrair entidades usando padrões
    Object.entries(patterns).forEach(([type, typePatterns]) => {
      typePatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(text)) !== null) {
          entities.push({
            text: match[0],
            type: type as EntityExtraction['type'],
            confidence: 0.8,
            startIndex: match.index,
            endIndex: match.index + match[0].length
          });
        }
      });
    });

    // Remover duplicatas e ordenar por posição
    const uniqueEntities = entities.filter((entity, index, arr) => 
      arr.findIndex(e => e.text === entity.text && e.type === entity.type) === index
    ).sort((a, b) => a.startIndex - b.startIndex);

    return uniqueEntities;
  }

  /**
   * Extração de tópicos principais
   */
  private async extractTopics(text: string): Promise<TopicExtraction[]> {
    const topics: TopicExtraction[] = [];
    
    // Categorias e palavras-chave relacionadas
    const topicCategories = {
      'Tecnologia': ['computador', 'software', 'internet', 'aplicativo', 'sistema', 'programa', 'dados', 'digital', 'tecnologia', 'IA', 'artificial', 'machine learning'],
      'Business': ['negócio', 'empresa', 'vendas', 'marketing', 'cliente', 'lucro', 'investimento', 'estratégia', 'mercado', 'competição'],
      'Saúde': ['saúde', 'medicina', 'hospital', 'médico', 'doença', 'tratamento', 'sintoma', 'exercício', 'dieta', 'bem-estar'],
      'Educação': ['escola', 'universidade', 'educação', 'ensino', 'aprendizagem', 'professor', 'aluno', 'estudo', 'curso', 'conhecimento'],
      'Entretenimento': ['filme', 'música', 'jogo', 'esporte', 'diversão', 'arte', 'cultura', 'teatro', 'cinema', 'show'],
      'Viagem': ['viagem', 'turismo', 'hotel', 'avião', 'férias', 'destino', 'país', 'cidade', 'cultura', 'aventura'],
      'Food': ['comida', 'restaurante', 'receita', 'culinária', 'sabor', 'ingrediente', 'cozinha', 'jantar', 'almoço', 'café']
    };

    const lowerText = text.toLowerCase();

    Object.entries(topicCategories).forEach(([category, keywords]) => {
      const matchedKeywords = keywords.filter(keyword => lowerText.includes(keyword));
      
      if (matchedKeywords.length > 0) {
        const relevance = Math.min(1, matchedKeywords.length / keywords.length * 2);
        
        topics.push({
          topic: category,
          relevance,
          category,
          keywords: matchedKeywords
        });
      }
    });

    return topics.sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * Análise de contexto conversacional
   */
  private async analyzeContext(text: string, context?: string[]): Promise<ContextAnalysis> {
    const previousContext = context || this.conversationHistory;
    
    // Determinar fluxo da conversa
    let conversationFlow: ContextAnalysis['conversationFlow'] = 'continuation';
    
    if (previousContext.length === 0) {
      conversationFlow = 'opening';
    } else if (this.isTopicChange(text, previousContext)) {
      conversationFlow = 'topic_change';
    } else if (this.isConclusion(text)) {
      conversationFlow = 'conclusion';
    }

    // Resolver referências (pronomes, etc.)
    const referenceResolution = this.resolveReferences(text, previousContext);
    
    // Calcular coerência
    const coherenceScore = this.calculateCoherence(text, previousContext);

    return {
      previousContext,
      conversationFlow,
      referenceResolution,
      coherenceScore
    };
  }

  /**
   * Calcula a importância geral de um texto
   */
  private calculateImportance(
    text: string, 
    sentiment: SentimentAnalysis, 
    intent: IntentDetection, 
    entities: EntityExtraction[], 
    topics: TopicExtraction[]
  ): ImportanceScore {
    
    const factors = {
      hasQuestion: intent.primary === 'question' ? 0.8 : (intent.requiresResponse ? 0.6 : 0.2),
      hasEntities: Math.min(1, entities.length * 0.2),
      sentimentIntensity: sentiment.intensity,
      textLength: Math.min(1, text.length / 200),
      contextRelevance: topics.reduce((sum, topic) => sum + topic.relevance, 0) / Math.max(1, topics.length)
    };

    // Calcular pontuação geral ponderada
    const overall = (
      factors.hasQuestion * 0.3 +
      factors.hasEntities * 0.2 +
      factors.sentimentIntensity * 0.2 +
      factors.textLength * 0.1 +
      factors.contextRelevance * 0.2
    );

    return {
      overall: Math.min(1, overall),
      factors
    };
  }

  /**
   * Atualiza histórico de conversa
   */
  private updateHistory(text: string, analysis: NLPAnalysis): void {
    this.conversationHistory.push(text);
    this.sentimentHistory.push(analysis.sentiment);
    this.topicHistory.push(...analysis.topics);

    // Manter apenas os últimos 20 itens
    if (this.conversationHistory.length > 20) {
      this.conversationHistory = this.conversationHistory.slice(-20);
      this.sentimentHistory = this.sentimentHistory.slice(-20);
    }
  }

  /**
   * Detecta mudança de tópico
   */
  private isTopicChange(text: string, previousContext: string[]): boolean {
    if (previousContext.length === 0) return false;
    
    const currentTopics = this.extractSimpleTopics(text);
    const previousTopics = this.extractSimpleTopics(previousContext[previousContext.length - 1]);
    
    const overlap = currentTopics.filter(topic => previousTopics.includes(topic));
    return overlap.length / Math.max(currentTopics.length, previousTopics.length) < 0.3;
  }

  /**
   * Detecta se é uma conclusão
   */
  private isConclusion(text: string): boolean {
    const conclusionWords = [
      'tchau', 'bye', 'goodbye', 'até logo', 'see you', 'adiós', 
      'obrigado', 'thanks', 'thank you', 'gracias',
      'fim', 'end', 'finish', 'terminar', 'concluir', 'finalizar'
    ];
    
    const lowerText = text.toLowerCase();
    return conclusionWords.some(word => lowerText.includes(word));
  }

  /**
   * Resolve referências no texto
   */
  private resolveReferences(text: string, context: string[]): string[] {
    const references: string[] = [];
    const pronouns = ['ele', 'ela', 'isso', 'aquilo', 'that', 'it', 'he', 'she', 'this', 'él', 'ella', 'eso'];
    
    const lowerText = text.toLowerCase();
    pronouns.forEach(pronoun => {
      if (lowerText.includes(pronoun)) {
        // Buscar referência no contexto anterior
        if (context.length > 0) {
          references.push(`${pronoun} -> contexto anterior`);
        }
      }
    });

    return references;
  }

  /**
   * Calcula coerência com o contexto
   */
  private calculateCoherence(text: string, context: string[]): number {
    if (context.length === 0) return 1;
    
    const textWords = this.extractWords(text);
    const contextWords = this.extractWords(context.join(' '));
    
    const overlap = textWords.filter(word => contextWords.includes(word));
    return overlap.length / Math.max(textWords.length, contextWords.length);
  }

  /**
   * Extrai palavras simples para análise
   */
  private extractWords(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2);
  }

  /**
   * Extrai tópicos simples para comparação
   */
  private extractSimpleTopics(text: string): string[] {
    const words = this.extractWords(text);
    return words.filter(word => word.length > 4); // Palavras mais significativas
  }

  /**
   * Obtém histórico de conversa
   */
  getConversationHistory(): string[] {
    return [...this.conversationHistory];
  }

  /**
   * Obtém histórico de sentimentos
   */
  getSentimentHistory(): SentimentAnalysis[] {
    return [...this.sentimentHistory];
  }

  /**
   * Obtém histórico de tópicos
   */
  getTopicHistory(): TopicExtraction[] {
    return [...this.topicHistory];
  }

  /**
   * Limpa histórico
   */
  clearHistory(): void {
    this.conversationHistory = [];
    this.sentimentHistory = [];
    this.topicHistory = [];
  }
}

// Instância singleton para uso global
export const nlpProcessor = new AdvancedNLPProcessor();

/**
 * Função utilitária para análise rápida
 */
export async function quickAnalyze(text: string): Promise<{
  shouldRespond: boolean;
  priority: 'high' | 'medium' | 'low';
  summary: string;
}> {
  const analysis = await nlpProcessor.analyzeText(text);
  
  const shouldRespond = analysis.intent.requiresResponse || analysis.importance.overall > 0.6;
  
  const summary = `${analysis.intent.primary} (${Math.round(analysis.importance.overall * 100)}% importante) - ${analysis.sentiment.polarity}`;
  
  return {
    shouldRespond,
    priority: analysis.intent.priority,
    summary
  };
}