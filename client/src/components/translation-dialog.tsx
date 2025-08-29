import { useState } from "react";
import { Languages, Search, ArrowLeftRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TranslationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentTranscript: string;
  autoTranslationEnabled: boolean;
  translationTargetLanguage: string;
  onToggleAutoTranslation: () => void;
  onSetTranslationTarget: (lang: string) => void;
}

export default function TranslationDialog({
  isOpen,
  onClose,
  currentTranscript,
  autoTranslationEnabled,
  translationTargetLanguage,
  onToggleAutoTranslation,
  onSetTranslationTarget
}: TranslationDialogProps) {
  
  const [wordSearchText, setWordSearchText] = useState("");
  const [searchSourceLang, setSearchSourceLang] = useState("en-US");
  const [searchTargetLang, setSearchTargetLang] = useState("pt-BR");
  const [wordTranslationResult, setWordTranslationResult] = useState("");
  const [fullTranscriptResult, setFullTranscriptResult] = useState("");
  const { toast } = useToast();

  const languages = [
    { code: "pt-BR", name: "Português (BR)", flag: "🇧🇷" },
    { code: "en-US", name: "English (US)", flag: "🇺🇸" },
    { code: "es-ES", name: "Español (ES)", flag: "🇪🇸" }
  ];

  const { mutate: translateWord, isPending: isTranslatingWord } = useMutation({
    mutationFn: async ({ text, targetLanguage }: { text: string; targetLanguage: string }) => {
      const response = await apiRequest('POST', '/api/ai/translate', {
        text,
        targetLanguage
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.translatedText && data.translatedText.includes('[TRADUÇÃO INDISPONÍVEL]')) {
        setWordTranslationResult("⚠️ API não configurada. Configure Google Translate ou GLM4_API_KEY");
        toast({
          title: "🔧 Configuração Necessária",
          description: "Configure Google Translate API ou GLM4_API_KEY para tradução completa",
          variant: "destructive",
        });
      } else {
        setWordTranslationResult(data.translatedText);
        if (data.confidence && data.confidence < 0.7) {
          toast({
            title: "⚠️ Tradução Básica",
            description: "Usando dicionário básico. Configure API para melhor qualidade",
          });
        }
      }
    },
    onError: (error) => {
      console.error('Translation error:', error);
      setWordTranslationResult("Erro na tradução");
      toast({
        title: "Erro na tradução",
        description: "Verifique se a API key do GLM-4 está configurada",
        variant: "destructive",
      });
    }
  });

  const { mutate: translateFullText, isPending: isTranslatingFull } = useMutation({
    mutationFn: async ({ text, targetLanguage }: { text: string; targetLanguage: string }) => {
      const response = await apiRequest('POST', '/api/ai/translate', {
        text,
        targetLanguage
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.translatedText && data.translatedText.includes('[TRADUÇÃO INDISPONÍVEL]')) {
        toast({
          title: "API não configurada",
          description: "Configure a GLM4_API_KEY nas configurações",
          variant: "destructive",
        });
        setFullTranscriptResult(data.translatedText);
      } else {
        setFullTranscriptResult(data.translatedText);
        if (data.confidence < 0.3) {
          toast({
            title: "Tradução com baixa confiança",
            description: "A qualidade da tradução pode estar comprometida",
            variant: "default",
          });
        }
      }
    },
    onError: (error) => {
      console.error('Translation error:', error);
      toast({
        title: "Erro na tradução",
        description: "Verifique se a API key do GLM-4 está configurada",
        variant: "destructive",
      });
    }
  });

  const handleWordSearch = () => {
    if (wordSearchText.trim()) {
      translateWord({ text: wordSearchText.trim(), targetLanguage: searchTargetLang });
    }
  };

  const handleSwapLanguages = () => {
    const temp = searchSourceLang;
    setSearchSourceLang(searchTargetLang);
    setSearchTargetLang(temp);
    setWordTranslationResult("");
  };

  const handleTranslateFullText = () => {
    const cleanText = currentTranscript.replace(/\[INTERIM\].*$/, '').trim();

    if (!cleanText) {
      toast({
        title: "Texto vazio",
        description: "Não há texto para traduzir",
        variant: "destructive",
      });
      return;
    }

    // Sempre usar um idioma válido
    const targetLang = translationTargetLanguage || "en-US";
    
    // Se o idioma de destino for igual ao idioma atual, exibir texto original
    const currentLang = localStorage.getItem('currentLanguage') || 'pt-BR';
    if (targetLang === currentLang) {
      setFullTranscriptResult(cleanText);
      return;
    }

    translateFullText({ text: cleanText, targetLanguage: targetLang });
  };

  const getLanguageName = (code: string) => {
    return languages.find(lang => lang.code === code)?.name || code;
  };

  const getLanguageFlag = (code: string) => {
    return languages.find(lang => lang.code === code)?.flag || "🌐";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-purple-900/95 to-blue-900/95 border-white/20 text-white">
        <DialogHeader className="space-y-4">
          <DialogTitle className="flex items-center space-x-3 text-xl">
            <Languages className="w-6 h-6 text-blue-400" />
            <span>Central de Tradução</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Auto Translation Toggle */}
          <div className="glass-card rounded-2xl p-4 border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg">Tradução Automática</h3>
                <p className="text-sm text-white/70">Traduz automaticamente durante a transcrição</p>
              </div>
              <Button
                onClick={onToggleAutoTranslation}
                variant={autoTranslationEnabled ? "default" : "outline"}
                className={`${autoTranslationEnabled ? 'bg-green-600 hover:bg-green-700' : 'border-white/30 hover:bg-white/10'}`}
              >
                {autoTranslationEnabled ? "Ativado" : "Desativado"}
              </Button>
            </div>

            {autoTranslationEnabled && (
              <div className="space-y-3">
                <label className="text-sm font-medium">Traduzir para:</label>
                <Select value={translationTargetLanguage || "pt-BR"} onValueChange={onSetTranslationTarget}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Selecione um idioma" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/20">
                    {languages.map(lang => (
                      <SelectItem key={lang.code} value={lang.code} className="text-white hover:bg-white/10">
                        {lang.flag} {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <Separator className="bg-white/20" />

          {/* Word Search Translation */}
          <div className="glass-card rounded-2xl p-4 border-white/10">
            <h3 className="font-semibold text-lg mb-4 flex items-center space-x-2">
              <Search className="w-5 h-5 text-blue-400" />
              <span>Pesquisar Palavra</span>
            </h3>

            <div className="space-y-4">
              {/* Language Selection */}
              <div className="grid grid-cols-5 gap-2 items-center">
                <Select value={searchSourceLang} onValueChange={setSearchSourceLang}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white col-span-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/20">
                    {languages.map(lang => (
                      <SelectItem key={lang.code} value={lang.code} className="text-white hover:bg-white/10">
                        {lang.flag} {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  onClick={handleSwapLanguages}
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/10 col-span-1 flex justify-center"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                </Button>

                <Select value={searchTargetLang} onValueChange={setSearchTargetLang}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white col-span-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/20">
                    {languages.map(lang => (
                      <SelectItem key={lang.code} value={lang.code} className="text-white hover:bg-white/10">
                        {lang.flag} {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Search Input */}
              <div className="flex space-x-2">
                <Input
                  value={wordSearchText}
                  onChange={(e) => setWordSearchText(e.target.value)}
                  placeholder="Digite uma palavra para traduzir..."
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  onKeyPress={(e) => e.key === 'Enter' && handleWordSearch()}
                />
                <Button
                  onClick={handleWordSearch}
                  disabled={!wordSearchText.trim() || isTranslatingWord}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isTranslatingWord ? "..." : <Search className="w-4 h-4" />}
                </Button>
              </div>

              {/* Translation Result */}
              {wordTranslationResult && (
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/70">
                      {getLanguageFlag(searchSourceLang)} → {getLanguageFlag(searchTargetLang)}
                    </span>
                  </div>
                  <div className="text-lg font-medium">{wordTranslationResult}</div>
                </div>
              )}
            </div>
          </div>

          <Separator className="bg-white/20" />

          {/* Full Text Translation */}
          <div className="glass-card rounded-2xl p-4 border-white/10">
            <h3 className="font-semibold text-lg mb-4">Traduzir Transcrição Completa</h3>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-white/70">Traduzir para:</span>
                {(() => {
                  const currentLang = localStorage.getItem('currentLanguage') || 'pt-BR';
                  const effectiveTargetLang = translationTargetLanguage || "pt-BR";
                  const isSameLanguage = effectiveTargetLang === currentLang;

                  return (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">
                        {getLanguageFlag(effectiveTargetLang)} {getLanguageName(effectiveTargetLang)}
                      </span>
                      {isSameLanguage && (
                        <span className="text-xs text-blue-400 bg-blue-400/20 px-2 py-1 rounded-full">
                          Idioma atual
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>

              <Button
                onClick={handleTranslateFullText}
                disabled={!currentTranscript.trim() || isTranslatingFull}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {isTranslatingFull ? "Traduzindo..." : "Traduzir"}
              </Button>

              {fullTranscriptResult && (
                <div className="bg-white/5 rounded-lg p-4 border border-white/10 max-h-40 overflow-y-auto">
                  <div className="text-sm text-white/70 mb-2">Tradução:</div>
                  <div className="text-white leading-relaxed">{fullTranscriptResult}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}