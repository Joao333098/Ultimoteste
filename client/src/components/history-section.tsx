import { useState } from "react";
import { History, Filter, Plus, Download, Share, Trash2, Mic, Video, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { TranscriptionSession } from "@shared/schema";

interface HistorySectionProps {
  sessions: TranscriptionSession[];
  onRefetch: () => void;
}

export default function HistorySection({ sessions, onRefetch }: HistorySectionProps) {
  const [filterQuery, setFilterQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { mutate: deleteSession, isPending: isDeleting } = useMutation({
    mutationFn: async (sessionId: string) => {
      await apiRequest('DELETE', `/api/sessions/${sessionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({
        title: "Sucesso",
        description: "Sessão deletada com sucesso",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao deletar sessão",
        variant: "destructive",
      });
    }
  });

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins} minutos`;
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return `Hoje, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 2) {
      return `Ontem, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays <= 7) {
      return `${date.toLocaleDateString('pt-BR', { weekday: 'long' })}, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString('pt-BR');
  };

  const getSessionIcon = (title: string) => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('reunião') || lowerTitle.includes('meeting')) {
      return Mic;
    } else if (lowerTitle.includes('palestra') || lowerTitle.includes('lecture') || lowerTitle.includes('ted')) {
      return Video;
    } else if (lowerTitle.includes('chamada') || lowerTitle.includes('call')) {
      return Phone;
    }
    return Mic;
  };

  const getLanguageColor = (lang: string) => {
    switch (lang.toLowerCase()) {
      case 'pt-br':
      case 'português':
        return 'bg-primary/10 text-primary';
      case 'en-us':
      case 'english':
        return 'bg-secondary/10 text-secondary';
      case 'es-es':
      case 'español':
        return 'bg-warning/10 text-warning';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const filteredSessions = sessions.filter(session =>
    session.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
    session.content.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const exportSession = (session: TranscriptionSession) => {
    const blob = new Blob([session.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session.title.replace(/[^\w\s]/gi, '')}-${session.createdAt.toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Sucesso",
      description: "Sessão exportada com sucesso",
    });
  };

  const shareSession = async (session: TranscriptionSession) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: session.title,
          text: session.content
        });
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      try {
        await navigator.clipboard.writeText(session.content);
        toast({
          title: "Copiado",
          description: "Conteúdo copiado para a área de transferência",
        });
      } catch (error) {
        toast({
          title: "Erro",
          description: "Falha ao copiar conteúdo",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-muted to-dark-light rounded-lg flex items-center justify-center">
            <History className="text-white text-sm" />
          </div>
          <h3 className="text-xl font-bold text-dark">Histórico de Transcrições</h3>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Input
              data-testid="input-filter-history"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filtrar histórico..."
              className="pl-10 text-sm"
            />
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted" />
          </div>
          <Button data-testid="button-new-session" className="text-sm">
            <Plus className="w-4 h-4 mr-2" />
            Nova Sessão
          </Button>
        </div>
      </div>

      {/* History List */}
      <div className="space-y-4">
        {filteredSessions.length === 0 ? (
          <div className="text-center py-12 text-muted">
            <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma sessão encontrada</p>
            {filterQuery && (
              <p className="text-sm">Tente ajustar os filtros de busca</p>
            )}
          </div>
        ) : (
          filteredSessions.map((session) => {
            const IconComponent = getSessionIcon(session.title);
            
            return (
              <div
                key={session.id}
                data-testid={`session-card-${session.id}`}
                className="flex items-center justify-between p-6 border border-gray-200 rounded-xl hover:border-primary/50 hover:bg-gray-50/50 transition-all duration-200 cursor-pointer group"
              >
                <div className="flex items-center space-x-4 flex-1">
                  <div className="w-12 h-12 bg-gradient-to-r from-primary to-secondary rounded-xl flex items-center justify-center">
                    <IconComponent className="text-white" size={20} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-dark group-hover:text-primary transition-colors duration-200">
                      {session.title}
                    </h4>
                    <p className="text-sm text-muted">
                      {formatDuration(session.duration)} • {session.languages.length} idiomas • {session.wordCount} palavras
                    </p>
                    <div className="flex items-center space-x-4 mt-2">
                      {session.languages.map((lang, index) => (
                        <span
                          key={index}
                          className={`text-xs px-2 py-1 rounded-full ${getLanguageColor(lang)}`}
                        >
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-dark font-medium">
                      {formatDate(new Date(session.createdAt))}
                    </p>
                    <p className="text-xs text-muted">
                      {session.isActive ? 'Ativa' : 'Finalizada'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    data-testid={`button-download-${session.id}`}
                    onClick={() => exportSession(session)}
                    variant="ghost"
                    size="sm"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    data-testid={`button-share-${session.id}`}
                    onClick={() => shareSession(session)}
                    variant="ghost"
                    size="sm"
                  >
                    <Share className="w-4 h-4" />
                  </Button>
                  <Button
                    data-testid={`button-delete-${session.id}`}
                    onClick={() => deleteSession(session.id)}
                    disabled={isDeleting}
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
