import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Send, Brain, Sparkles, Calculator, HelpCircle } from "lucide-react";
import { useAdvancedAiAnalysis } from "@/hooks/use-advanced-ai-analysis";
import { useToast } from "@/hooks/use-toast";
import { quickAnalyze } from "@/lib/advanced-nlp";

interface TranscriptionDisplayProps {
  transcript: string;
  isListening: boolean;
  interimTranscript: string;
  enhancedMode: boolean;
  confidence: number;
}

export default function TranscriptionDisplay({
  transcript,
  isListening,
  interimTranscript,
  enhancedMode,
  confidence,
}: TranscriptionDisplayProps) {
  const [aiQuestion, setAiQuestion] = useState("");
  const [interimText, setInterimText] = useState("");
  const [lastAnalyzedText, setLastAnalyzedText] = useState("");
  const [isAutoAnalyzing, setIsAutoAnalyzing] = useState(false);

  const { analyzeAdvanced, isAnalyzing } = useAdvancedAiAnalysis({
    onSuccess: (result: any) => {
      console.log("✅ Análise concluída:", result);
    },
    onError: (error: any) => {
      console.error("❌ Erro na análise:", error);
    }
  });

  const { toast } = useToast();

  const analyzeWithAI = useCallback((text: string, question: string) => {
    console.log("🧠 Iniciando análise IA avançada...");
    analyzeAdvanced({
      transcription: text,
      question: question,
      useContext: true
    });
  }, [analyzeAdvanced]);

  const detectImplicitQuestion = useCallback(async (text: string): Promise<boolean> => {
    try {
      const analysis = await quickAnalyze(text);
      console.log("🔍 Análise rápida:", analysis);

      return analysis.shouldRespond ||
             analysis.isImplicitQuestion ||
             analysis.isMathematical ||
             analysis.confidence > 0.7;
    } catch (error) {
      console.error("Erro na detecção implícita:", error);
      return false;
    }
  }, []);

  const detectQuestion = useCallback((text: string): boolean => {
    // Detecta perguntas explícitas, matemática e dúvidas implícitas
    const questionPatterns = [
      // Perguntas tradicionais
      /[?¿]/,
      /^(que|what|who|where|when|why|how|como|onde|quando|por que|porque|qual|quem|o que|qual é|como é|where is|what is)/i,

      // Perguntas matemáticas
      /\b(quanto é|quanto vale|qual é o resultado|calculate|soma|subtração|multiplicação|divisão)\b/i,
      /\d+\s*[+\-*/÷×]\s*\d+/,
      /\b(mais|menos|vezes|dividido)\b.*\d|\d.*\b(mais|menos|vezes|dividido)\b/i,

      // Dúvidas implícitas
      /\b(não sei|nao sei|talvez|será que|acho que|pode ser)\b/i,
      /\b(tenho dúvida|não tenho certeza|não entendi|como assim)\b/i,
      /\b(me ajude|preciso|quero|gostaria|poderia)\b/i,
      /\b(explique|esclareça|me mostra|me ensina)\b/i,

      // Solicitações indiretas
      /\b(como faço|como fazer|não funcionou|deu erro)\b/i,
      /\b(correto|certo|verdade|exato|mesmo)\?/i,
      /\b(né|não é|concorda|acha)\?/i
    ];

    return questionPatterns.some(pattern => pattern.test(text));
  }, []);

  const handleManualQuestion = useCallback(() => {
    if (!aiQuestion.trim() || !transcript) {
      toast({
        title: "Aviso",
        description: "Digite uma pergunta e certifique-se de que há conteúdo transcrito",
        variant: "destructive",
      });
      return;
    }

    analyzeWithAI(transcript, aiQuestion.trim());
    setAiQuestion(""); // Limpar campo após enviar
  }, [aiQuestion, transcript, analyzeWithAI, toast]);

  // Processar transcript em tempo real - LÓGICA COMPLETAMENTE REFEITA
  useEffect(() => {
    if (!transcript) {
      setInterimText("");
      return;
    }

    const processText = async () => {
      // Verificar se há texto novo suficiente para análise
      const newText = transcript.trim();
      const minLength = 10; // Mínimo de caracteres

      if (newText.length < minLength) {
        return;
      }

      // Evitar análises repetidas
      if (newText === lastAnalyzedText || isAutoAnalyzing) {
        return;
      }

      // Verificar se há uma pergunta, matemática ou dúvida implícita
      const hasExplicitQuestion = detectQuestion(newText);

      if (hasExplicitQuestion) {
        console.log("🎯 Pergunta explícita detectada:", newText.substring(0, 50));
        setLastAnalyzedText(newText);
        setIsAutoAnalyzing(true);

        try {
          analyzeWithAI(newText, "Responda ou resolva esta questão automaticamente.");
        } finally {
          setIsAutoAnalyzing(false);
        }
        return;
      }

      // Verificar perguntas implícitas usando IA
      try {
        const hasImplicitQuestion = await detectImplicitQuestion(newText);

        if (hasImplicitQuestion) {
          console.log("🤔 Pergunta implícita ou matemática detectada:", newText.substring(0, 50));
          setLastAnalyzedText(newText);
          setIsAutoAnalyzing(true);

          try {
            analyzeWithAI(newText, "Há alguma dúvida, pergunta implícita ou cálculo matemático aqui que precisa de resposta?");
          } finally {
            setIsAutoAnalyzing(false);
          }
        }
      } catch (error) {
        console.error("Erro na detecção implícita:", error);
        setIsAutoAnalyzing(false);
      }
    };

    // Debounce para evitar análises excessivas
    const timeoutId = setTimeout(processText, 1500);
    return () => clearTimeout(timeoutId);
  }, [transcript, lastAnalyzedText, isAutoAnalyzing, detectQuestion, detectImplicitQuestion, analyzeWithAI]);

  // Processar texto interino
  useEffect(() => {
    if (interimTranscript && isListening) {
      setInterimText(interimTranscript);
    } else {
      setInterimText("");
    }
  }, [interimTranscript, isListening]);

  // Função para detectar se há matemática no texto
  const hasMathematical = useCallback((text: string): boolean => {
    const mathPatterns = [
      /\d+\s*[+\-*/÷×]\s*\d+/,
      /\b(quanto é|qual é o resultado|calcule|somme|subtraia|multiplique|divida)\b/i,
      /\b(mais|menos|vezes|dividido)\b.*\d/i
    ];
    return mathPatterns.some(pattern => pattern.test(text));
  }, []);

  return (
    <Card className="relative glass-card border-white/20 h-full flex flex-col overflow-hidden">
      {/* Gradiente de fundo animado */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-pink-600/10 animate-pulse" />
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent" />
      
      <CardHeader className="relative pb-4 backdrop-blur-sm">
        <CardTitle className="text-xl font-bold text-white flex items-center gap-3">
          <div className="relative">
            <Brain className="w-6 h-6 text-blue-400" />
            <div className="absolute inset-0 bg-blue-400/30 rounded-full blur-md animate-pulse" />
          </div>
          <span className="bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent">
            Transcrição em Tempo Real
          </span>
          {enhancedMode && (
            <Badge variant="secondary" className="bg-gradient-to-r from-primary/20 to-purple-600/20 text-primary border-primary/30 animate-bounce">
              <Sparkles className="w-3 h-3 mr-1 animate-spin" />
              IA Ativada
            </Badge>
          )}
        </CardTitle>

        <div className="flex flex-wrap gap-3 mt-4">
          <Badge 
            variant="outline" 
            className="border-white/40 text-white bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-all duration-300"
          >
            <div className="w-2 h-2 rounded-full bg-green-400 mr-2 animate-pulse" />
            Confiança: {Math.round(confidence * 100)}%
          </Badge>

          {detectQuestion(transcript) && (
            <Badge 
              variant="secondary" 
              className="bg-gradient-to-r from-blue-600/30 to-blue-500/20 text-blue-200 border-blue-400/40 backdrop-blur-sm animate-pulse"
            >
              <HelpCircle className="w-3 h-3 mr-1 animate-bounce" />
              🔍 Pergunta Detectada
            </Badge>
          )}

          {hasMathematical(transcript) && (
            <Badge 
              variant="secondary" 
              className="bg-gradient-to-r from-green-600/30 to-emerald-500/20 text-green-200 border-green-400/40 backdrop-blur-sm animate-pulse"
            >
              <Calculator className="w-3 h-3 mr-1 animate-spin" />
              🧮 Matemática Detectada
            </Badge>
          )}

          {isAnalyzing && (
            <Badge 
              variant="secondary" 
              className="bg-gradient-to-r from-purple-600/30 to-pink-500/20 text-purple-200 border-purple-400/40 backdrop-blur-sm animate-pulse"
            >
              <Brain className="w-3 h-3 mr-1 animate-spin" />
              🤖 Analisando...
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="relative flex-1 flex flex-col space-y-6 backdrop-blur-sm">
        {/* Área de Transcrição com design glassmorphism */}
        <div className="relative flex-1 min-h-[350px] group">
          {/* Efeito de brilho no fundo */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10 rounded-lg" />
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent rounded-lg" />
          
          <Textarea
            value={transcript}
            readOnly
            placeholder={
              isListening 
                ? "🎤 Escutando... Fale algo para ver a transcrição em tempo real!" 
                : "▶️ Clique em 'Iniciar' para começar a gravação e ver a mágica acontecer!"
            }
            className="
              relative h-full bg-white/5 border-2 border-white/20 text-white placeholder-white/70 resize-none 
              backdrop-blur-md rounded-xl shadow-2xl transition-all duration-300
              hover:border-white/30 hover:bg-white/10 focus:border-blue-400/50 focus:bg-white/10
              text-lg leading-relaxed font-medium tracking-wide
            "
          />

          {/* Texto Interino com animação bonita */}
          {interimText && (
            <div className="absolute -bottom-2 left-0 right-0 mx-4">
              <div className="relative p-4 bg-gradient-to-r from-blue-500/30 via-blue-400/20 to-purple-500/30 border-2 border-blue-400/40 rounded-xl backdrop-blur-lg shadow-xl">
                {/* Efeito de onda */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-xl animate-pulse" />
                
                <p className="relative text-blue-100 text-base font-semibold flex items-center gap-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                    <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
                  </div>
                  <span className="text-blue-300/80">Processando: </span>
                  <span className="text-white font-bold">{interimText}</span>
                  <span className="text-blue-300 animate-pulse text-xl">|</span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Campo de Pergunta Manual com design melhorado */}
        <div className="relative space-y-4">
          {/* Fundo com gradiente */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-blue-600/5 to-pink-600/10 rounded-xl" />
          
          <div className="relative flex gap-3 p-4 bg-white/5 border border-white/20 rounded-xl backdrop-blur-sm">
            <div className="flex-1 relative">
              <Input
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                placeholder="💬 Faça uma pergunta sobre o texto transcrito..."
                className="
                  bg-white/10 border-white/30 text-white placeholder-white/70 
                  backdrop-blur-sm rounded-lg transition-all duration-300
                  hover:border-white/40 hover:bg-white/15 focus:border-blue-400/60 focus:bg-white/15
                  text-base font-medium
                "
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleManualQuestion();
                  }
                }}
              />
            </div>
            
            <Button
              onClick={handleManualQuestion}
              disabled={isAnalyzing || !aiQuestion.trim() || !transcript}
              className="
                relative bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 
                text-white shadow-lg hover:shadow-xl transition-all duration-300
                disabled:opacity-50 disabled:cursor-not-allowed
              "
              size="icon"
            >
              <Send className="w-4 h-4" />
              {isAnalyzing && (
                <div className="absolute inset-0 bg-purple-500/20 rounded animate-pulse" />
              )}
            </Button>
          </div>

          {/* Dicas com design elegante */}
          <div className="relative p-4 bg-gradient-to-r from-indigo-600/20 via-purple-600/15 to-pink-600/20 border border-white/20 rounded-xl backdrop-blur-sm">
            <div className="absolute top-2 right-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-ping" />
            </div>
            
            <div className="space-y-2 text-white/80">
              <p className="text-sm font-semibold flex items-center gap-2">
                <span className="text-lg">🤖</span>
                <span className="bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent font-bold">
                  IA Detecta Automaticamente:
                </span>
              </p>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 p-2 bg-white/10 rounded-lg">
                  <span className="text-blue-300">❓</span>
                  <span>Perguntas explícitas</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-white/10 rounded-lg">
                  <span className="text-green-300">🔢</span>
                  <span>Cálculos matemáticos</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-white/10 rounded-lg">
                  <span className="text-yellow-300">🤔</span>
                  <span>Dúvidas implícitas</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-white/10 rounded-lg">
                  <span className="text-purple-300">🙋</span>
                  <span>Solicitações de ajuda</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}