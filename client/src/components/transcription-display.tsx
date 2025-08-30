import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Send, Brain, Sparkles, Calculator, HelpCircle } from "lucide-react";
import { useAdvancedAIAnalysis } from "@/hooks/use-advanced-ai-analysis";
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

  const { analyzeAdvanced, isAnalyzing } = useAdvancedAIAnalysis({
    onSuccess: (result) => {
      console.log("✅ Análise concluída:", result);
    },
    onError: (error) => {
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
    <Card className="glass-card border-white/20 h-full flex flex-col">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
          <Brain className="w-5 h-5" />
          Transcrição em Tempo Real
          {enhancedMode && (
            <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
              <Sparkles className="w-3 h-3 mr-1" />
              IA Ativada
            </Badge>
          )}
        </CardTitle>

        <div className="flex flex-wrap gap-2 mt-2">
          <Badge variant="outline" className="border-white/30 text-white">
            Confiança: {Math.round(confidence * 100)}%
          </Badge>

          {detectQuestion(transcript) && (
            <Badge variant="secondary" className="bg-blue-600/20 text-blue-300 border-blue-600/30">
              <HelpCircle className="w-3 h-3 mr-1" />
              Pergunta Detectada
            </Badge>
          )}

          {hasMathematical(transcript) && (
            <Badge variant="secondary" className="bg-green-600/20 text-green-300 border-green-600/30">
              <Calculator className="w-3 h-3 mr-1" />
              Matemática Detectada
            </Badge>
          )}

          {isAnalyzing && (
            <Badge variant="secondary" className="bg-purple-600/20 text-purple-300 border-purple-600/30 animate-pulse">
              <Brain className="w-3 h-3 mr-1" />
              Analisando...
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col space-y-4">
        {/* Área de Transcrição */}
        <div className="flex-1 min-h-[300px]">
          <Textarea
            value={transcript}
            readOnly
            placeholder={isListening ? "Fale algo... O reconhecimento está ativo." : "Inicie o reconhecimento para ver a transcrição aqui."}
            className="h-full bg-white/10 border-white/30 text-white placeholder-white/60 resize-none"
          />

          {/* Texto Interino */}
          {interimText && (
            <div className="mt-2 p-3 bg-blue-500/20 border border-blue-400/30 rounded-lg">
              <p className="text-blue-200 text-sm font-medium">
                <span className="opacity-70">Processando: </span>
                {interimText}
                <span className="animate-pulse">|</span>
              </p>
            </div>
          )}
        </div>

        {/* Campo de Pergunta Manual */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              placeholder="Faça uma pergunta sobre o texto transcrito..."
              className="flex-1 bg-white/10 border-white/30 text-white placeholder-white/60"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleManualQuestion();
                }
              }}
            />
            <Button
              onClick={handleManualQuestion}
              disabled={isAnalyzing || !aiQuestion.trim() || !transcript}
              className="bg-primary hover:bg-primary/80 text-white"
              size="icon"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>

          <div className="text-xs text-white/70">
            <p>💡 <strong>Dica:</strong> A IA detecta automaticamente perguntas, dúvidas e matemática no seu texto!</p>
            <p>Tipos detectados: perguntas explícitas (?), matemática (2+2), dúvidas ("não sei", "talvez"), solicitações ("me ajude")</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}