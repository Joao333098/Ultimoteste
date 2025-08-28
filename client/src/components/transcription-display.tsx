 import React, { useState, useEffect } from "react";
 import { Copy, Download, Maximize, Trash2 } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { useToast } from "@/hooks/use-toast";
 import { useMutation } from "@tanstack/react-query";
 import { apiRequest } from "@/lib/queryClient";

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

     setSentenceBlocks(prev => [...prev, ...newBlocks]);
   };

   const handleSentenceClick = (blockId: string) => {
     // VERIFICAÇÃO CORRIGIDA - mostra mensagens mais específicas
     if (!autoTranslationEnabled) {
       toast({
         title: "Tradução desativada",
         description: "Ative a tradução automática para usar este recurso",
         variant: "default",
       });
       return;
     }

     if (!translationTargetLanguage || translationTargetLanguage === 'auto') {
       toast({
         title: "Idioma não selecionado",
         description: "Selecione um idioma de destino nas configurações",
         variant: "destructive",
       });
       return;
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
         targetLanguage: translationTargetLanguage 
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
                   <div className="flex items-center justify-between">
                     <div className="text-xs text-blue-600 font-medium flex items-center space-x-1">
                       <span>🌐</span>
                       <span>Clique para traduzir</span>
                     </div>

                     {block.isTranslating && (
                       <div className="text-xs text-blue-500 flex items-center space-x-1">
                         <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                         <span>Traduzindo...</span>
                       </div>
                     )}
                   </div>
                 )}

                 {block.showTranslation && block.translatedText && (
                   <div className="mt-3 pt-3 border-t border-gray-200">
                     <div className="bg-blue-50 rounded-lg p-3 border-l-4 border-blue-400">
                       <div className="text-xs text-blue-600 font-semibold mb-1 flex items-center space-x-1">
                         <span>🔄</span>
                         <span>TRADUZIDO</span>
                       </div>
                       <div className="text-blue-800 font-medium text-lg">
                         {block.translatedText}
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
     </div>
   );
 }