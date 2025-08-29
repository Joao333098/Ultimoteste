import React from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  TrendingUp, 
  Copy, 
  Download,
  X,
  Loader2,
  Heart,
  Frown,
  Meh
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary?: string;
  sentimentData?: {
    rating: number;
    confidence: number;
    sentiment: string;
  };
  isGeneratingSummary?: boolean;
  isAnalyzingSentiment?: boolean;
  transcript: string;
  onGenerateSummary: () => void;
  onAnalyzeSentiment: () => void;
}

export default function SummaryModal({
  isOpen,
  onClose,
  summary,
  sentimentData,
  isGeneratingSummary,
  isAnalyzingSentiment,
  transcript,
  onGenerateSummary,
  onAnalyzeSentiment
}: SummaryModalProps) {
  const { toast } = useToast();

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positivo':
        return <Heart className="w-5 h-5 text-green-400" />;
      case 'negativo':
        return <Frown className="w-5 h-5 text-red-400" />;
      default:
        return <Meh className="w-5 h-5 text-yellow-400" />;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positivo':
        return 'text-green-300 border-green-600/30 bg-green-600/20';
      case 'negativo':
        return 'text-red-300 border-red-600/30 bg-red-600/20';
      default:
        return 'text-yellow-300 border-yellow-600/30 bg-yellow-600/20';
    }
  };

  const handleCopySummary = () => {
    if (summary) {
      navigator.clipboard.writeText(summary);
      toast({
        title: "Copiado!",
        description: "Resumo copiado para a área de transferência",
      });
    }
  };

  const handleExportSummary = () => {
    if (summary) {
      const content = `Resumo da Transcrição\n\n${summary}\n\n---\n\nAnálise de Sentimento:\n${sentimentData ? `Sentimento: ${sentimentData.sentiment}\nAvaliação: ${sentimentData.rating}/5\nConfiança: ${Math.round(sentimentData.confidence * 100)}%` : 'Não analisado'}`;
      
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resumo-transcricao-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Exportado!",
        description: "Resumo exportado com sucesso",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-gradient-to-br from-purple-900/90 via-blue-900/90 to-indigo-900/90 backdrop-blur-lg border-white/20">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-white flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <span>Resumo Inteligente</span>
            </DialogTitle>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Generate Summary Section */}
          <div className="glass-card rounded-2xl p-6 border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Resumo do Conteúdo</h3>
              <Button
                onClick={onGenerateSummary}
                disabled={isGeneratingSummary || !transcript.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {isGeneratingSummary ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Gerando...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4" />
                    <span>Gerar Resumo</span>
                  </div>
                )}
              </Button>
            </div>

            {summary ? (
              <div className="space-y-4">
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <p className="text-white leading-relaxed">{summary}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={handleCopySummary}
                    variant="outline"
                    size="sm"
                    className="border-white/30 text-white hover:bg-white/10"
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Copiar
                  </Button>
                  <Button
                    onClick={handleExportSummary}
                    variant="outline"
                    size="sm"
                    className="border-white/30 text-white hover:bg-white/10"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Exportar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-white/70">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Clique em "Gerar Resumo" para criar um resumo inteligente do seu conteúdo</p>
              </div>
            )}
          </div>

          <Separator className="bg-white/20" />

          {/* Sentiment Analysis Section */}
          <div className="glass-card rounded-2xl p-6 border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                <TrendingUp className="w-5 h-5" />
                <span>Análise de Sentimento</span>
              </h3>
              <Button
                onClick={onAnalyzeSentiment}
                disabled={isAnalyzingSentiment || !transcript.trim()}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
              >
                {isAnalyzingSentiment ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analisando...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4" />
                    <span>Analisar</span>
                  </div>
                )}
              </Button>
            </div>

            {sentimentData ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 glass-card rounded-xl border-white/20">
                  <div className="text-3xl font-bold text-white mb-2">{sentimentData.rating}/5</div>
                  <div className="text-sm text-white/70">Avaliação Geral</div>
                </div>
                <div className="text-center p-4 glass-card rounded-xl border-white/20">
                  <div className="text-3xl font-bold text-white mb-2">{Math.round(sentimentData.confidence * 100)}%</div>
                  <div className="text-sm text-white/70">Confiança</div>
                </div>
                <div className="text-center p-4 glass-card rounded-xl border-white/20">
                  <div className="flex items-center justify-center mb-2">
                    {getSentimentIcon(sentimentData.sentiment)}
                  </div>
                  <Badge className={`${getSentimentColor(sentimentData.sentiment)} text-sm font-medium`}>
                    {sentimentData.sentiment.charAt(0).toUpperCase() + sentimentData.sentiment.slice(1)}
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-white/70">
                <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Clique em "Analisar" para descobrir o sentimento do seu conteúdo</p>
              </div>
            )}
          </div>

          {/* Help Text */}
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <p className="text-white/70 text-sm">
              <strong>Dica:</strong> Use o resumo para capturar os pontos principais e a análise de sentimento para entender o tom emocional do conteúdo transcrito.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}