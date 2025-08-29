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
import ExportFormatModal from "./export-format-modal";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

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
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
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
    setIsExportModalOpen(true);
  };

  const handleExportWithFormat = async (format: string) => {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `transcricao-${timestamp}`;
    
    // Gerar resumo se não existir
    let currentSummary = summaryData;
    if (!currentSummary && transcript) {
      toast({
        title: "Gerando resumo",
        description: "Criando resumo para exportação...",
      });
      
      try {
        const summaryResponse = await fetch('/api/ai/summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: transcript })
        });
        
        if (summaryResponse.ok) {
          const data = await summaryResponse.json();
          currentSummary = data.summary;
          setSummaryData(data.summary);
        }
      } catch (error) {
        console.error('Erro ao gerar resumo:', error);
      }
    }
    
    switch (format) {
      case 'txt':
        exportAsText(transcript, filename, currentSummary);
        break;
      case 'html':
        exportAsHTML(transcript, filename, currentSummary);
        break;
      case 'doc':
        exportAsWord(transcript, filename, currentSummary);
        break;
      case 'pdf':
        await exportAsPDF(transcript, filename, currentSummary);
        break;
      default:
        exportAsText(transcript, filename, currentSummary);
    }
  };

  const exportAsText = (content: string, filename: string, summary?: string) => {
    let fullContent = '';
    
    if (summary) {
      fullContent += `=== RESUMO ===\n\n${summary}\n\n=== TRANSCRIÇÃO COMPLETA ===\n\n`;
    }
    fullContent += content;
    
    const blob = new Blob([fullContent], { type: 'text/plain;charset=utf-8' });
    downloadFile(blob, `${filename}.txt`);
  };

  const exportAsHTML = (content: string, filename: string, summary?: string) => {
    const currentDate = new Date().toLocaleString('pt-BR');
    const wordCount = content.split(' ').length;
    const readingTime = Math.ceil(wordCount / 200); // ~200 palavras por minuto
    
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>VoiceScribe AI - Transcrição</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 2rem;
            line-height: 1.7;
          }
          
          .container {
            max-width: 900px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            border-radius: 24px;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
            overflow: hidden;
          }
          
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 3rem 2rem 2rem;
            text-align: center;
            position: relative;
          }
          
          .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="20" cy="20" r="1" fill="%23ffffff" opacity="0.1"/><circle cx="80" cy="80" r="1.5" fill="%23ffffff" opacity="0.1"/><circle cx="60" cy="30" r="0.5" fill="%23ffffff" opacity="0.2"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
            opacity: 0.3;
          }
          
          .header h1 {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 1rem;
            position: relative;
            z-index: 1;
          }
          
          .header .subtitle {
            font-size: 1.1rem;
            opacity: 0.9;
            margin-bottom: 1.5rem;
            position: relative;
            z-index: 1;
          }
          
          .stats {
            display: flex;
            justify-content: center;
            gap: 2rem;
            margin-top: 1.5rem;
            position: relative;
            z-index: 1;
          }
          
          .stat {
            text-align: center;
            background: rgba(255, 255, 255, 0.2);
            padding: 0.75rem 1.5rem;
            border-radius: 12px;
            backdrop-filter: blur(10px);
          }
          
          .stat-number {
            font-size: 1.5rem;
            font-weight: 700;
            display: block;
          }
          
          .stat-label {
            font-size: 0.9rem;
            opacity: 0.8;
          }
          
          .content {
            padding: 3rem 2rem;
          }
          
          .summary-section {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
            padding: 2rem;
            border-radius: 16px;
            margin-bottom: 3rem;
            position: relative;
            overflow: hidden;
          }
          
          .summary-section::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.1);
            background-image: radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.2) 0%, transparent 50%),
                              radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.15) 0%, transparent 50%);
          }
          
          .summary-section h2 {
            font-size: 1.8rem;
            margin-bottom: 1rem;
            position: relative;
            z-index: 1;
          }
          
          .summary-text {
            font-size: 1.1rem;
            line-height: 1.6;
            position: relative;
            z-index: 1;
          }
          
          .transcript-section h2 {
            color: #333;
            font-size: 1.8rem;
            margin-bottom: 1.5rem;
            padding-bottom: 0.5rem;
            border-bottom: 3px solid #667eea;
          }
          
          .transcript-text {
            background: #f8f9fa;
            padding: 2rem;
            border-radius: 12px;
            font-size: 1.05rem;
            line-height: 1.8;
            color: #333;
            white-space: pre-wrap;
            border-left: 4px solid #667eea;
          }
          
          .footer {
            background: #f8f9fa;
            padding: 2rem;
            text-align: center;
            color: #666;
            border-top: 1px solid #e9ecef;
          }
          
          .footer p {
            margin: 0.5rem 0;
          }
          
          .brand {
            color: #667eea;
            font-weight: 600;
          }
          
          @media (max-width: 768px) {
            body { padding: 1rem; }
            .header { padding: 2rem 1rem; }
            .header h1 { font-size: 2rem; }
            .stats { flex-direction: column; gap: 1rem; }
            .content { padding: 2rem 1rem; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <header class="header">
            <h1>🎤 VoiceScribe AI</h1>
            <p class="subtitle">Transcrição Inteligente de Áudio</p>
            <div class="stats">
              <div class="stat">
                <span class="stat-number">${wordCount}</span>
                <span class="stat-label">Palavras</span>
              </div>
              <div class="stat">
                <span class="stat-number">${readingTime}min</span>
                <span class="stat-label">Leitura</span>
              </div>
              <div class="stat">
                <span class="stat-number">${currentDate.split(' ')[0]}</span>
                <span class="stat-label">Data</span>
              </div>
            </div>
          </header>
          
          <main class="content">
            ${summary ? `
              <section class="summary-section">
                <h2>📋 Resumo Executivo</h2>
                <div class="summary-text">${summary}</div>
              </section>
            ` : ''}
            
            <section class="transcript-section">
              <h2>📝 Transcrição Completa</h2>
              <div class="transcript-text">${content}</div>
            </section>
          </main>
          
          <footer class="footer">
            <p>Gerado em: <strong>${currentDate}</strong></p>
            <p>Powered by <span class="brand">VoiceScribe AI</span> - Transcrição Inteligente</p>
          </footer>
        </div>
      </body>
      </html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    downloadFile(blob, `${filename}.html`);
  };

  const exportAsWord = (content: string, filename: string, summary?: string) => {
    let fullContent = '';
    
    if (summary) {
      fullContent += `RESUMO\n\n${summary}\n\n---\n\nTRANSCRIÇÃO COMPLETA\n\n`;
    }
    fullContent += content;
    
    const rtfContent = `{\rtf1\ansi\deff0 {\fonttbl {\f0 Times New Roman;}} \f0\fs24 ${fullContent.replace(/\n/g, '\\par ')} }`;
    const blob = new Blob([rtfContent], { type: 'application/rtf' });
    downloadFile(blob, `${filename}.rtf`);
  };

  const exportAsPDF = async (content: string, filename: string, summary?: string) => {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - 2 * margin;
      let yPosition = margin;
      
      // Função para adicionar nova página se necessário
      const checkPageBreak = (neededHeight: number) => {
        if (yPosition + neededHeight > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }
      };
      
      // Cabeçalho com gradiente simulado
      pdf.setFillColor(102, 126, 234); // #667eea
      pdf.rect(0, 0, pageWidth, 60, 'F');
      
      // Título
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text('🎤 VoiceScribe AI', pageWidth / 2, 25, { align: 'center' });
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Transcrição Inteligente de Áudio', pageWidth / 2, 35, { align: 'center' });
      
      // Informações da sessão
      const currentDate = new Date().toLocaleString('pt-BR');
      const wordCount = content.split(' ').length;
      const readingTime = Math.ceil(wordCount / 200);
      
      pdf.setFontSize(10);
      pdf.text(`Gerado em: ${currentDate}`, pageWidth / 2, 45, { align: 'center' });
      pdf.text(`${wordCount} palavras • ${readingTime}min de leitura`, pageWidth / 2, 52, { align: 'center' });
      
      yPosition = 70;
      pdf.setTextColor(0, 0, 0);
      
      // Resumo (se disponível)
      if (summary) {
        checkPageBreak(40);
        
        // Caixa do resumo
        pdf.setFillColor(240, 147, 251); // #f093fb
        pdf.roundedRect(margin, yPosition, contentWidth, 30, 3, 3, 'F');
        
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('📋 Resumo Executivo', margin + 5, yPosition + 10);
        
        yPosition += 20;
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        
        const summaryLines = pdf.splitTextToSize(summary, contentWidth - 10);
        pdf.text(summaryLines, margin + 5, yPosition);
        yPosition += summaryLines.length * 5 + 20;
        
        pdf.setTextColor(0, 0, 0);
      }
      
      // Título da transcrição
      checkPageBreak(20);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(102, 126, 234);
      pdf.text('📝 Transcrição Completa', margin, yPosition);
      yPosition += 15;
      
      // Linha separadora
      pdf.setDrawColor(102, 126, 234);
      pdf.setLineWidth(0.5);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;
      
      // Conteúdo da transcrição
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      
      const textLines = pdf.splitTextToSize(content, contentWidth);
      
      for (let i = 0; i < textLines.length; i++) {
        checkPageBreak(6);
        pdf.text(textLines[i], margin, yPosition);
        yPosition += 6;
      }
      
      // Rodapé em todas as páginas
      const totalPages = pdf.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(128, 128, 128);
        pdf.text(
          `Powered by VoiceScribe AI - Página ${i} de ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }
      
      // Salvar PDF
      pdf.save(`${filename}.pdf`);
      
      toast({
        title: "Sucesso",
        description: `PDF ${filename}.pdf criado com sucesso!`,
      });
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: "Erro",
        description: "Erro ao gerar PDF. Tentando formato alternativo...",
        variant: "destructive",
      });
      exportAsText(content, filename, summary);
    }
  };

  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Sucesso",
      description: `Arquivo ${filename} exportado com sucesso`,
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
              <span>Exportar Conteúdo</span>
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
      
      <ExportFormatModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={handleExportWithFormat}
        transcript={transcript}
      />
    </div>
  );
}
