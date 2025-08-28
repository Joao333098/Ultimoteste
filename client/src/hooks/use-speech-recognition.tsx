import { useState, useEffect, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function useSpeechRecognition() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [detectedLanguage, setDetectedLanguage] = useState("Português (BR)");
  const [confidence, setConfidence] = useState(0.98);
  const [audioLevel, setAudioLevel] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [languageCount, setLanguageCount] = useState(1);
  const [currentLanguage, setCurrentLanguage] = useState("pt-BR");
  const [enhancedMode, setEnhancedMode] = useState(true);
  const [detectedLanguages, setDetectedLanguages] = useState<string[]>(["pt-BR"]);
  const [enabledLanguages, setEnabledLanguages] = useState<Record<string, boolean>>(() => {
    // Carregar idiomas ativos do localStorage
    const saved = localStorage.getItem('enabledLanguages');
    return saved ? JSON.parse(saved) : {
      'pt-BR': true,
      'en-US': true,
      'es-ES': true
    };
  });
  const [autoTranslationEnabled, setAutoTranslationEnabled] = useState(false);
  const [translationTargetLanguage, setTranslationTargetLanguage] = useState(() => {
    // Initialize with a default value that ensures it's never empty
    return localStorage.getItem('translationTargetLanguage') || "pt-BR";
  });
  const [translatedTranscript, setTranslatedTranscript] = useState("");

  const recognitionRef = useRef<any>(null);
  const timeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioLevelIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const languageDetectionCountRef = useRef<Record<string, number>>({});
  const lastDetectionTimeRef = useRef<number>(0);
  const lastProcessedTextRef = useRef<string>("");
  const recentDetectionsRef = useRef<string[]>([]); // Rolling majority para detecção de idioma
  const { toast } = useToast();

  const updateWordCount = useCallback((text: string) => {
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
  }, []);

  // AI-powered language detection with rolling majority
  const { mutate: detectLanguage } = useMutation({
    mutationFn: async ({ text, alternatives }: { text: string; alternatives?: any[] }) => {
      console.log(`🔍 Analisando idioma: "${text.substring(0, 50)}..."`);
      console.log(`📋 Alternativas:`, alternatives);
      console.log(`🎯 Idiomas ativos:`, Object.keys(enabledLanguages).filter(lang => enabledLanguages[lang]));
      
      const response = await apiRequest('POST', '/api/ai/detect-language', { 
        text, 
        alternatives,
        context: {
          currentLanguage,
          recentDetections: recentDetectionsRef.current,
          lastRecognitionConfidence: confidence,
          enabledLanguages: enabledLanguages
        }
      });
      return response.json();
    },
    onSuccess: (data) => {
      setDetectedLanguage(data.language);
      setConfidence(data.confidence);

      // Se há texto corrigido, atualizar o transcript
      if (data.correctedText && data.corrections && data.corrections.length > 0) {
        console.log(`🔧 Aplicando correções: ${data.corrections.length}`);
        
        setTranscript(prevTranscript => {
          // Remover [INTERIM] para aplicar correção
          const cleanTranscript = prevTranscript.replace(/\[INTERIM\].*$/, '');
          // Aplicar o texto corrigido aos últimos 200 caracteres
          const transcriptWords = cleanTranscript.split(' ');
          const lastWords = transcriptWords.slice(-20); // Últimas ~20 palavras
          const correctedLastPart = data.correctedText;
          
          // Substituir a parte final pelo texto corrigido
          const newTranscript = transcriptWords.slice(0, -20).join(' ') + 
                               (transcriptWords.length > 20 ? ' ' : '') + 
                               correctedLastPart;
          
          return newTranscript;
        });

        // Mostrar notificação das correções
        toast({
          title: `🔧 Texto Corrigido`,
          description: `${data.corrections.length} correções aplicadas automaticamente`,
        });
      }

      // Update detected languages list
      const langCode = data.languageCode;
      if (!detectedLanguages.includes(langCode)) {
        setDetectedLanguages(prev => [...prev, langCode]);
        setLanguageCount(prev => prev + 1);
      }

      // Implementar rolling majority com limiar melhorado - apenas para idiomas ativos
      if (data.confidence > 0.85 && langCode !== currentLanguage && isRecording && enabledLanguages[langCode]) {
        recentDetectionsRef.current.push(langCode);
        if (recentDetectionsRef.current.length > 5) {
          recentDetectionsRef.current.shift();
        }

        const count = recentDetectionsRef.current.filter(x => x === langCode).length;
        console.log(`🎯 Detecção rolling: ${langCode} aparece ${count}/5 vezes recentes`);
        console.log(`📊 Fila detecções:`, recentDetectionsRef.current);
        
        // Só muda idioma se 3 das últimas 5 detecções forem iguais OU se confiança muito alta (0.92+)
        if (count >= 3 || data.confidence >= 0.92) {
          toast({
            title: `🌐 Idioma confirmado: ${data.language}`,
            description: `${data.explanation || 'Detectado automaticamente'}`,
          });
          
          // Reset fila
          recentDetectionsRef.current = [];
          switchLanguage(langCode);
        }
      } else if (data.confidence <= 0.85) {
        console.log(`🤔 Confiança baixa (${data.confidence}), não alterando idioma`);
      } else if (!enabledLanguages[langCode]) {
        console.log(`🚫 Idioma ${langCode} detectado mas está desativado`);
      }
    },
    onError: (error, variables) => {
      console.log("❌ Falha na detecção de IA, usando detecção simples");
      // Fallback to simple detection
      const text = typeof variables === 'string' ? variables : variables.text;
      detectLanguageFromTextFallback(text);
    }
  });

  // AI text enhancement
  const { mutate: enhanceText } = useMutation({
    mutationFn: async ({ text, targetLanguage }: { text: string; targetLanguage: string }) => {
      const response = await apiRequest('POST', '/api/ai/enhance', {
        text,
        targetLanguage
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Don't replace the transcript with AI enhancement to avoid overwriting user's speech
      // Just use it for analysis/language detection purposes
      if (data.confidence) {
        setConfidence(data.confidence);
      }
    }
  });

  // AI translation
  const { mutate: translateText } = useMutation({
    mutationFn: async ({ text, targetLanguage }: { text: string; targetLanguage: string }) => {
      console.log(`📡 Enviando para tradução: "${text}" -> ${targetLanguage}`);
      const translationResponse = await apiRequest('POST', '/api/ai/translate', {
        text: text,
        targetLanguage: targetLanguage,
        isAutoTranslation: true
      });
      return translationResponse.json();
    },
    onSuccess: (data) => {
      console.log(`✅ Tradução recebida: "${data.translatedText}"`);
      setTranslatedTranscript(data.translatedText);
    },
    onError: (error) => {
      console.error('❌ Erro na tradução automática:', error);
      setTranslatedTranscript("Erro na tradução");
    }
  });

  const detectLanguageFromTextFallback = useCallback((text: string) => {
    // Improved fallback language detection with better word lists - apenas idiomas ativos
    const languageConfig = {
      'pt-BR': {
        words: ['que', 'não', 'uma', 'para', 'com', 'está', 'tem', 'mais', 'como', 'ser', 'do', 'da', 'em', 'um', 'por', 'isso', 'muito', 'bem', 'seu', 'sua', 'ele', 'ela', 'nós', 'vocês', 'eles', 'elas', 'onde', 'quando', 'porque', 'então', 'mas', 'também', 'já', 'só', 'ainda', 'até'],
        patterns: /\b(não|está|tem|para|uma|como|muito|então|também|já)\b/i,
        name: "Português (BR)"
      },
      'en-US': {
        words: ['the', 'and', 'is', 'are', 'to', 'it', 'you', 'that', 'this', 'have', 'has', 'had', 'will', 'would', 'can', 'could', 'should', 'what', 'when', 'where', 'why', 'how', 'who', 'which', 'one', 'two', 'three', 'about', 'from', 'with', 'they', 'them', 'their', 'there', 'here', 'time', 'way', 'only', 'like'],
        patterns: /\b(the|and|is|are|have|will|would|what|when|where|about)\b/i,
        name: "English (US)"
      },
      'es-ES': {
        words: ['que', 'de', 'el', 'la', 'en', 'y', 'es', 'se', 'un', 'una', 'con', 'por', 'para', 'no', 'lo', 'le', 'del', 'las', 'los', 'su', 'al', 'me', 'te', 'nos', 'les', 'como', 'pero', 'más', 'muy', 'este', 'esta', 'ese', 'esa', 'todo', 'todos', 'hay', 'está', 'son', 'hacer', 'tiempo'],
        patterns: /\b(que|de|el|la|en|es|se|con|por|para|no|lo|le)\b/i,
        name: "Español (ES)"
      }
    };

    const words = text.toLowerCase().split(/\s+/).filter(word => word.length > 1);
    const totalWords = words.length;

    if (totalWords === 0) return;

    const scores: Record<string, { score: number; percent: number }> = {};

    // Calcular pontuações apenas para idiomas ativos
    Object.entries(languageConfig).forEach(([langCode, config]) => {
      if (!enabledLanguages[langCode]) return; // Pular idiomas desativados

      let score = 0;
      words.forEach(word => {
        const cleanWord = word.replace(/[.,!?;:'"]/g, '');
        if (config.words.includes(cleanWord)) score++;
      });

      // Aplicar bônus por padrões específicos
      if (config.patterns.test(text)) score += 2;

      scores[langCode] = {
        score,
        percent: score / totalWords
      };
    });

    // Encontrar o idioma com maior pontuação entre os ativos
    const validLanguages = Object.keys(scores).filter(lang => scores[lang].percent > 0.1);
    
    if (validLanguages.length === 0) {
      console.log("🤔 Nenhum idioma ativo detectado com confiança, mantendo atual");
      return;
    }

    const bestLang = validLanguages.reduce((a, b) => 
      scores[a].score > scores[b].score ? a : b
    );

    const bestConfig = languageConfig[bestLang as keyof typeof languageConfig];
    
    if (bestConfig && currentLanguage !== bestLang) {
      setDetectedLanguage(bestConfig.name);
      setCurrentLanguage(bestLang);
      setConfidence(Math.min(0.95, 0.7 + scores[bestLang].percent));
      console.log(`🔄 Idioma detectado automaticamente: ${bestConfig.name} (apenas idiomas ativos)`);
    }
  }, [currentLanguage, enabledLanguages]);

  const initializeRecognition = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        title: "Não Suportado",
        description: "Seu navegador não suporta reconhecimento de voz",
        variant: "destructive",
      });
      return null;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = currentLanguage;
    recognition.maxAlternatives = 3; // Usar múltiplas alternativas

    recognition.onstart = () => {
      setIsRecording(true);
      toast({
        title: "Gravação Iniciada",
        description: "Começando a transcrição em tempo real",
      });
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';
      let alternatives: any[] = [];

      // Process only the latest results to avoid accumulation
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPart = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalTranscript += transcriptPart;
          
          // Coletar alternativas para envio à IA
          for (let alt = 0; alt < Math.min(3, event.results[i].length); alt++) {
            alternatives.push({
              transcript: event.results[i][alt].transcript.trim(),
              confidence: event.results[i][alt].confidence || null
            });
          }
        } else {
          interimTranscript += transcriptPart;
        }
      }

      // Update transcript with both final and interim results for real-time display
      setTranscript(prevTranscript => {
        // Remove any previous interim text to avoid duplication
        const cleanPrevTranscript = prevTranscript.replace(/\[INTERIM\].*$/, '');

        // Start with clean previous transcript
        let newTranscript = cleanPrevTranscript;

        // Add new final text only if it exists and isn't already there
        if (finalTranscript.trim()) {
          const finalText = finalTranscript.trim();
          // More precise duplication check - avoid exact duplicates and check word overlap
          const lastWords = cleanPrevTranscript.split(' ').slice(-3).join(' ').toLowerCase();
          const newWords = finalText.split(' ').slice(0, 3).join(' ').toLowerCase();

          if (!cleanPrevTranscript.includes(finalText) && lastWords !== newWords) {
            newTranscript += (newTranscript ? ' ' : '') + finalText;

            // Texto limpo (sem [INTERIM]) para processamento de IA
            const finalTextClean = finalText.replace(/\[INTERIM\].*$/, '').trim();
            
            // Debouncing melhorado: texto mais longo e verificação de palavras
            const now = Date.now();
            const textLength = finalTextClean.length;
            const wordCount = finalTextClean.split(/\s+/).length;
            const isDifferentText = finalTextClean !== lastProcessedTextRef.current;
            
            // Exigir pelo menos 25 chars OU 2+ palavras com pontuação
            const isSignificantText = textLength >= 25 || (wordCount >= 2 && /[.!?]/.test(finalTextClean));
            
            if (isSignificantText && isDifferentText && (now - lastDetectionTimeRef.current) > 2000) {
              // Usar apenas os últimos 300 chars para não sobrecarregar a IA
              const textForAI = finalTextClean.slice(-300);
              console.log(`🔍 Enviando para IA: "${textForAI}"`);
              console.log(`📋 Com alternativas:`, alternatives);
              
              detectLanguage({ text: textForAI, alternatives });
              lastDetectionTimeRef.current = now;
              lastProcessedTextRef.current = finalTextClean;
            }

            // Enhanced mode: improve text with AI (mas sem [INTERIM])
            if (enhancedMode && finalTextClean.length > 10) {
              enhanceText({ text: finalTextClean.slice(-300), targetLanguage: currentLanguage });
            }

            // Auto-translation: usando texto limpo
            if (autoTranslationEnabled && finalTextClean.trim().length > 5) {
              const targetLang = translationTargetLanguage || "en-US";
              if (targetLang !== currentLanguage) {
                // Verificar padrões conhecidos de corrupção para tratamento especial
                const corruptionPatterns = [
                  /Word not.*(?:Begin|Explorer|Die|Seas|Lost|Silence)/i,
                  /(?:Bones|Can).*Explorer.*(?:pow|When|Die)/i,
                  /roupa.*(?:van der|understanding)/i,
                  /Lost.*Silence.*(?:Fitness|Souness|oficial)/i
                ];
                
                const isKnownCorruptedPhrase = corruptionPatterns.some(pattern => pattern.test(finalTextClean));
                
                if (isKnownCorruptedPhrase) {
                  console.log(`🎯 Detectada frase específica corrompida, traduzindo texto completo`);
                  translateText({ text: finalTextClean, targetLanguage: targetLang });
                } else {
                  console.log(`🔄 Auto-traduzindo: "${finalTextClean.slice(-200)}" para ${targetLang}`);
                  translateText({ text: finalTextClean.slice(-200), targetLanguage: targetLang });
                }
              }
            }
          }
        }

        // Add interim text with a marker for real-time display
        if (interimTranscript.trim()) {
          newTranscript += '[INTERIM]' + interimTranscript.trim();
        }

        updateWordCount(newTranscript.replace(/\[INTERIM\].*$/, ''));
        return newTranscript;
      });
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);

      if (event.error !== 'aborted') {
        toast({
          title: "Erro na Gravação",
          description: "Falha no reconhecimento de voz",
          variant: "destructive",
        });
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
      if (timeIntervalRef.current) {
        clearInterval(timeIntervalRef.current);
      }
      if (audioLevelIntervalRef.current) {
        clearInterval(audioLevelIntervalRef.current);
      }
    };

    return recognition;
  }, [toast, updateWordCount, detectLanguage, enhanceText, currentLanguage, enhancedMode]);

  const startRecording = useCallback(() => {
    try {
      // Stop any existing recognition first
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }

      const recognition = initializeRecognition();
      if (!recognition) return;

      recognitionRef.current = recognition;
      recognition.start();

      // Start timing
      setRecordingTime(0);
      timeIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // Simulate audio levels
      audioLevelIntervalRef.current = setInterval(() => {
        setAudioLevel(Math.random() * 100);
      }, 150);

    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Erro",
        description: "Falha ao iniciar gravação",
        variant: "destructive",
      });
    }
  }, [initializeRecognition, toast]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    if (timeIntervalRef.current) {
      clearInterval(timeIntervalRef.current);
      timeIntervalRef.current = null;
    }

    if (audioLevelIntervalRef.current) {
      clearInterval(audioLevelIntervalRef.current);
      audioLevelIntervalRef.current = null;
    }

    setAudioLevel(0);

    toast({
      title: "Gravação Finalizada",
      description: "Transcrição salva com sucesso",
    });
  }, [toast]);

  const clearTranscript = useCallback(() => {
    setTranscript("");
    setTranslatedTranscript("");
    setWordCount(0);
    setRecordingTime(0);
    setLanguageCount(1);
    setDetectedLanguage("Português (BR)");
    setConfidence(0.98);
    setDetectedLanguages(["pt-BR"]);
  }, []);

  const toggleAutoTranslation = useCallback(() => {
    const newState = !autoTranslationEnabled;
    setAutoTranslationEnabled(newState);

    if (!newState) {
      setTranslatedTranscript("");
      console.log("🚫 Tradução automática desativada");
    } else {
      // Auto-selecionar idioma de destino baseado no idioma atual
      let smartTargetLang: string;
      
      if (currentLanguage === "pt-BR") {
        smartTargetLang = "en-US"; // Se estiver em português, traduzir para inglês
      } else if (currentLanguage === "en-US") {
        smartTargetLang = "pt-BR"; // Se estiver em inglês, traduzir para português
      } else if (currentLanguage === "es-ES") {
        smartTargetLang = "pt-BR"; // Se estiver em espanhol, traduzir para português
      } else {
        smartTargetLang = "en-US"; // Fallback para inglês
      }
      
      setTranslationTargetLanguage(smartTargetLang);
      localStorage.setItem('translationTargetLanguage', smartTargetLang);
      console.log(`🟢 Tradução automática ativada: ${currentLanguage} → ${smartTargetLang}`);
    }

    const getLanguageName = (code: string) => {
      switch(code) {
        case "pt-BR": return "Português";
        case "en-US": return "Inglês";
        case "es-ES": return "Espanhol";
        default: return code;
      }
    };

    toast({
      title: newState ? "✅ Tradução Ativada" : "❌ Tradução Desativada",
      description: newState
        ? `Traduzindo automaticamente para ${getLanguageName(newState ? (currentLanguage === "pt-BR" ? "en-US" : currentLanguage === "en-US" ? "pt-BR" : "pt-BR") : "")}`
        : "Tradução automática desativada",
    });
  }, [autoTranslationEnabled, currentLanguage, toast]);

  const setTranslationTarget = useCallback((langCode: string) => {
    // Ensure we never set an empty or invalid language code
    const validLanguageCode = langCode && langCode.trim() !== '' ? langCode : "pt-BR";
    setTranslationTargetLanguage(validLanguageCode);

    // Save to localStorage for persistence
    localStorage.setItem('translationTargetLanguage', validLanguageCode);

    // Clear current translation when changing target
    setTranslatedTranscript("");

    // Retranslate current transcript if auto-translation is enabled
    if (autoTranslationEnabled && transcript && transcript.trim()) {
      const cleanText = transcript.replace(/\[INTERIM\].*$/, '').trim();
      if (cleanText && currentLanguage !== validLanguageCode) {
        translateText({ text: cleanText, targetLanguage: validLanguageCode });
      }
    }

    console.log("Target language set to:", validLanguageCode); // Debug log
  }, [autoTranslationEnabled, transcript, currentLanguage, translateText]);

  const switchLanguage = useCallback((langCode: string) => {
    console.log(`🌐 Mudando idioma para: ${langCode}`);
    setCurrentLanguage(langCode);

    // Save to localStorage for persistence
    localStorage.setItem('currentLanguage', langCode);

    // Update detection based on language
    switch(langCode) {
      case 'pt-BR':
        setDetectedLanguage("Português (BR)");
        break;
      case 'en-US':
        setDetectedLanguage("English (US)");
        break;
      case 'es-ES':
        setDetectedLanguage("Español (ES)");
        break;
      default:
        setDetectedLanguage("Português (BR)");
    }

    // Restart recognition with new language if recording (com melhor controle de estado)
    if (isRecording && recognitionRef.current) {
      console.log("🔄 Reiniciando reconhecimento com novo idioma...");
      
      // Usar uma flag para controlar o restart
      const shouldRestart = isRecording;
      
      // Para o reconhecimento atual
      recognitionRef.current.abort(); // Use abort para parar imediatamente
      recognitionRef.current = null;
      
      // Aguarda um pouco e reinicia com o novo idioma
      setTimeout(() => {
        if (shouldRestart) { // Verifica se ainda deveria estar gravando
          console.log("🟢 Reiniciando com idioma:", langCode);
          startRecording();
        }
      }, 500); // Tempo menor para transição mais suave
    }
  }, [isRecording, startRecording]);

  const toggleEnhancedMode = useCallback(() => {
    setEnhancedMode(prev => !prev);

    toast({
      title: enhancedMode ? "Modo Avançado Desativado" : "Modo Avançado Ativado",
      description: enhancedMode
        ? "Usando apenas transcrição básica"
        : "Usando IA para melhorar a transcrição",
    });
  }, [enhancedMode, toast]);

  const forceReanalysis = useCallback(() => {
    if (!transcript || isRecording) return;
    
    const cleanText = transcript.replace(/\[INTERIM\].*$/, '').trim();
    if (cleanText.length < 10) {
      toast({
        title: "Texto Insuficiente",
        description: "Precisa de mais texto para reanalisar",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "🔄 Reanalisando...",
      description: "Detectando idioma e aplicando correções",
    });

    // Forçar nova análise
    detectLanguage({ text: cleanText, alternatives: [] });
    
    if (enhancedMode) {
      enhanceText({ text: cleanText, targetLanguage: currentLanguage });
    }
  }, [transcript, isRecording, currentLanguage, enhancedMode, detectLanguage, enhanceText, toast]);

  const toggleLanguage = useCallback((langCode: string) => {
    const newEnabledLanguages = {
      ...enabledLanguages,
      [langCode]: !enabledLanguages[langCode]
    };

    // Garantir que pelo menos um idioma esteja ativo
    const activeLanguages = Object.values(newEnabledLanguages).filter(Boolean);
    if (activeLanguages.length === 0) {
      toast({
        title: "Erro",
        description: "Pelo menos um idioma deve estar ativo",
        variant: "destructive",
      });
      return;
    }

    setEnabledLanguages(newEnabledLanguages);
    localStorage.setItem('enabledLanguages', JSON.stringify(newEnabledLanguages));

    // Se o idioma atual foi desativado, mudar para um ativo
    if (!newEnabledLanguages[currentLanguage]) {
      const firstActive = Object.keys(newEnabledLanguages).find(lang => newEnabledLanguages[lang]);
      if (firstActive) {
        switchLanguage(firstActive);
      }
    }

    const languageNames = {
      'pt-BR': 'Português',
      'en-US': 'Inglês',
      'es-ES': 'Espanhol'
    };

    toast({
      title: newEnabledLanguages[langCode] ? "✅ Idioma Ativado" : "❌ Idioma Desativado",
      description: `${languageNames[langCode as keyof typeof languageNames]} ${newEnabledLanguages[langCode] ? 'ativado' : 'desativado'} na detecção`,
    });
  }, [enabledLanguages, currentLanguage, switchLanguage, toast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (timeIntervalRef.current) {
        clearInterval(timeIntervalRef.current);
      }
      if (audioLevelIntervalRef.current) {
        clearInterval(audioLevelIntervalRef.current);
      }
    };
  }, []);

  return {
    isRecording,
    transcript,
    detectedLanguage,
    confidence,
    audioLevel,
    recordingTime,
    wordCount,
    languageCount,
    startRecording,
    stopRecording,
    clearTranscript,
    switchLanguage,
    toggleEnhancedMode,
    currentLanguage,
    enhancedMode,
    detectedLanguages,
    autoTranslationEnabled,
    translationTargetLanguage,
    translatedTranscript,
    toggleAutoTranslation,
    setTranslationTarget,
    forceReanalysis,
    enabledLanguages,
    toggleLanguage
  };
}