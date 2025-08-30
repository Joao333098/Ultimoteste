
/**
 * Sistema Super Avançado de NLP para VoiceScribe AI
 * Implementa detecção inteligente de perguntas implícitas e matemática
 */

// Tipos para análise super avançada de NLP
export interface SuperNLPAnalysis {
  sentiment: SentimentAnalysis;
  intent: IntentDetection;
  entities: EntityExtraction[];
  topics: TopicExtraction[];
  importance: ImportanceScore;
  context: ContextAnalysis;
  implicitQuestion: ImplicitQuestionAnalysis;
  mathematical: MathematicalAnalysis;
}

export interface ImplicitQuestionAnalysis {
  isImplicitQuestion: boolean;
  questionType: 'doubt' | 'request' | 'mathematical' | 'explanation' | 'confirmation' | 'none';
  confidence: number;
  needsResponse: boolean;
  detectedPatterns: string[];
  reasoning: string;
}

export interface MathematicalAnalysis {
  isMathematical: boolean;
  expression: string;
  operation: 'addition' | 'subtraction' | 'multiplication' | 'division' | 'complex' | 'none';
  numbers: number[];
  result?: number;
  confidence: number;
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
    implicitQuestionScore: number;
    mathematicalScore: number;
  };
}

export interface ContextAnalysis {
  previousContext: string[];
  conversationFlow: 'opening' | 'continuation' | 'conclusion' | 'topic_change';
  referenceResolution: string[];
  coherenceScore: number;
}

/**
 * Classe principal para análise super avançada de NLP
 */
export class SuperAdvancedNLPProcessor {
  private conversationHistory: string[] = [];
  private topicHistory: TopicExtraction[] = [];
  private sentimentHistory: SentimentAnalysis[] = [];

  /**
   * Análise completa super avançada com detecção de perguntas implícitas
   */
  async analyzeText(text: string, context?: string[]): Promise<SuperNLPAnalysis> {
    const [
      sentiment,
      intent,
      entities,
      topics,
      contextAnalysis,
      implicitQuestion,
      mathematical
    ] = await Promise.all([
      this.analyzeSentiment(text),
      this.detectIntent(text),
      this.extractEntities(text),
      this.extractTopics(text),
      this.analyzeContext(text, context),
      this.analyzeImplicitQuestion(text),
      this.analyzeMathematical(text)
    ]);

    const importance = this.calculateImportance(text, sentiment, intent, entities, topics, implicitQuestion, mathematical);

    const analysis: SuperNLPAnalysis = {
      sentiment,
      intent,
      entities,
      topics,
      importance,
      context: contextAnalysis,
      implicitQuestion,
      mathematical
    };

    // Atualizar histórico
    this.updateHistory(text, analysis);

    return analysis;
  }

  /**
   * Análise super avançada de perguntas implícitas
   */
  private async analyzeImplicitQuestion(text: string): Promise<ImplicitQuestionAnalysis> {
    const lowerText = text.toLowerCase().trim();
    let isImplicitQuestion = false;
    let questionType: ImplicitQuestionAnalysis['questionType'] = 'none';
    let confidence = 0.5;
    let needsResponse = false;
    const detectedPatterns: string[] = [];
    let reasoning = '';

    // Padrões de dúvida implícita - SUPER DETALHADOS
    const doubtPatterns = [
      { pattern: /\b(não sei|nao sei|não tenho certeza|nao tenho certeza)\b/i, type: 'doubt', confidence: 0.9 },
      { pattern: /\b(talvez|será que|pode ser|deve ser|acho que|creio que)\b/i, type: 'doubt', confidence: 0.8 },
      { pattern: /\b(tenho dúvida|tenho duvida|não entendi|nao entendi|não compreendi|nao compreendi)\b/i, type: 'doubt', confidence: 0.9 },
      { pattern: /\b(como assim|o que significa|que quer dizer|não entendo|nao entendo)\b/i, type: 'explanation', confidence: 0.85 },
      { pattern: /\b(está certo|esta certo|isso é correto|isso e correto)\?/i, type: 'confirmation', confidence: 0.8 }
    ];

    // Padrões matemáticos implícitos
    const mathImplicitPatterns = [
      { pattern: /\b(quanto é|quanto vale|qual é o resultado|calcule|some|subtraia)\b/i, type: 'mathematical', confidence: 0.95 },
      { pattern: /\d+\s*[+\-*/÷×]\s*\d+/, type: 'mathematical', confidence: 0.98 },
      { pattern: /\b(mais|menos|vezes|dividido)\b.*\d/i, type: 'mathematical', confidence: 0.85 },
      { pattern: /\d+.*\b(mais|menos|vezes|dividido|por)\b.*\d/i, type: 'mathematical', confidence: 0.9 }
    ];

    // Padrões de solicitação implícita
    const requestPatterns = [
      { pattern: /\b(me ajude|preciso|quero|gostaria|poderia|pode)\b/i, type: 'request', confidence: 0.8 },
      { pattern: /\b(como faço|como fazer|me ensina|me mostra|me explica)\b/i, type: 'explanation', confidence: 0.9 },
      { pattern: /\b(não funcionou|nao funcionou|não deu certo|nao deu certo|deu erro)\b/i, type: 'request', confidence: 0.75 }
    ];

    // Padrões de confirmação implícita
    const confirmationPatterns = [
      { pattern: /\b(correto|certo|verdade|exato|mesmo|realmente)\?/i, type: 'confirmation', confidence: 0.8 },
      { pattern: /\b(né|não é|nao e|concorda|acha)\?/i, type: 'confirmation', confidence: 0.7 }
    ];

    // Verificar todos os padrões
    const allPatterns = [...doubtPatterns, ...mathImplicitPatterns, ...requestPatterns, ...confirmationPatterns];
    
    for (const { pattern, type, confidence: patternConfidence } of allPatterns) {
      if (pattern.test(text)) {
        isImplicitQuestion = true;
        questionType = type as ImplicitQuestionAnalysis['questionType'];
        confidence = Math.max(confidence, patternConfidence);
        needsResponse = true;
        detectedPatterns.push(pattern.source);
        reasoning += `Detectado padrão ${type}: ${pattern.source}. `;
      }
    }

    // Análise contextual de tom interrogativo
    if (!isImplicitQuestion) {
      // Padrões de tom duvidoso sem palavras explícitas
      const vaguePatterns = [
        /\b(isso|este|esta|essa|aquilo)\s+(parece|é|está)\b/i,
        /\b(meio|um pouco|mais ou menos|tipo)\b/i,
        /\b(será|deve|pode|poderia)\b/i
      ];

      for (const pattern of vaguePatterns) {
        if (pattern.test(text)) {
          isImplicitQuestion = true;
          questionType = 'doubt';
          confidence = 0.6;
          needsResponse = true;
          detectedPatterns.push('vague_expression');
          reasoning += 'Detectado tom duvidoso implícito. ';
          break;
        }
      }
    }

    // Análise de entonação baseada em pontuação
    if (text.includes('...') || (text.split(' ').length < 5 && !text.includes('.'))) {
      isImplicitQuestion = true;
      questionType = questionType === 'none' ? 'doubt' : questionType;
      confidence = Math.max(confidence, 0.7);
      needsResponse = true;
      detectedPatterns.push('incomplete_thought');
      reasoning += 'Pensamento incompleto detectado. ';
    }

    if (!reasoning) {
      reasoning = 'Nenhum padrão de pergunta implícita detectado.';
    }

    return {
      isImplicitQuestion,
      questionType,
      confidence,
      needsResponse,
      detectedPatterns,
      reasoning: reasoning.trim()
    };
  }

  /**
   * Análise matemática super avançada
   */
  private async analyzeMathematical(text: string): Promise<MathematicalAnalysis> {
    let isMathematical = false;
    let expression = '';
    let operation: MathematicalAnalysis['operation'] = 'none';
    let numbers: number[] = [];
    let result: number | undefined;
    let confidence = 0;

    // Extrair números do texto
    const numberMatches = text.match(/\d+(?:\.\d+)?/g);
    if (numberMatches) {
      numbers = numberMatches.map(n => parseFloat(n));
    }

    // Padrões matemáticos explícitos
    const explicitMathPatterns = [
      { pattern: /(\d+(?:\.\d+)?)\s*\+\s*(\d+(?:\.\d+)?)/, operation: 'addition' as const, confidence: 0.98 },
      { pattern: /(\d+(?:\.\d+)?)\s*\-\s*(\d+(?:\.\d+)?)/, operation: 'subtraction' as const, confidence: 0.98 },
      { pattern: /(\d+(?:\.\d+)?)\s*\*\s*(\d+(?:\.\d+)?)/, operation: 'multiplication' as const, confidence: 0.98 },
      { pattern: /(\d+(?:\.\d+)?)\s*[\/÷]\s*(\d+(?:\.\d+)?)/, operation: 'division' as const, confidence: 0.98 },
      { pattern: /(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)/, operation: 'multiplication' as const, confidence: 0.98 }
    ];

    for (const { pattern, operation: op, confidence: conf } of explicitMathPatterns) {
      const match = text.match(pattern);
      if (match) {
        isMathematical = true;
        expression = match[0];
        operation = op;
        confidence = conf;
        
        const num1 = parseFloat(match[1]);
        const num2 = parseFloat(match[2]);
        numbers = [num1, num2];

        // Calcular resultado
        switch (operation) {
          case 'addition':
            result = num1 + num2;
            break;
          case 'subtraction':
            result = num1 - num2;
            break;
          case 'multiplication':
            result = num1 * num2;
            break;
          case 'division':
            result = num2 !== 0 ? num1 / num2 : undefined;
            break;
        }
        break;
      }
    }

    // Padrões matemáticos por extenso
    if (!isMathematical) {
      const wordMathPatterns = [
        { pattern: /(\d+(?:\.\d+)?)\s+mais\s+(\d+(?:\.\d+)?)/i, operation: 'addition' as const, confidence: 0.9 },
        { pattern: /(\d+(?:\.\d+)?)\s+menos\s+(\d+(?:\.\d+)?)/i, operation: 'subtraction' as const, confidence: 0.9 },
        { pattern: /(\d+(?:\.\d+)?)\s+vezes\s+(\d+(?:\.\d+)?)/i, operation: 'multiplication' as const, confidence: 0.9 },
        { pattern: /(\d+(?:\.\d+)?)\s+dividido\s+por\s+(\d+(?:\.\d+)?)/i, operation: 'division' as const, confidence: 0.9 }
      ];

      for (const { pattern, operation: op, confidence: conf } of wordMathPatterns) {
        const match = text.match(pattern);
        if (match) {
          isMathematical = true;
          expression = match[0];
          operation = op;
          confidence = conf;
          
          const num1 = parseFloat(match[1]);
          const num2 = parseFloat(match[2]);
          numbers = [num1, num2];

          // Calcular resultado
          switch (operation) {
            case 'addition':
              result = num1 + num2;
              break;
            case 'subtraction':
              result = num1 - num2;
              break;
            case 'multiplication':
              result = num1 * num2;
              break;
            case 'division':
              result = num2 !== 0 ? num1 / num2 : undefined;
              break;
          }
          break;
        }
      }
    }

    // Padrões de pergunta matemática
    if (!isMathematical && numbers.length >= 2) {
      const mathQuestionPatterns = [
        /quanto\s+é/i,
        /qual\s+é\s+o\s+resultado/i,
        /calcule/i,
        /some/i,
        /subtraia/i,
        /multiplique/i,
        /divida/i
      ];

      for (const pattern of mathQuestionPatterns) {
        if (pattern.test(text)) {
          isMathematical = true;
          expression = text;
          operation = 'complex';
          confidence = 0.8;
          break;
        }
      }
    }

    return {
      isMathematical,
      expression,
      operation,
      numbers,
      result,
      confidence
    };
  }

  /**
   * Análise avançada de sentimento
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
      'Matemática': ['calcular', 'somar', 'subtrair', 'multiplicar', 'dividir', 'número', 'resultado', 'conta', 'operação', 'matemática'],
      'Business': ['negócio', 'empresa', 'vendas', 'marketing', 'cliente', 'lucro', 'investimento', 'estratégia', 'mercado', 'competição'],
      'Saúde': ['saúde', 'medicina', 'hospital', 'médico', 'doença', 'tratamento', 'sintoma', 'exercício', 'dieta', 'bem-estar'],
      'Educação': ['escola', 'universidade', 'educação', 'ensino', 'aprendizagem', 'professor', 'aluno', 'estudo', 'curso', 'conhecimento'],
      'Entretenimento': ['filme', 'música', 'jogo', 'esporte', 'diversão', 'arte', 'cultura', 'teatro', 'cinema', 'show']
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
   * Calcula a importância geral de um texto - VERSÃO SUPER AVANÇADA
   */
  private calculateImportance(
    text: string, 
    sentiment: SentimentAnalysis, 
    intent: IntentDetection, 
    entities: EntityExtraction[], 
    topics: TopicExtraction[],
    implicitQuestion: ImplicitQuestionAnalysis,
    mathematical: MathematicalAnalysis
  ): ImportanceScore {
    
    const factors = {
      hasQuestion: intent.primary === 'question' ? 0.8 : (intent.requiresResponse ? 0.6 : 0.2),
      hasEntities: Math.min(1, entities.length * 0.2),
      sentimentIntensity: sentiment.intensity,
      textLength: Math.min(1, text.length / 200),
      contextRelevance: topics.reduce((sum, topic) => sum + topic.relevance, 0) / Math.max(1, topics.length),
      implicitQuestionScore: implicitQuestion.isImplicitQuestion ? implicitQuestion.confidence : 0,
      mathematicalScore: mathematical.isMathematical ? mathematical.confidence : 0
    };

    // Calcular pontuação geral ponderada - NOVA FÓRMULA
    const overall = (
      factors.hasQuestion * 0.25 +
      factors.hasEntities * 0.15 +
      factors.sentimentIntensity * 0.15 +
      factors.textLength * 0.05 +
      factors.contextRelevance * 0.15 +
      factors.implicitQuestionScore * 0.15 +  // NOVO: peso para perguntas implícitas
      factors.mathematicalScore * 0.10        // NOVO: peso para matemática
    );

    return {
      overall: Math.min(1, overall),
      factors
    };
  }

  /**
   * Atualiza histórico de conversa
   */
  private updateHistory(text: string, analysis: SuperNLPAnalysis): void {
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
export const nlpProcessor = new SuperAdvancedNLPProcessor();

// Compatibilidade com versão anterior
export type NLPAnalysis = SuperNLPAnalysis;

/**
 * Função utilitária para análise super rápida e inteligente
 */
export async function quickAnalyze(text: string): Promise<{
  shouldRespond: boolean;
  priority: 'high' | 'medium' | 'low';
  summary: string;
  isImplicitQuestion: boolean;
  isMathematical: boolean;
  confidence: number;
}> {
  const analysis = await nlpProcessor.analyzeText(text);
  
  const shouldRespond = analysis.intent.requiresResponse || 
                       analysis.importance.overall > 0.6 ||
                       analysis.implicitQuestion.needsResponse ||
                       analysis.mathematical.isMathematical;
  
  const summary = `${analysis.intent.primary} (${Math.round(analysis.importance.overall * 100)}% importante) - ${analysis.sentiment.polarity}${
    analysis.implicitQuestion.isImplicitQuestion ? ' - Pergunta Implícita' : ''
  }${
    analysis.mathematical.isMathematical ? ' - Matemático' : ''
  }`;
  
  return {
    shouldRespond,
    priority: analysis.intent.priority,
    summary,
    isImplicitQuestion: analysis.implicitQuestion.isImplicitQuestion,
    isMathematical: analysis.mathematical.isMathematical,
    confidence: Math.max(analysis.intent.confidence, analysis.implicitQuestion.confidence, analysis.mathematical.confidence)
  };
}
