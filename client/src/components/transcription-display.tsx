 import React, { useState, useEffect, useCallback } from "react";
 import { Copy, Download, Maximize, Trash2, Brain, Sparkles, Bot, Zap, Heart, FileText, Tag } from "lucide-react";
 import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
 import { useToast } from "@/hooks/use-toast";
 import { useMutation } from "@tanstack/react-query";
 import { apiRequest } from "@/lib/queryClient";
import { useAdvancedAiAnalysis } from "@/hooks/use-advanced-ai-analysis";

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
   isAnalyzing?: boolean;
   aiResponse?: string;
   hasAiAnalysis?: boolean;
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
  
  // Estados para IA avançada
  const [aiQuestion, setAiQuestion] = useState("");
  const [autoAiEnabled, setAutoAiEnabled] = useState(true);
  const [lastAnalyzedText, setLastAnalyzedText] = useState("");
  const [isAutoAnalyzing, setIsAutoAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

   // Hook de IA avançada
  const { analyzeAdvanced, isAnalyzing } = useAdvancedAiAnalysis({
    onSuccess: (result: any) => {
      // Atualizar resultado geral
      setAnalysisResult(result);
      
      // Atualizar bloco específico se foi análise de clique
      setSentenceBlocks(prev => prev.map(block => 
        block.isAnalyzing 
          ? { ...block, isAnalyzing: false, aiResponse: result.answer || result.response, hasAiAnalysis: true }
          : block
      ));
      
      toast({
        title: "Análise IA Concluída",
        description: "Resposta gerada com sucesso!",
      });
    },
    onError: (error: any) => {
      setSentenceBlocks(prev => prev.map(block => 
        block.isAnalyzing 
          ? { ...block, isAnalyzing: false, aiResponse: "Erro na análise IA", hasAiAnalysis: false }
          : block
      ));
      
      toast({
        title: "Erro na Análise IA",
        description: "Tente novamente em alguns segundos",
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

     const newBlocks: SentenceBlock[] = sentences.map(sentence => ({
       id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
       originalText: sentence,
       isTranslating: false,
       showTranslation: false,
       timestamp: new Date().toLocaleTimeString('pt-BR', {
         hour: '2-digit',
         minute: '2-digit',
         second: '2-digit'
       })
     }));

     setSentenceBlocks(prev => {
       const updated = [...prev, ...newBlocks];
       
       // Análise automática da IA se ativada
       if (autoAiEnabled && newBlocks.length > 0) {
         const lastBlock = newBlocks[newBlocks.length - 1];
         if (detectQuestion(lastBlock.originalText) || detectMath(lastBlock.originalText)) {
           setTimeout(() => handleAutoAiAnalysis(lastBlock.originalText), 1500);
         }
       }
       
       return updated;
     });
   };

   // Funções de detecção melhoradas
   const detectQuestion = useCallback((text: string): boolean => {
     const questionPatterns = [
       /[?¿]/,  // Marcas de interrogação
       /^(que|what|who|where|when|why|how|como|onde|quando|por que|porque|qual|quem|o que|qual é|como é|where is|what is)/i,
       /\b(pergunta|question|dúvida|doubt)\b/i,
       // Perguntas matemáticas
       /\b(quanto é|quanto vale|qual é o resultado|calculate|soma|subtração|multiplicação|divisão)\b/i,
       // Expressões matemáticas simples
       /\d+\s*[+\-*/÷×]\s*\d+/,
       /\bmais\b.*\d|\d.*\bmais\b/i,
       /\bmenos\b.*\d|\d.*\bmenos\b/i,
       /\bvezes\b.*\d|\d.*\bvezes\b/i,
       /\bdividido\b.*\d|\d.*\bdividido\b/i,
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

   const detectMath = useCallback((text: string): boolean => {
     const mathPatterns = [
       /\d+\s*[+\-*/÷×]\s*\d+/,
       /\b(quanto é|qual é o resultado|calcule|some|subtraia|multiplique|divida)\b/i,
       /\b(mais|menos|vezes|dividido|por)\b.*\d/i,
       /\d+.*\b(mais|menos|vezes|dividido|por)\b/i
     ];
     return mathPatterns.some(pattern => pattern.test(text));
   }, []);

   // Análise automática da IA
   const handleAutoAiAnalysis = useCallback(async (text: string) => {
     if (isAutoAnalyzing) return;
     
     setIsAutoAnalyzing(true);
     console.log("🤖 Análise IA automática iniciada para:", text.substring(0, 50));
     
     try {
       const fullTranscript = sentenceBlocks.map(b => b.originalText).join('. ') + '. ' + text;
       
       await analyzeAdvanced({
         transcription: fullTranscript,
         question: detectQuestion(text) 
           ? `Responda esta pergunta baseada no contexto: "${text}"`
           : `Analise e descreva esta informação: "${text}"`,
         useContext: true
       });
     } catch (error) {
       console.error("Erro na análise IA automática:", error);
     } finally {
       setIsAutoAnalyzing(false);
     }
   }, [analyzeAdvanced, sentenceBlocks, isAutoAnalyzing, detectQuestion]);

   // Clique na mensagem transcrita para análise IA
   const handleSentenceClick = (blockId: string) => {
     const block = sentenceBlocks.find(b => b.id === blockId);
     if (!block) return;

     // Se já tem análise IA, alternar exibição
     if (block.aiResponse) {
       setSentenceBlocks(prev => prev.map(b => 
         b.id === blockId 
           ? { ...b, hasAiAnalysis: !b.hasAiAnalysis }
           : b
       ));
       return;
     }

     // Se não tem análise, fazer análise da IA
     if (!block.isAnalyzing) {
       setSentenceBlocks(prev => prev.map(b => 
         b.id === blockId 
           ? { ...b, isAnalyzing: true }
           : b
       ));

       const fullTranscript = sentenceBlocks.map(b => b.originalText).join('. ');
       
       const isQuestion = detectQuestion(block.originalText);
       const prompt = isQuestion 
         ? `Responda esta pergunta baseada no contexto: "${block.originalText}"`
         : `Analise e descreva esta informação: "${block.originalText}"`;

       analyzeAdvanced({
         transcription: fullTranscript,
         question: prompt,
         useContext: true
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
         <div className="flex items-center gap-4">
           <h2 className="text-2xl font-bold text-white drop-shadow-lg">Transcrição em Tempo Real</h2>
           
           {/* Toggle IA Automática */}
           <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
             <Bot className="w-4 h-4 text-blue-300" />
             <span className="text-sm text-white font-medium">IA Auto</span>
             <Switch 
               checked={autoAiEnabled}
               onCheckedChange={setAutoAiEnabled}
               className="data-[state=checked]:bg-blue-500"
             />
             {autoAiEnabled && (
               <Badge variant="secondary" className="bg-green-500/20 text-green-300 border-green-500/30 text-xs">
                 <Zap className="w-3 h-3 mr-1" />
                 ATIVO
               </Badge>
             )}
           </div>
         </div>
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
             variant="ghost"
             size="sm"
             className="text-white hover:bg-white/20 hover:scale-110 transition-all duration-300"
             title="Expandir"
           >
             <Maximize className="w-4 h-4" />
           </Button>
         </div>
       </div>

       <div className="glass-card rounded-2xl p-6 h-80 overflow-y-auto border-2 border-dashed border-white/30 shadow-large">
         {sentenceBlocks.length > 0 || interimText ? (
           <div className="space-y-3">
             {/* Frases já processadas - CADA UMA SEPARADA */}
             {sentenceBlocks.map((block) => (
               <div
                 key={block.id}
                 onClick={() => handleSentenceClick(block.id)}
                 className={`
                   relative bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg 
                   border border-gray-200/50 transition-all duration-300
                   cursor-pointer hover:bg-white hover:shadow-xl hover:scale-[1.02] hover:border-blue-300/50
                 `}
               >
                 <div className="text-xs text-gray-500 mb-2 font-medium">
                   {block.timestamp}
                 </div>

                 <div className="text-gray-800 font-medium text-lg leading-relaxed mb-2">
                   {block.originalText}
                 </div>

                 <div className="flex items-center justify-between">
                   <div className="text-xs text-blue-600 font-medium flex items-center space-x-1">
                     <Brain className="w-3 h-3" />
                     <span>Clique para análise IA</span>
                   </div>

                   {block.isAnalyzing && (
                     <div className="text-xs text-blue-500 flex items-center space-x-1">
                       <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                       <span>Analisando...</span>
                     </div>
                   )}
                 </div>

                 {block.hasAiAnalysis && block.aiResponse && (
                   <div className="mt-3 pt-3 border-t border-gray-200">
                     <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 border-l-4 border-blue-400">
                       <div className="text-xs text-blue-600 font-semibold mb-1 flex items-center space-x-1">
                         <Brain className="w-3 h-3" />
                         <span>ANÁLISE IA</span>
                       </div>
                       <div className="text-blue-800 font-medium text-sm leading-relaxed">
                         {block.aiResponse}
                       </div>
                     </div>
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
                     💡 Ative a tradução automática para ver traduções
                   </span>
                 </div>
               </div>
             )}

             {autoTranslationEnabled && (!translationTargetLanguage || translationTargetLanguage === 'auto') && (
               <div className="text-center py-4">
                 <div className="inline-block bg-orange-100/90 border border-orange-300 rounded-lg px-4 py-2">
                   <span className="text-orange-800 text-sm">
                     ⚠️ Selecione um idioma de destino para traduzir
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
       <div className="mt-8">
         <div className="flex items-center justify-between mb-4">
           <h3 className="text-xl font-bold text-white drop-shadow-lg flex items-center gap-2">
             <Brain className="w-5 h-5 text-blue-300" />
             Análise Inteligente com GLM-4
           </h3>
           {isAutoAnalyzing && (
             <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">
               <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse mr-2"></div>
               ANALISANDO
             </Badge>
           )}
         </div>

         {/* Painel de análise */}
         <div className="glass-card rounded-2xl p-6 border border-white/20 shadow-large">
           {/* Controles de Análise */}
           <div className="mb-6">
             <div className="flex flex-wrap gap-3">
               <Button
                 onClick={() => {
                   const fullTranscript = sentenceBlocks.map(b => b.originalText).join('. ') + (interimText ? '. ' + interimText : '');
                   analyzeAdvanced({
                     transcription: fullTranscript,
                     question: "Analise o sentimento geral desta conversa",
                     useContext: true
                   });
                 }}
                 variant="outline"
                 size="sm"
                 className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                 disabled={sentenceBlocks.length === 0 || isAnalyzing}
               >
                 <Heart className="w-4 h-4 mr-2" />
                 Sentimento
               </Button>

               <Button
                 onClick={() => {
                   const fullTranscript = sentenceBlocks.map(b => b.originalText).join('. ') + (interimText ? '. ' + interimText : '');
                   analyzeAdvanced({
                     transcription: fullTranscript,
                     question: "Faça um resumo das principais informações desta conversa",
                     useContext: true
                   });
                 }}
                 variant="outline"
                 size="sm"
                 className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                 disabled={sentenceBlocks.length === 0 || isAnalyzing}
               >
                 <FileText className="w-4 h-4 mr-2" />
                 Resumo
               </Button>

               <Button
                 onClick={() => {
                   const fullTranscript = sentenceBlocks.map(b => b.originalText).join('. ') + (interimText ? '. ' + interimText : '');
                   analyzeAdvanced({
                     transcription: fullTranscript,
                     question: "Identifique palavras-chave e tópicos principais desta conversa",
                     useContext: true
                   });
                 }}
                 variant="outline"
                 size="sm"
                 className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                 disabled={sentenceBlocks.length === 0 || isAnalyzing}
               >
                 <Tag className="w-4 h-4 mr-2" />
                 Palavras-chave
               </Button>
             </div>
           </div>

           {/* Resultado da análise */}
           {analysisResult ? (
             <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 shadow-lg">
               <div className="flex items-center gap-2 mb-4">
                 <Sparkles className="w-5 h-5 text-purple-600" />
                 <h4 className="font-semibold text-gray-800">Resultado da Análise</h4>
                 <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                   GLM-4
                 </Badge>
               </div>
               <div className="prose prose-gray max-w-none">
                 <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                   {analysisResult.response}
                 </div>
               </div>
             </div>
           ) : (
             <div className="text-center py-8 text-white/60">
               <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
               <p className="text-lg">Nenhuma análise realizada ainda</p>
               <p className="text-sm mt-2">Use os botões acima ou fale uma pergunta para iniciar a análise</p>
             </div>
           )}
         </div>
       </div>
     </div>
   );
 }