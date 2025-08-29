import { useState } from "react";
import { Clock, Type, Globe, FileText, Download, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useSentimentAnalysis } from "@/hooks/use-ai-analysis";
import SummaryModal from "./summary-modal";

interface SidebarStatsProps {
  recordingTime: number;
  wordCount: number;
  languageCount: number;
  transcript: string;
}

export default function SidebarStats({
  recordingTime,
  wordCount,
  languageCount,
  transcript
}: SidebarStatsProps) {
  const [preferredLanguages, setPreferredLanguages] = useState({
    'pt-BR': true,
    'en-US': true,
    'es-ES': true
  });
  const [detectionMode, setDetectionMode] = useState('automatic');
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [summaryData, setSummaryData] = useState<string>("");
  const [sentimentData, setSentimentData] = useState<{
    rating: number;
    confidence: number;
    sentiment: string;
  } | undefined>(undefined);
  const { toast } = useToast();

  const analyzeSentimentMutation = useSentimentAnalysis();

  const { mutate: generateSummary, isPending: isGeneratingSummary } = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/ai/summary', { transcription: transcript });
      return response.json();
    },
    onSuccess: (data) => {
      setSummaryData(data.summary);
      toast({
        title: "Resumo Gerado",
        description: "O resumo foi gerado com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao gerar resumo",
        variant: "destructive",
      });
    }
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleExportText = () => {
    if (!transcript) {
      toast({
        title: "Aviso",
        description: "Não há conteúdo para exportar",
        variant: "destructive",
      });
      return;
    }

    const blob = new Blob([transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcricao-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Sucesso",
      description: "Transcrição exportada com sucesso",
    });
  };

  const handleShare = async () => {
    if (!transcript) {
      toast({
        title: "Aviso",
        description: "Não há conteúdo para compartilhar",
        variant: "destructive",
      });
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Transcrição VoiceScribe AI',
          text: transcript
        });
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(transcript);
        toast({
          title: "Copiado",
          description: "Transcrição copiada para a área de transferência",
        });
      } catch (error) {
        toast({
          title: "Erro",
          description: "Falha ao copiar transcrição",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Statistics Cards */}
      <div className="glass-card rounded-3xl shadow-large border-white/20 p-6 hover-lift">
        <h3 className="text-lg font-bold text-white mb-6 drop-shadow-lg">Estatísticas da Sessão</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 glass-card border-white/20 rounded-xl">
            <div>
              <p className="text-sm text-white/70">Tempo de Gravação</p>
              <p data-testid="text-recording-time" className="text-xl font-bold text-white">
                {formatTime(recordingTime)}
              </p>
            </div>
            <Clock className="text-blue-300 text-xl" />
          </div>
          
          <div className="flex items-center justify-between p-4 glass-card border-white/20 rounded-xl">
            <div>
              <p className="text-sm text-white/70">Palavras Transcritas</p>
              <p data-testid="text-word-count" className="text-xl font-bold text-white">
                {wordCount}
              </p>
            </div>
            <Type className="text-green-300 text-xl" />
          </div>
          
          <div className="flex items-center justify-between p-4 glass-card border-white/20 rounded-xl">
            <div>
              <p className="text-sm text-white/70">Idiomas Detectados</p>
              <p data-testid="text-language-count" className="text-xl font-bold text-white">
                {languageCount}
              </p>
            </div>
            <Globe className="text-yellow-300 text-xl" />
          </div>
        </div>
      </div>

      {/* Language Settings */}
      <div className="glass-card rounded-3xl shadow-large border-white/20 p-6 hover-lift">
        <h3 className="text-lg font-bold text-white mb-6 drop-shadow-lg">Configurações de Idioma</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-2">Idiomas Preferidos</label>
            <div className="space-y-2">
              <label className="flex items-center space-x-3">
                <Checkbox
                  data-testid="checkbox-portuguese"
                  checked={preferredLanguages['pt-BR']}
                  onCheckedChange={(checked) => 
                    setPreferredLanguages(prev => ({ ...prev, 'pt-BR': !!checked }))
                  }
                />
                <span className="text-sm text-white/80">Português (BR)</span>
              </label>
              <label className="flex items-center space-x-3">
                <Checkbox
                  data-testid="checkbox-english"
                  checked={preferredLanguages['en-US']}
                  onCheckedChange={(checked) => 
                    setPreferredLanguages(prev => ({ ...prev, 'en-US': !!checked }))
                  }
                />
                <span className="text-sm text-white/80">English (US)</span>
              </label>
              <label className="flex items-center space-x-3">
                <Checkbox
                  data-testid="checkbox-spanish"
                  checked={preferredLanguages['es-ES']}
                  onCheckedChange={(checked) => 
                    setPreferredLanguages(prev => ({ ...prev, 'es-ES': !!checked }))
                  }
                />
                <span className="text-sm text-white/80">Español (ES)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">Modo de Detecção</label>
            <Select value={detectionMode} onValueChange={setDetectionMode}>
              <SelectTrigger data-testid="select-detection-mode">
                <SelectValue placeholder="Selecione o modo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="automatic">Automático (Recomendado)</SelectItem>
                <SelectItem value="manual">Manual por Sessão</SelectItem>
                <SelectItem value="fixed">Fixo por Idioma</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass-card rounded-3xl shadow-large border-white/20 p-6 hover-lift">
        <h3 className="text-lg font-bold text-white mb-6 drop-shadow-lg">Ações Rápidas</h3>
        
        <div className="space-y-3">
          <Button
            data-testid="button-generate-summary"
            onClick={() => {
              setIsSummaryModalOpen(true);
              if (!summaryData) {
                generateSummary();
              }
            }}
            disabled={isGeneratingSummary || !transcript}
            className="w-full justify-between bg-white/10 hover:bg-white/20 text-white border border-white/30 hover:scale-105 transition-all duration-300"
            variant="outline"
          >
            <div className="flex items-center space-x-3">
              {isGeneratingSummary ? (
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              ) : (
                <FileText className="w-4 h-4 text-blue-300" />
              )}
              <span>Gerar Resumo</span>
            </div>
          </Button>

          <Button
            data-testid="button-export-text"
            onClick={handleExportText}
            disabled={!transcript}
            className="w-full justify-between bg-white/10 hover:bg-white/20 text-white border border-white/30 hover:scale-105 transition-all duration-300"
            variant="outline"
          >
            <div className="flex items-center space-x-3">
              <Download className="w-4 h-4 text-green-300" />
              <span>Exportar Texto</span>
            </div>
          </Button>

          <Button
            data-testid="button-share-transcription"
            onClick={handleShare}
            disabled={!transcript}
            className="w-full justify-between bg-white/10 hover:bg-white/20 text-white border border-white/30 hover:scale-105 transition-all duration-300"
            variant="outline"
          >
            <div className="flex items-center space-x-3">
              <Share className="w-4 h-4 text-yellow-300" />
              <span>Compartilhar</span>
            </div>
          </Button>
        </div>
      </div>

      <SummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        summary={summaryData}
        sentimentData={sentimentData}
        isGeneratingSummary={isGeneratingSummary}
        isAnalyzingSentiment={analyzeSentimentMutation.isPending}
        transcript={transcript}
        onGenerateSummary={() => generateSummary()}
        onAnalyzeSentiment={() => {
          analyzeSentimentMutation.mutate(transcript, {
            onSuccess: (data) => {
              setSentimentData(data);
              toast({
                title: "Análise Concluída",
                description: "Análise de sentimento realizada com sucesso",
              });
            },
            onError: () => {
              toast({
                title: "Erro",
                description: "Falha na análise de sentimento",
                variant: "destructive",
              });
            }
          });
        }}
      />
    </div>
  );
}
