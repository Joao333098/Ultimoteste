 import React, { useState, useEffect, useCallback } from "react";
 import { Copy, Download, Maximize, Trash2, Brain, Sparkles, Bot, Zap, Heart, FileText, Tag, Send, Search, X, History, TrendingUp } from "lucide-react";
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
  
  // Estados para busca
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

   // Hook de IA avançada
  const { analyzeAdvanced, isAnalyzing } = useAdvancedAiAnalysis({
    onSuccess: (result: any) => {
      // SEMPRE atualizar resultado geral
      setAnalysisResult(result);
      
      // SÓ atualizar bloco específico se NÃO for análise automática
      if (!isAutoAnalyzing) {
        setSentenceBlocks(prev => prev.map(block => 
          block.isAnalyzing 
            ? { ...block, isAnalyzing: false, aiResponse: result.answer || result.response, hasAiAnalysis: true }
            : block
        ));
        
        toast({
          title: "Análise IA Concluída",
          description: "Clique na mensagem para ver a resposta!",
        });
      } else {
        // Para análise automática, apenas notificar e RESETAR estado
        setIsAutoAnalyzing(false);
        toast({
          title: "IA Automática",
          description: "Análise concluída! Veja na seção abaixo.",
        });
      }
    },
    onError: (error: any) => {
      if (!isAutoAnalyzing) {
        setSentenceBlocks(prev => prev.map(block => 
          block.isAnalyzing 
            ? { ...block, isAnalyzing: false, aiResponse: "Erro na análise IA", hasAiAnalysis: false }
            : block
        ));
      } else {
        // Para análise automática, apenas resetar estado
        setIsAutoAnalyzing(false);
      }
      
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

   // Processar transcript em tempo real - PROTEGIDO contra análise automática
   useEffect(() => {
     if (!transcript) {
       setInterimText("");
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
   }, [transcript, lastProcessedTranscript]);

   // Funções de detecção melhoradas - PRIMEIRO
   const detectQuestion = useCallback((text: string): boolean => {
     const questionPatterns = [
       /[?¿]/,  // Marcas de interrogação
       /^(que|what|who|where|when|why|how|como|onde|quando|por que|porque|qual|quem)/i,
       /\b(o que|what)\s+.*\b(acabei de|just|disse|said|falei|spoke|mencionei|mentioned)/i,  // "o que eu acabei de falar"
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
       /\b(quanto é|quanto vale|qual é o resultado|calcule|some|subtraia|multiplique|divida)\b/i,
       /\b\d+\s+(mais|menos|vezes|dividido|por)\s+\d+\b/i,
       /\bmais\b.*\d|\d.*\bmais\b/i,
       /\bmenos\b.*\d|\d.*\bmenos\b/i,
       /\bvezes\b.*\d|\d.*\bvezes\b/i,
       /\bdividido\b.*\d|\d.*\bdividido\b/i,
       // Padrões específicos em português
       /\b\d+\s*\+\s*\d+/,
       /\btrês\s+mais\s+três/i,
       /\bdois\s+mais\s+dois/i,
       /\bquatro\s+menos\s+um/i
     ];
     return mathPatterns.some(pattern => pattern.test(text));
   }, []);

   const processFinalTranscript = useCallback((finalText: string) => {
     if (!finalText) return;

     // LÓGICA SEGURA: Detecta quando uma nova frase começa
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

     // SEGURO: Atualizar blocos SEM análise automática interferindo
     setSentenceBlocks(prev => {
       console.log("📝 Adicionando novos blocos:", newBlocks.length);
       return [...prev, ...newBlocks];
     });

     // Análise automática MELHORADA - só para perguntas claras, sem interferir
     if (autoAiEnabled && newBlocks.length > 0 && !isAutoAnalyzing) {
       const lastBlock = newBlocks[newBlocks.length - 1];
       const text = lastBlock.originalText.toLowerCase();
       
       console.log("🔍 Verificando análise automática para:", text);
       
       // Detecção melhorada
       const isQuestion = detectQuestion(text);
       const isMath = detectMath(text);
       
       if (isQuestion || isMath) {
         console.log("✅ Pergunta detectada automaticamente:", text);
         setIsAutoAnalyzing(true);
         
         // Fazer análise SEM mexer nos blocos
         setTimeout(() => {
           const fullContext = sentenceBlocks.map(b => b.originalText).join('. ') + '. ' + lastBlock.originalText;
           
           analyzeAdvanced({
             transcription: fullContext,
             question: `Pergunta: "${lastBlock.originalText}" - Responda de forma clara e completa.`,
             useContext: true
           });
         }, 800);
       } else {
         console.log("❌ Não é pergunta, pulando análise automática");
       }
     }
   }, [lastProcessedTranscript, autoAiEnabled, detectQuestion, detectMath]);

   // Função específica para análise IA
   const handleAiClick = (blockId: string) => {
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
         ? `Responda esta pergunta de forma clara e direta: "${block.originalText}"`
         : `Analise e explique brevemente: "${block.originalText}"`;

       analyzeAdvanced({
         transcription: fullTranscript,
         question: prompt,
         useContext: true
       });
     }
   };

   // Função específica para tradução
   const handleTranslationClick = (blockId: string) => {
     const block = sentenceBlocks.find(b => b.id === blockId);
     if (!block) return;

     // Verificar se tradução está habilitada
     if (!autoTranslationEnabled) {
       toast({
         title: "Tradução desativada",
         description: "Ative a tradução automática primeiro",
         variant: "default",
       });
       return;
     }

     // Auto-selecionar idioma se não definido
     let targetLang = translationTargetLanguage;
     if (!targetLang || targetLang === 'auto') {
       targetLang = 'en-US'; // padrão para inglês
       toast({
         title: "Idioma definido automaticamente",
         description: "Traduzindo para inglês (EN-US)",
       });
     }

     // Se já tem tradução, alternar exibição
     if (block.translatedText) {
       setSentenceBlocks(prev => prev.map(b => 
         b.id === blockId 
           ? { ...b, showTranslation: !b.showTranslation }
           : b
       ));
       return;
     }

     // Se não tem tradução, fazer tradução
     if (!block.isTranslating) {
       setSentenceBlocks(prev => prev.map(b => 
         b.id === blockId 
           ? { ...b, isTranslating: true }
           : b
       ));

       console.log("🌐 Iniciando tradução manual:", block.originalText, "->", targetLang);
       translateSentence({ 
         text: block.originalText, 
         targetLanguage: targetLang 
       });
     }
   };

   // Clique geral na mensagem (agora apenas para feedback visual)
   const handleSentenceClick = (blockId: string) => {
     // Não faz nada - agora temos botões específicos
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

   // Função de busca inteligente
   const handleSearch = () => {
     const searchTerm = searchQuery;
     if (!searchTerm || !searchTerm.trim()) return;

     setIsSearching(true);

     // Busca simples nos blocos de texto
     const textMatches = sentenceBlocks
       .filter(block => 
         block.originalText.toLowerCase().includes(searchTerm.toLowerCase())
       )
       .map(block => ({
         type: 'match',
         text: block.originalText,
         timestamp: block.timestamp,
         highlightedText: block.originalText.replace(
           new RegExp(searchTerm, 'gi'),
           (match) => `**${match}**`
         )
       }));

     // Se parece uma pergunta, fazer análise com IA
     if (searchTerm.includes('?') || searchTerm.split(' ').length > 3) {
       const fullTranscript = sentenceBlocks.map(b => b.originalText).join('. ');
       analyzeAdvanced({
         transcription: fullTranscript,
         question: `Busca: "${searchTerm}" - Encontre informações relevantes e responda de forma clara.`,
         useContext: true
       });

       // Simular resposta da IA para busca
       setTimeout(() => {
         setSearchResults([
           {
             type: 'ai',
             answer: `Analisando "${searchTerm}" no conteúdo...`,
             relevantBlocks: textMatches.slice(0, 3).map(m => m.text)
           },
           ...textMatches
         ]);
         setIsSearching(false);
       }, 1500);
     } else {
       setSearchResults(textMatches);
       setIsSearching(false);
     }
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
           {/* Novo botão de busca */}
           <Button
             onClick={() => setShowSearchModal(true)}
             variant="ghost"
             size="sm"
             disabled={sentenceBlocks.length === 0}
             className="text-white hover:bg-blue-500/20 hover:scale-110 transition-all duration-300"
             title="Buscar no conteúdo"
           >
             <Search className="w-4 h-4" />
           </Button>
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
                 className={`
                   relative bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg 
                   border border-gray-200/50 transition-all duration-300
                   hover:shadow-xl hover:scale-[1.01]
                 `}
               >
                 <div className="text-xs text-gray-500 mb-2 font-medium">
                   {block.timestamp}
                 </div>

                 <div className="text-gray-800 font-medium text-lg leading-relaxed mb-2">
                   {block.originalText}
                 </div>

                 <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                     {/* Botão de IA */}
                     <Button
                       onClick={(e) => {
                         e.stopPropagation();
                         handleAiClick(block.id);
                       }}
                       variant="ghost"
                       size="sm"
                       className="h-6 px-2 text-xs text-blue-600 hover:bg-blue-100"
                       disabled={block.isAnalyzing}
                     >
                       <Brain className="w-3 h-3 mr-1" />
                       IA
                     </Button>
                     
                     {/* Botão de Tradução (sempre visível se ativado) */}
                     {autoTranslationEnabled && (
                       <Button
                         onClick={(e) => {
                           e.stopPropagation();
                           handleTranslationClick(block.id);
                         }}
                         variant="ghost"
                         size="sm"
                         className="h-6 px-2 text-xs text-green-600 hover:bg-green-100"
                         disabled={block.isTranslating}
                       >
                         <span className="mr-1">🌐</span>
                         Traduzir
                       </Button>
                     )}
                   </div>

                   <div className="flex items-center gap-2">
                     {block.isAnalyzing && (
                       <div className="text-xs text-blue-500 flex items-center space-x-1">
                         <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                         <span>Analisando...</span>
                       </div>
                     )}
                     
                     {block.isTranslating && (
                       <div className="text-xs text-green-500 flex items-center space-x-1">
                         <div className="w-3 h-3 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                         <span>Traduzindo...</span>
                       </div>
                     )}
                   </div>
                 </div>

                 {/* Exibir tradução se disponível */}
                 {block.showTranslation && block.translatedText && (
                   <div className="mt-3 pt-3 border-t border-gray-200">
                     <div className="bg-green-50 rounded-lg p-3 border-l-4 border-green-400">
                       <div className="text-xs text-green-600 font-semibold mb-1 flex items-center space-x-1">
                         <span>🔄</span>
                         <span>TRADUZIDO</span>
                       </div>
                       <div className="text-green-800 font-medium text-sm leading-relaxed">
                         {block.translatedText}
                       </div>
                     </div>
                   </div>
                 )}

                 {/* Exibir análise IA se disponível */}
                 {block.hasAiAnalysis && block.aiResponse && (
                   <div className="mt-3 pt-3 border-t border-gray-200">
                     <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 border-l-4 border-blue-400">
                       <div className="text-xs text-blue-600 font-semibold mb-1 flex items-center space-x-1">
                         <Brain className="w-3 h-3" />
                         <span>ANÁLISE IA</span>
                       </div>
                       <div className="text-blue-800 font-medium text-sm leading-relaxed">
                         {(block.aiResponse as any)?.answer || block.aiResponse || 'Análise processada'}
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

             {/* Status da IA e Tradução */}
             {sentenceBlocks.length > 0 && (
               <div className="text-center py-3">
                 <div className="flex items-center justify-center gap-4 flex-wrap">
                   {autoAiEnabled && (
                     <div className="bg-blue-100/90 border border-blue-300 rounded-full px-3 py-1 text-xs">
                       <span className="text-blue-800 font-medium">🤖 IA automática ativa</span>
                     </div>
                   )}
                   
                   {autoTranslationEnabled && translationTargetLanguage && translationTargetLanguage !== 'auto' && (
                     <div className="bg-green-100/90 border border-green-300 rounded-full px-3 py-1 text-xs">
                       <span className="text-green-800 font-medium">🌐 Tradução para {translationTargetLanguage.toUpperCase()}</span>
                     </div>
                   )}
                   
                   {autoTranslationEnabled && (!translationTargetLanguage || translationTargetLanguage === 'auto') && (
                     <div className="bg-orange-100/90 border border-orange-300 rounded-full px-3 py-1 text-xs">
                       <span className="text-orange-800 font-medium">⚠️ Selecione idioma para traduzir</span>
                     </div>
                   )}
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

       {/* Seção de Análise Inteligente com GLM-4 - OCULTA */}
       <div className="mt-8 hidden">
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

           {/* Campo para perguntas personalizadas */}
           <div className="mb-6">
             <div className="flex space-x-2">
               <input
                 type="text"
                 value={aiQuestion}
                 onChange={(e) => setAiQuestion(e.target.value)}
                 onKeyPress={(e) => {
                   if (e.key === 'Enter' && aiQuestion.trim() && !isAnalyzing) {
                     const fullTranscript = sentenceBlocks.map(b => b.originalText).join('. ') + (interimText ? '. ' + interimText : '');
                     analyzeAdvanced({
                       transcription: fullTranscript,
                       question: aiQuestion.trim(),
                       useContext: true
                     });
                     setAiQuestion('');
                   }
                 }}
                 placeholder="Faça uma pergunta sobre o conteúdo transcrito..."
                 className="flex-1 px-4 py-2 bg-white/10 border border-white/30 rounded-lg text-white placeholder:text-white/60 focus:outline-none focus:border-white/50 focus:bg-white/15 transition-all"
                 disabled={sentenceBlocks.length === 0 || isAnalyzing}
               />
               <Button
                 onClick={() => {
                   if (aiQuestion.trim() && !isAnalyzing) {
                     const fullTranscript = sentenceBlocks.map(b => b.originalText).join('. ') + (interimText ? '. ' + interimText : '');
                     analyzeAdvanced({
                       transcription: fullTranscript,
                       question: aiQuestion.trim(),
                       useContext: true
                     });
                     setAiQuestion('');
                   }
                 }}
                 disabled={sentenceBlocks.length === 0 || isAnalyzing || !aiQuestion.trim()}
                 className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
               >
                 {isAnalyzing ? (
                   <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                 ) : (
                   <Send className="w-4 h-4" />
                 )}
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
                 <div className="text-gray-700 leading-relaxed">
                   {(analysisResult as any)?.answer || (analysisResult as any)?.response || analysisResult}
                 </div>
                 
                 {/* Tópicos relacionados se disponíveis */}
                 {(analysisResult as any)?.relatedTopics && (analysisResult as any).relatedTopics.length > 0 && (
                   <div className="mt-3 pt-3 border-t border-gray-200">
                     <div className="text-xs text-gray-500 mb-2">Tópicos relacionados:</div>
                     <div className="flex flex-wrap gap-1">
                       {(analysisResult as any).relatedTopics.map((topic: string, index: number) => (
                         <Badge key={index} variant="outline" className="text-xs bg-gray-100">
                           {topic}
                         </Badge>
                       ))}
                     </div>
                   </div>
                 )}
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

       {/* Modal de Busca Inteligente */}
       {showSearchModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
           <div className="w-full max-w-3xl mx-4">
             <div className="glass-card rounded-3xl shadow-2xl border-2 border-white/20 overflow-hidden">
               {/* Header do Modal */}
               <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 p-6 border-b border-white/20">
                 <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                       <Search className="w-5 h-5 text-white" />
                     </div>
                     <div>
                       <h3 className="text-xl font-bold text-white">Busca Inteligente com IA</h3>
                       <p className="text-xs text-white/70 mt-1">Encontre informações específicas na transcrição</p>
                     </div>
                   </div>
                   <Button
                     onClick={() => {
                       setShowSearchModal(false);
                       setSearchQuery("");
                       setSearchResults([]);
                     }}
                     variant="ghost"
                     size="sm"
                     className="text-white hover:bg-white/20"
                   >
                     <X className="w-5 h-5" />
                   </Button>
                 </div>
               </div>

               {/* Corpo do Modal */}
               <div className="p-6">
                 {/* Campo de Busca */}
                 <div className="mb-6">
                   <div className="relative">
                     <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
                     <input
                       type="text"
                       value={searchQuery}
                       onChange={(e) => setSearchQuery(e.target.value)}
                       onKeyPress={(e) => {
                         if (e.key === 'Enter' && searchQuery.trim()) {
                           handleSearch();
                         }
                       }}
                       placeholder="Digite sua busca ou faça uma pergunta..."
                       className="w-full pl-12 pr-32 py-4 bg-white/10 border-2 border-white/30 rounded-2xl text-white placeholder:text-white/50 focus:outline-none focus:border-white/50 focus:bg-white/15 transition-all text-lg"
                       autoFocus
                     />
                     <Button
                       onClick={handleSearch}
                       disabled={!searchQuery.trim() || isSearching}
                       className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6"
                     >
                       {isSearching ? (
                         <div className="flex items-center gap-2">
                           <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                           <span>Buscando...</span>
                         </div>
                       ) : (
                         "Buscar"
                       )}
                     </Button>
                   </div>
                 </div>

                 {/* Sugestões de Busca */}
                 {searchResults.length === 0 && !isSearching && (
                   <div className="mb-6">
                     <p className="text-white/70 text-sm mb-3">Sugestões de busca:</p>
                     <div className="flex flex-wrap gap-2">
                       {[
                         "Principais tópicos",
                         "Perguntas mencionadas",
                         "Informações importantes",
                         "Datas e números",
                         "Nomes citados"
                       ].map((suggestion) => (
                         <button
                           key={suggestion}
                           onClick={() => {
                             setSearchQuery(suggestion);
                             handleSearch();
                           }}
                           className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/30 rounded-full text-sm text-white transition-all"
                         >
                           <TrendingUp className="w-3 h-3 inline mr-2" />
                           {suggestion}
                         </button>
                       ))}
                     </div>
                   </div>
                 )}

                 {/* Resultados da Busca */}
                 {searchResults.length > 0 && (
                   <div className="space-y-4 max-h-96 overflow-y-auto">
                     <p className="text-white/70 text-sm mb-3">
                       {searchResults.length} resultado{searchResults.length > 1 ? 's' : ''} encontrado{searchResults.length > 1 ? 's' : ''}:
                     </p>
                     {searchResults.map((result, index) => (
                       <div
                         key={index}
                         className="bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-200/50 hover:shadow-xl transition-all"
                       >
                         {result.type === 'match' ? (
                           <>
                             <div className="flex items-center gap-2 mb-2">
                               <Badge className="bg-blue-100 text-blue-700">
                                 Correspondência
                               </Badge>
                               <span className="text-xs text-gray-500">{result.timestamp}</span>
                             </div>
                             <p className="text-gray-800">
                               {result.highlightedText || result.text}
                             </p>
                           </>
                         ) : (
                           <>
                             <div className="flex items-center gap-2 mb-2">
                               <Badge className="bg-purple-100 text-purple-700">
                                 Resposta IA
                               </Badge>
                             </div>
                             <p className="text-gray-800">{result.answer}</p>
                             {result.relevantBlocks && (
                               <div className="mt-3 pt-3 border-t border-gray-200">
                                 <p className="text-xs text-gray-500 mb-2">Trechos relevantes:</p>
                                 {result.relevantBlocks.map((block: any, idx: number) => (
                                   <div key={idx} className="text-sm text-gray-600 mb-1">
                                     • {block}
                                   </div>
                                 ))}
                               </div>
                             )}
                           </>
                         )}
                       </div>
                     ))}
                   </div>
                 )}

                 {/* Histórico de Buscas */}
                 {searchResults.length === 0 && !isSearching && (
                   <div className="mt-6 pt-6 border-t border-white/20">
                     <div className="flex items-center gap-2 text-white/70 text-sm">
                       <History className="w-4 h-4" />
                       <span>Dica: Use perguntas completas para respostas mais precisas da IA</span>
                     </div>
                   </div>
                 )}
               </div>
             </div>
           </div>
         </div>
       )}
     </div>
   );
 }