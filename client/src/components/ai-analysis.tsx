import { useState } from "react";
import { Send, ThumbsUp, Copy, Brain, Search, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAiAnalysis, useSentimentAnalysis } from "@/hooks/use-ai-analysis";
import { useToast } from "@/hooks/use-toast";

interface AiAnalysisProps {
  transcript: string;
  currentSessionId: string | null;
}

interface AnalysisResult {
  answer: string;
  confidence: number;
  relatedTopics: string[];
}

export default function AiAnalysis({ transcript, currentSessionId }: AiAnalysisProps) {
  const [question, setQuestion] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [lastAnalysis, setLastAnalysis] = useState<AnalysisResult | null>(null);
  const [sentimentData, setSentimentData] = useState<any>(null);
  const { toast } = useToast();
  
  const { mutate: analyzeContent, isPending: isAnalyzing } = useAiAnalysis({
    onSuccess: (data) => {
      setLastAnalysis(data);
      setQuestion("");
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message || "Falha na análise de IA",
        variant: "destructive",
      });
    }
  });

  const { mutate: analyzeSentiment, isPending: isAnalyzingSentiment } = useSentimentAnalysis({
    onSuccess: (data) => {
      setSentimentData(data);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message || "Falha na análise de sentimento",
        variant: "destructive",
      });
    }
  });

  const handleSubmitQuestion = () => {
    if (!question.trim() || !transcript) {
      toast({
        title: "Aviso",
        description: "Digite uma pergunta e certifique-se de que há conteúdo transcrito",
        variant: "destructive",
      });
      return;
    }

    analyzeContent({
      transcription: transcript,
      question: question.trim()
    });
  };

  const handleCopyResponse = async () => {
    if (!lastAnalysis) return;
    
    try {
      await navigator.clipboard.writeText(lastAnalysis.answer);
      toast({
        title: "Sucesso",
        description: "Resposta copiada para a área de transferência",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao copiar resposta",
        variant: "destructive",
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitQuestion();
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Sentiment Analysis */}
      {transcript && (
        <div className="glass-card rounded-3xl shadow-large p-6 border-white/20 hover-lift">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-secondary rounded-lg flex items-center justify-center">
                <TrendingUp className="text-white text-sm" />
              </div>
              <h3 className="text-xl font-bold text-white">Análise de Sentimento</h3>
            </div>
            <Button
              onClick={() => analyzeSentiment(transcript)}
              disabled={isAnalyzingSentiment}
              className="bg-gradient-secondary hover:scale-105 transition-all duration-300"
              size="sm"
            >
              {isAnalyzingSentiment ? "Analisando..." : "Analisar"}
            </Button>
          </div>
          
          {sentimentData && (
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 glass-card rounded-xl border-white/20">
                <div className="text-2xl font-bold text-white mb-1">{sentimentData.rating}/5</div>
                <div className="text-xs text-white/70">Avaliação</div>
              </div>
              <div className="text-center p-4 glass-card rounded-xl border-white/20">
                <div className="text-2xl font-bold text-white mb-1">{Math.round(sentimentData.confidence * 100)}%</div>
                <div className="text-xs text-white/70">Confiança</div>
              </div>
              <div className="text-center p-4 glass-card rounded-xl border-white/20">
                <div className={`text-lg font-bold mb-1 ${
                  sentimentData.sentiment === 'positivo' ? 'text-green-300' :
                  sentimentData.sentiment === 'negativo' ? 'text-red-300' : 'text-yellow-300'
                }`}>
                  {sentimentData.sentiment}
                </div>
                <div className="text-xs text-white/70">Sentimento</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Question Interface */}
      <div className="glass-card rounded-3xl shadow-large p-6 border-white/20 hover-lift">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center animate-glow">
            <Brain className="text-white text-sm" />
          </div>
          <h3 className="text-xl font-bold text-white drop-shadow-lg">Análise Inteligente com GLM-4</h3>
        </div>

        <div className="space-y-4">
          <div className="flex space-x-2">
            <Input
              data-testid="input-ai-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Faça uma pergunta sobre o conteúdo transcrito..."
              className="flex-1 bg-white/20 border-white/30 text-white placeholder:text-white/60"
              disabled={isAnalyzing || !transcript}
            />
            <Button
              data-testid="button-submit-question"
              onClick={handleSubmitQuestion}
              disabled={isAnalyzing || !question.trim() || !transcript}
              className="bg-gradient-accent hover:scale-105 transition-all duration-300"
            >
              {isAnalyzing ? (
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* AI Response Area */}
          {lastAnalysis && (
            <div className="glass-card rounded-2xl p-6 border-white/20 animate-fade-in shadow-glow">
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center flex-shrink-0 animate-glow">
                  <Brain className="text-white text-sm" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium mb-2">Resposta do GLM-4:</p>
                  <p data-testid="text-ai-response" className="text-white/90 leading-relaxed text-sm mb-2">
                    {lastAnalysis.answer}
                  </p>
                  <div className="text-xs text-white/70 mb-4">
                    Confiança: {Math.round(lastAnalysis.confidence * 100)}%
                  </div>
                  
                  {lastAnalysis.relatedTopics.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-dark mb-2">Tópicos relacionados:</p>
                      <div className="flex flex-wrap gap-2">
                        {lastAnalysis.relatedTopics.map((topic, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-white/20 text-white rounded-full text-xs border border-white/30"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-4">
                    <button
                      data-testid="button-thumbs-up"
                      className="text-xs text-white/80 hover:text-white transition-all duration-200 flex items-center space-x-1 hover:scale-105"
                    >
                      <ThumbsUp className="w-3 h-3" />
                      <span>Útil</span>
                    </button>
                    <button
                      data-testid="button-copy-response"
                      onClick={handleCopyResponse}
                      className="text-xs text-white/80 hover:text-white transition-all duration-200 flex items-center space-x-1 hover:scale-105"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copiar</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content Search */}
      <div className="glass-card rounded-3xl shadow-large p-6 border-white/20 hover-lift">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-gradient-accent rounded-lg flex items-center justify-center">
            <Search className="text-white text-sm" />
          </div>
          <h3 className="text-xl font-bold text-white drop-shadow-lg">Buscar no Conteúdo</h3>
        </div>

        <div className="relative mb-4">
          <Input
            data-testid="input-search-content"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar palavras ou frases na transcrição..."
            className="pl-10 bg-white/20 border-white/30 text-white placeholder:text-white/60"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted" />
        </div>

        {/* Search Results */}
        {searchQuery && transcript.toLowerCase().includes(searchQuery.toLowerCase()) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex-1">
                <p className="text-sm text-dark">
                  ...{transcript.split(new RegExp(`(${searchQuery})`, 'gi')).map((part, index) => 
                    part.toLowerCase() === searchQuery.toLowerCase() ? (
                      <mark key={index} className="bg-yellow-200">{part}</mark>
                    ) : part
                  )}...
                </p>
                <p className="text-xs text-muted mt-1">Encontrado na transcrição atual</p>
              </div>
            </div>
          </div>
        )}

        {searchQuery && !transcript.toLowerCase().includes(searchQuery.toLowerCase()) && transcript && (
          <div className="text-center py-4 text-muted">
            <p className="text-sm">Nenhum resultado encontrado para "{searchQuery}"</p>
          </div>
        )}
      </div>
    </div>
  );
}
