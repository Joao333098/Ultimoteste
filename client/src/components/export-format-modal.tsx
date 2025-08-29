import React from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Download,
  File,
  FileType,
  X,
  CheckCircle
} from "lucide-react";

interface ExportOption {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  extension: string;
  color: string;
}

interface ExportFormatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: string) => void;
  transcript: string;
}

export default function ExportFormatModal({
  isOpen,
  onClose,
  onExport,
  transcript
}: ExportFormatModalProps) {

  const exportOptions: ExportOption[] = [
    {
      id: 'txt',
      name: 'Texto Simples',
      description: 'Arquivo de texto básico (.txt)',
      icon: <FileText className="w-6 h-6" />,
      extension: '.txt',
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      id: 'doc',
      name: 'Documento Word',
      description: 'Formato Microsoft Word (.docx)',
      icon: <File className="w-6 h-6" />,
      extension: '.docx',
      color: 'bg-blue-700 hover:bg-blue-800'
    },
    {
      id: 'pdf',
      name: 'PDF',
      description: 'Documento PDF (.pdf)',
      icon: <FileType className="w-6 h-6" />,
      extension: '.pdf',
      color: 'bg-red-500 hover:bg-red-600'
    },
    {
      id: 'html',
      name: 'Página Web',
      description: 'Arquivo HTML (.html)',
      icon: <File className="w-6 h-6" />,
      extension: '.html',
      color: 'bg-orange-500 hover:bg-orange-600'
    }
  ];

  const handleExport = (format: string) => {
    onExport(format);
    onClose();
  };

  const formatFileSize = (text: string) => {
    const bytes = new Blob([text]).size;
    if (bytes < 1024) return `${bytes} bytes`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-gradient-to-br from-purple-900/90 via-blue-900/90 to-indigo-900/90 backdrop-blur-lg border-white/20">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-white flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Download className="w-5 h-5 text-white" />
              </div>
              <span>Escolher Formato de Exportação</span>
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
          {/* File Info */}
          <div className="glass-card rounded-xl p-4 border-white/10">
            <div className="flex items-center justify-between text-sm text-white/70">
              <span>Conteúdo: {transcript.split(' ').length} palavras</span>
              <span>Tamanho: {formatFileSize(transcript)}</span>
            </div>
          </div>

          {/* Export Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exportOptions.map((option) => (
              <div
                key={option.id}
                className="glass-card rounded-xl p-6 border-white/10 hover:border-white/30 transition-all duration-300 cursor-pointer group"
                onClick={() => handleExport(option.id)}
              >
                <div className="flex items-start space-x-4">
                  <div className={`${option.color} p-3 rounded-lg transition-all duration-300 group-hover:scale-110`}>
                    {option.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1">
                      {option.name}
                    </h3>
                    <p className="text-sm text-white/70 mb-2">
                      {option.description}
                    </p>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs bg-white/20 text-white px-2 py-1 rounded-full">
                        {option.extension}
                      </span>
                      <CheckCircle className="w-4 h-4 text-green-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Help Text */}
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <p className="text-white/70 text-sm">
              <strong>Dica:</strong> Clique no formato desejado para fazer o download. 
              Arquivos PDF e Word preservam melhor a formatação, enquanto TXT é mais leve e universal.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <Button
              onClick={onClose}
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10"
            >
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}