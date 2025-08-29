 import React, { useState, useEffect } from "react";
 import { Copy, Download, Maximize, Trash2, Globe, RotateCcw, Loader2, MessageCircle, Brain, Zap, ZapOff } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { useToast } from "@/hooks/use-toast";
 import { useMutation } from "@tanstack/react-query";
 import { apiRequest } from "@/lib/queryClient";
import { useAiAnalysis } from "@/hooks/use-ai-analysis";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

 interface TranscriptionDisplayProps {
   transcript: string;
   isRecording: boolean;
   currentSessionId: string | null;
   translatedTranscript?: string;
   autoTranslationEnabled?: boolean;
   translationTargetLanguage?: string;
 }

 interface SentenceBlock {
   id: string;
   originalText: string;
   translatedText?: string;
   isTranslating: boolean;
   showTranslation: boolean;
   timestamp: string;
   isClickable?: boolean;
   aiResponse?: string;
   isAnalyzing?: boolean;
 }

 export default function TranscriptionDisplay({
   transcript,
   isRecording,
   currentSessionId,
   translatedTranscript,
   autoTranslationEnabled,
   translationTargetLanguage
 }: TranscriptionDisplayProps) {
   const { toast } = useToast();
   const [sentenceBlocks, setSentenceBlocks] = useState<SentenceBlock[]>([]);
   const [lastProcessedTranscript, setLastProcessedTranscript] = useState("");
   const [interimText, setInterimText] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Estados da análise inteligente
  const [aiQuestion, setAiQuestion] = useState("");
  const [lastAiResponse, setLastAiResponse] = useState("");
  const [autoResponseEnabled, setAutoResponseEnabled] = useState(false);
  const [selectedSentence, setSelectedSentence] = useState<string>("");

  // Hook da análise inteligente
  const { mutate: analyzeContent, isPending: isAnalyzing } = useAiAnalysis({
    onSuccess: (data) => {
      setLastAiResponse(data.answer);
      // Atualizar a sentença com a resposta
      if (selectedSentence) {
        setSentenceBlocks(prev => prev.map(block => 
          block.originalText === selectedSentence 
            ? { ...block, aiResponse: data.answer, isAnalyzing: false }
            : block
        ));
      }
      toast({
        title: "Análise Completa",
        description: "IA respondeu com sucesso!",
      });
    },
    onError: (error) => {
      setLastAiResponse("Erro ao processar análise.");
      if (selectedSentence) {
        setSentenceBlocks(prev => prev.map(block => 
          block.originalText === selectedSentence 
            ? { ...block, aiResponse: "Erro ao processar análise", isAnalyzing: false }
            : block
        ));
      }
      toast({
        title: "Erro",
        description: error.message || "Falha na análise de IA",
        variant: "destructive",
      });
    }
  });

   const { mutate: translateSentence } = useMutation({
     mutationFn: async ({ text, targetLanguage }: { text: string; targetLanguage: string }) => {
       const response = await apiRequest('POST', '/api/ai/translate', { 
         text, 
         targetLanguage 
       });
       return response.json();
     },
     onSuccess: (data, variables) => {
       const { text } = variables;

       if (data.translatedText && data.translatedText.includes('[TRADUÇÃO INDISPONÍVEL]')) {
         setSentenceBlocks(prev => prev.map(block => 
           block.originalText === text 
             ? { ...block, translatedText: "API não configurada", isTranslating: false }
             : block
         ));
         toast({
           title: "API não configurada",
           description: "Configure a GLM4_API_KEY nas configurações",
           variant: "destructive",
         });
       } else {
         setSentenceBlocks(prev => prev.map(block => 
           block.originalText === text 
             ? { ...block, translatedText: data.translatedText, isTranslating: false }
             : block
         ));
       }
     },
     onError: (error, variables) => {
       const { text } = variables;
       setSentenceBlocks(prev => prev.map(block => 
         block.originalText === text 
           ? { ...block, translatedText: "Erro na tradução", isTranslating: false }
           : block
       ));
       toast({
         title: "Erro na tradução",
         description: "Verifique se a API key do GLM-4 está configurada",
         variant: "destructive",
       });
     }
   });

  // Funções da análise inteligente
  const handleSentenceClick = (sentence: string) => {
    setSelectedSentence(sentence);
    
    // Marcar como analisando
    setSentenceBlocks(prev => prev.map(block => 
      block.originalText === sentence 
        ? { ...block, isAnalyzing: true }
        : block
    ));

    // Detectar se é pergunta ou descrição
    const isQuestion = /[?¿]/.test(sentence) || 
                      /^(que|what|who|where|when|why|how|como|onde|quando|por que|porque|qual|quem)/i.test(sentence.trim());
    
    const prompt = isQuestion 
      ? `Responda esta pergunta baseada no contexto da transcrição: "${sentence}"`
      : `Explique ou descreva o que está sendo dito nesta frase: "${sentence}"`;

    analyzeContent({
      transcription: transcript,
      question: prompt
    });
  };

  const detectQuestion = (text: string): boolean => {
    // Detecta perguntas em português e inglês
    const questionPatterns = [
      /[?¿]/,  // Marcas de interrogação
      /^(que|what|who|where|when|why|how|como|onde|quando|por que|porque|qual|quem|o que|qual é|como é|where is|what is)/i,
      /\b(pergunta|question|dúvida|doubt)\b/i
    ];
    
    return questionPatterns.some(pattern => pattern.test(text));
  };

  const handleManualQuestion = () => {
    if (!aiQuestion.trim() || !transcript) {
      toast({
        title: "Aviso", 
        description: "Digite uma pergunta e certifique-se de que há conteúdo transcrito",
        variant: "destructive",
      });
      return;
    }

    analyzeContent({
      transcription: transcript,
      question: aiQuestion.trim()
    });

    setAiQuestion(""); // Limpar campo após enviar
  };

   // Processar transcript em tempo real - LÓGICA COMPLETAMENTE REFEITA
   useEffect(() => {
     if (!transcript) {
       setInterimText("");
       setLastProcessedTranscript("");
       return;
     }

     // Separar texto final do texto interim (em andamento)
     if (transcript.includes('[INTERIM]')) {
       const parts = transcript.split('[INTERIM]');
       const finalText = parts[0].trim();
       const currentInterim = parts[1].trim();

       setInterimText(currentInterim);

       // Processar apenas o texto final quando ele mudar
       if (finalText && finalText !== lastProcessedTranscript) {
         processFinalTranscript(finalText);
         setLastProcessedTranscript(finalText);
       }
     } else {
       // Não há texto interim, processar tudo como final
       setInterimText("");
       if (transcript !== lastProcessedTranscript) {
         processFinalTranscript(transcript);
         setLastProcessedTranscript(transcript);
       }
     }
   }, [transcript]);

   const processFinalTranscript = (finalText: string) => {
     if (!finalText) return;

     // LÓGICA NOVA: Detecta quando uma nova frase começa
     // Compara com o último texto processado para encontrar a nova parte
     let newText = finalText;

     if (lastProcessedTranscript && finalText.startsWith(lastProcessedTranscript)) {
       // Extrai apenas a parte nova do texto
       newText = finalText.slice(lastProcessedTranscript.length).trim();
     }

     // Remove pontuação do início se houver
     newText = newText.replace(/^[.,!?;\s]+/, '').trim();

     if (!newText || newText.length < 2) return;

     // Divide em frases baseadas em pontuação forte
     const sentences = newText.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);

     if (sentences.length === 0) return;

     const newBlocks: SentenceBlock[] = sentences.map(sentence => {
       const isClickable = true; // Todas as sentenças são clicáveis agora
       const block: SentenceBlock = {
         id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
         originalText: sentence,
         isTranslating: false,
         showTranslation: false,
         isClickable,
         timestamp: new Date().toLocaleTimeString('pt-BR', {
           hour: '2-digit',
           minute: '2-digit',
           second: '2-digit'
         })
       };

       // Detecção automática de perguntas se ativada
       if (autoResponseEnabled && detectQuestion(sentence)) {
         setTimeout(() => {
           handleSentenceClick(sentence);
         }, 1000); // Delay para não sobrecarregar a IA
       }

       return block;
     });

     setSentenceBlocks(prev => [...prev, ...newBlocks]);
   };

   const handleTranslationClick = (blockId: string) => {
     // VERIFICAÇÃO CORRIGIDA - mostra mensagens mais específicas
     if (!autoTranslationEnabled) {
       toast({
         title: "Tradução desativada",
         description: "Ative a tradução automática para usar este recurso",
         variant: "default",
       });
       return;
     }

     // Auto-selecionar idioma se não estiver definido
     let targetLang = translationTargetLanguage;
     if (!targetLang || targetLang === 'auto' || targetLang.trim() === '') {
       const currentLang = localStorage.getItem('currentLanguage') || 'pt-BR';
       if (currentLang === "pt-BR") {
         targetLang = "en-US";
       } else if (currentLang === "en-US") {
         targetLang = "pt-BR";
       } else if (currentLang === "es-ES") {
         targetLang = "pt-BR";
       } else {
         targetLang = "en-US";
       }
     }

     const block = sentenceBlocks.find(b => b.id === blockId);
     if (!block) return;

     // Se já tem tradução, apenas alternar a exibição
     if (block.translatedText) {
       setSentenceBlocks(prev => prev.map(b => 
         b.id === blockId 
           ? { ...b, showTranslation: !b.showTranslation }
           : b
       ));
       return;
     }

     // Se não tem tradução, fazer a tradução
     if (!block.isTranslating) {
       setSentenceBlocks(prev => prev.map(b => 
         b.id === blockId 
           ? { ...b, isTranslating: true }
           : b
       ));

       translateSentence({ 
         text: block.originalText, 
         targetLanguage: targetLang 
       });
     }
   };

   const handleCopy = async () => {
     try {
       const textToCopy = sentenceBlocks.map(block => block.originalText).join('. ') + 
                         (interimText ? `. ${interimText}` : '');

       await navigator.clipboard.writeText(textToCopy);
       toast({
         title: "Copiado!",
         description: "Texto copiado para a área de transferência",
       });
     } catch (error) {
       toast({
         title: "Erro ao copiar",
         description: "Não foi possível copiar o texto",
         variant: "destructive",
       });
     }
   };

   const handleDownload = () => {
     const textToDownload = sentenceBlocks.map(block => block.originalText).join('. ') + 
                           (interimText ? `. ${interimText}` : '');

     const blob = new Blob([textToDownload], { type: 'text/plain' });
     const url = URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url;
     a.download = `transcricao-${new Date().toISOString().split('T')[0]}.txt`;
     document.body.appendChild(a);
     a.click();
     document.body.removeChild(a);
     URL.revokeObjectURL(url);

     toast({
       title: "Download realizado",
       description: "Transcrição salva com sucesso",
     });
   };

   const clearAll = () => {
     setSentenceBlocks([]);
     setLastProcessedTranscript("");
     setInterimText("");
     toast({
       title: "Limpo",
       description: "Transcrição reiniciada",
     });
   };

   return (
     <div>
       <div className="flex items-center justify-between mb-6">
         <h2 className="text-2xl font-bold text-white drop-shadow-lg">Transcrição em Tempo Real</h2>
         <div className="flex items-center space-x-3">
           <Button
             onClick={clearAll}
             variant="ghost"
             size="sm"
             className="text-white hover:bg-red-500/20 hover:scale-110 transition-all duration-300"
             title="Limpar transcrição"
           >
             <Trash2 className="w-4 h-4" />
           </Button>
           <Button
             onClick={handleCopy}
             variant="ghost"
             size="sm"
             disabled={sentenceBlocks.length === 0 && !interimText}
             className="text-white hover:bg-white/20 hover:scale-110 transition-all duration-300"
             title="Copiar transcrição"
           >
             <Copy className="w-4 h-4" />
           </Button>
           <Button
             onClick={handleDownload}
             variant="ghost"
             size="sm"
             disabled={sentenceBlocks.length === 0 && !interimText}
             className="text-white hover:bg-white/20 hover:scale-110 transition-all duration-300"
             title="Baixar transcrição"
           >
             <Download className="w-4 h-4" />
           </Button>
           <Button
             onClick={() => setIsExpanded(!isExpanded)}
             variant="ghost"
             size="sm"
             className="text-white hover:bg-white/20 hover:scale-110 transition-all duration-300"
             title={isExpanded ? "Minimizar" : "Expandir"}
           >
             <Maximize className="w-4 h-4" />
           </Button>
         </div>
       </div>

       <div className={`glass-card rounded-2xl p-6 ${isExpanded ? 'h-[600px]' : 'h-80'} overflow-y-auto border-2 border-dashed border-white/30 shadow-large transition-all duration-500`}>
         {sentenceBlocks.length > 0 || interimText ? (
           <div className="space-y-3">
             {/* Frases já processadas - CADA UMA SEPARADA */}
             {sentenceBlocks.map((block) => (
               <div
                 key={block.id}
                 onClick={() => block.isClickable ? handleSentenceClick(block.originalText) : handleTranslationClick(block.id)}
                 className={`
                   relative bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg 
                   border border-gray-200/50 transition-all duration-300
                   ${autoTranslationEnabled ? 'cursor-pointer hover:bg-white hover:shadow-xl hover:scale-[1.02]' : 'cursor-default'}
                 `}
               >
                 <div className="text-xs text-gray-500 mb-2 font-medium">
                   {block.timestamp}
                 </div>

                 <div className="text-gray-800 font-medium text-lg leading-relaxed mb-2">
                   {block.originalText}
                 </div>

                 {autoTranslationEnabled && (
                   <div className="mt-3">
                     {!block.isTranslating && !block.translatedText && (
                       <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 border border-blue-200/50 hover:border-blue-300 transition-all duration-200">
                         <div className="flex items-center justify-between">
                           <div className="flex items-center space-x-2">
                             <div className="p-1.5 bg-blue-100 rounded-full">
                               <Globe className="w-3 h-3 text-blue-600" />
                             </div>
                             <span className="text-sm font-medium text-blue-700">Clique para traduzir</span>
                           </div>
                           <div className="text-xs text-blue-500 bg-blue-100 px-2 py-1 rounded-full">
                             Instant
                           </div>
                         </div>
                       </div>
                     )}

                     {block.isTranslating && (
                       <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-3 border border-amber-200">
                         <div className="flex items-center space-x-2">
                           <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
                           <span className="text-sm font-medium text-amber-700">Traduzindo...</span>
                           <div className="ml-auto">
                             <div className="flex space-x-1">
                               <div className="w-1 h-1 bg-amber-400 rounded-full animate-pulse"></div>
                               <div className="w-1 h-1 bg-amber-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                               <div className="w-1 h-1 bg-amber-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                             </div>
                           </div>
                         </div>
                       </div>
                     )}
                   </div>
                 )}

                 {block.showTranslation && block.translatedText && (
                   <div className="mt-3">
                     <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-4 border border-emerald-200 shadow-sm">
                       <div className="flex items-center justify-between mb-2">
                         <div className="flex items-center space-x-2">
                           <div className="p-1.5 bg-emerald-100 rounded-full">
                             <RotateCcw className="w-3 h-3 text-emerald-600" />
                           </div>
                           <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Traduzido</span>
                         </div>
                         <div className="text-xs text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full font-medium">
                           ✓ Concluído
                         </div>
                       </div>
                       <div className="text-emerald-800 font-medium text-lg leading-relaxed">
                         {block.translatedText}
                       </div>
                     </div>
                   </div>
                 )}

                 {/* Nova seção: Análise da IA */}
                 {block.isClickable && (
                   <div className="mt-3">
                     {!block.isAnalyzing && !block.aiResponse && (
                       <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 border border-purple-200/50 hover:border-purple-300 transition-all duration-200">
                         <div className="flex items-center justify-between">
                           <div className="flex items-center space-x-2">
                             <div className="p-1.5 bg-purple-100 rounded-full">
                               <Brain className="w-3 h-3 text-purple-600" />
                             </div>
                             <span className="text-sm font-medium text-purple-700">Clique para análise da IA</span>
                           </div>
                           <div className="text-xs text-purple-500 bg-purple-100 px-2 py-1 rounded-full">
                             GLM-4
                           </div>
                         </div>
                       </div>
                     )}

                     {block.isAnalyzing && (
                       <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-3 border border-indigo-200">
                         <div className="flex items-center space-x-2">
                           <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                           <span className="text-sm font-medium text-indigo-700">IA analisando...</span>
                           <div className="ml-auto">
                             <div className="flex space-x-1">
                               <div className="w-1 h-1 bg-indigo-400 rounded-full animate-pulse"></div>
                               <div className="w-1 h-1 bg-indigo-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                               <div className="w-1 h-1 bg-indigo-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                             </div>
                           </div>
                         </div>
                       </div>
                     )}

                     {block.aiResponse && (
                       <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200 shadow-sm">
                         <div className="flex items-center justify-between mb-2">
                           <div className="flex items-center space-x-2">
                             <div className="p-1.5 bg-blue-100 rounded-full">
                               <Brain className="w-3 h-3 text-blue-600" />
                             </div>
                             <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">IA Respondeu</span>
                           </div>
                           <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full font-medium">
                             ✓ GLM-4
                           </div>
                         </div>
                         <div className="text-blue-800 font-medium text-base leading-relaxed">
                           {block.aiResponse}
                         </div>
                       </div>
                     )}
                   </div>
                 )}
               </div>
             ))}

             {/* Texto em andamento (interim) */}
             {interimText && (
               <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border-2 border-dashed border-blue-300">
                 <div className="text-xs text-gray-500 mb-2 font-medium flex items-center space-x-2">
                   <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                   <span>Escutando...</span>
                 </div>
                 <div className="text-gray-700 italic text-lg">
                   {interimText}
                 </div>
               </div>
             )}

             {/* Avisos sobre tradução */}
             {!autoTranslationEnabled && sentenceBlocks.length > 0 && (
               <div className="text-center py-4">
                 <div className="inline-block bg-yellow-100/90 border border-yellow-300 rounded-lg px-4 py-2">
                   <span className="text-yellow-800 text-sm">
                     Ative a tradução automática para ver traduções
                   </span>
                 </div>
               </div>
             )}

             
           </div>
         ) : (
           <div className="flex items-center justify-center h-full text-white/60">
             <div className="text-center">
               <div className="text-5xl mb-4 opacity-50">🎤</div>
               <p className="text-lg">Aguardando áudio...</p>
               <p className="text-sm mt-2">Inicie a gravação para ver a transcrição</p>
             </div>
           </div>
         )}

         {isRecording && (
           <div className="flex items-center space-x-2 mt-4 opacity-75">
             <div className="flex space-x-1">
               <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
               <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
               <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
             </div>
             <span className="text-xs text-white/70 font-medium">Gravando...</span>
           </div>
         )}
       </div>

       {/* Seção de Análise Inteligente com GLM-4 */}
       {transcript && (
         <div className="mt-6 glass-card rounded-3xl shadow-large border-white/20 p-6">
           <div className="flex items-center justify-between mb-4">
             <div className="flex items-center space-x-3">
               <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                 <Brain className="w-5 h-5 text-white" />
               </div>
               <h3 className="text-xl font-bold text-white">Análise Inteligente com GLM-4</h3>
             </div>
             
             <div className="flex items-center space-x-3">
               <Badge variant="outline" className="text-purple-300 border-purple-500/30">
                 {autoResponseEnabled ? "AUTO ON" : "AUTO OFF"}
               </Badge>
               <div className="flex items-center space-x-2">
                 <ZapOff className="w-4 h-4 text-gray-400" />
                 <Switch 
                   checked={autoResponseEnabled}
                   onCheckedChange={setAutoResponseEnabled}
                   className="data-[state=checked]:bg-purple-600"
                 />
                 <Zap className="w-4 h-4 text-purple-400" />
               </div>
             </div>
           </div>

           {autoResponseEnabled && (
             <div className="mb-4 p-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg border border-purple-500/30">
               <div className="flex items-center space-x-2 text-purple-300">
                 <MessageCircle className="w-4 h-4" />
                 <span className="text-sm font-medium">Detecção automática ativada - IA responderá perguntas automaticamente</span>
               </div>
             </div>
           )}

           <div className="space-y-4">
             <div className="flex space-x-2">
               <Textarea
                 placeholder="Faça uma pergunta sobre o conteúdo transcrito..."
                 value={aiQuestion}
                 onChange={(e) => setAiQuestion(e.target.value)}
                 className="flex-1 bg-white/10 border-white/30 text-white placeholder-white/60 resize-none"
                 rows={2}
                 onKeyPress={(e) => {
                   if (e.key === 'Enter' && !e.shiftKey) {
                     e.preventDefault();
                     handleManualQuestion();
                   }
                 }}
               />
               <Button
                 onClick={handleManualQuestion}
                 disabled={isAnalyzing || !aiQuestion.trim()}
                 className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6"
               >
                 {isAnalyzing ? (
                   <Loader2 className="w-4 h-4 animate-spin" />
                 ) : (
                   "Perguntar"
                 )}
               </Button>
             </div>

             {lastAiResponse && (
               <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg p-4 border border-blue-500/30">
                 <div className="flex items-center justify-between mb-2">
                   <div className="flex items-center space-x-2">
                     <Brain className="w-4 h-4 text-blue-400" />
                     <span className="text-sm font-semibold text-blue-300">Resposta da IA:</span>
                   </div>
                   <Badge variant="outline" className="text-blue-300 border-blue-500/30">
                     GLM-4
                   </Badge>
                 </div>
                 <p className="text-white leading-relaxed">{lastAiResponse}</p>
               </div>
             )}

             <div className="text-center">
               <p className="text-white/60 text-sm">
                 💡 Clique em qualquer mensagem acima para análise específica da IA
               </p>
             </div>
           </div>
         </div>
       )}
     </div>
   );
 }