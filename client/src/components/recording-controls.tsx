import { useState } from "react";
import { Mic, MicOff, RotateCcw, Globe, Brain, Languages, Settings, Trash2, Globe2, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import TranslationDialog from "./translation-dialog";

interface RecordingControlsProps {
  isRecording: boolean;
  recordingTime: number;
  audioLevel: number;
  detectedLanguage: string;
  confidence: number;
  currentLanguage: string;
  enhancedMode: boolean;
  transcript: string; // Adicionado
  onStartRecording: () => void;
  onStopRecording: () => void;
  onClearTranscript: () => void; // Adicionado
  onSwitchLanguage: (language: string) => void;
  onToggleEnhancedMode: () => void;
  autoTranslationEnabled: boolean;
  translationTargetLanguage: string;
  onToggleAutoTranslation: () => void;
  onSetTranslationTarget: (language: string) => void;
  onForceReanalysis?: () => void;
  enabledLanguages?: Record<string, boolean>;
  onToggleLanguage?: (language: string) => void;
}

export default function RecordingControls({
  isRecording,
  recordingTime,
  audioLevel,
  detectedLanguage,
  confidence,
  currentLanguage,
  enhancedMode,
  autoTranslationEnabled,
  translationTargetLanguage,
  transcript,
  onStartRecording,
  onStopRecording,
  onClearTranscript,
  onSwitchLanguage,
  onToggleEnhancedMode,
  onToggleAutoTranslation,
  onSetTranslationTarget,
  onForceReanalysis,
  enabledLanguages = {},
  onToggleLanguage
}: RecordingControlsProps) {
  const [isTranslationDialogOpen, setIsTranslationDialogOpen] = useState(false);

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6 drop-shadow-lg">Controles de Gravação</h2>

      <div className="space-y-6">
        {/* Recording Button */}
        <div className="text-center">
          <button
            data-testid="button-toggle-recording"
            onClick={isRecording ? onStopRecording : onStartRecording}
            className={`w-28 h-28 rounded-full flex items-center justify-center shadow-large hover:shadow-glow hover:scale-110 transition-all duration-500 group animate-glow ${
              isRecording
                ? 'bg-gradient-to-r from-red-500 to-red-600'
                : 'bg-gradient-accent'
            }`}
          >
            {isRecording ? (
              <MicOff className="text-white text-2xl group-hover:scale-110 transition-transform duration-200" />
            ) : (
              <Mic className="text-white text-2xl group-hover:scale-110 transition-transform duration-200" />
            )}
          </button>
          <p className="text-sm text-white/80 mt-4 font-medium">
            {isRecording ? 'Clique para parar' : 'Clique para iniciar'}
          </p>
          <div className="mt-2">
            <span className={`inline-flex items-center px-4 py-2 rounded-full text-xs font-medium shadow-medium ${
              isRecording
                ? 'bg-red-500/20 text-red-200 border border-red-400/30'
                : 'bg-white/20 text-white border border-white/30'
            }`}>
              <span className={`w-2 h-2 rounded-full mr-2 ${
                isRecording ? 'bg-red-400 animate-pulse-soft' : 'bg-gray-400'
              }`}></span>
              {isRecording ? 'Gravando...' : 'Pronto para gravar'}
            </span>
          </div>
        </div>

        {/* Language Detection */}
        <div className="glass-card rounded-2xl p-5 border-white/20">
          <h3 className="text-sm font-semibold text-white mb-4">Detecção de Idioma</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/70">Idioma Detectado:</span>
              <span data-testid="text-detected-language" className="text-sm font-medium text-white bg-white/20 px-3 py-1 rounded-full">
                {detectedLanguage}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/70">Confiança:</span>
              <span data-testid="text-confidence" className="text-sm font-medium text-white bg-green-500/30 px-3 py-1 rounded-full">
                {Math.round(confidence * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* Audio Levels */}
        <div className="glass-card rounded-2xl p-5 border-white/20">
          <h3 className="text-sm font-semibold text-white mb-4">Nível de Áudio</h3>
          <div className="flex items-center space-x-3">
            <div className="flex-1 bg-white/20 rounded-full h-3">
              <div
                data-testid="audio-level-bar"
                className="bg-gradient-accent h-full rounded-full transition-all duration-150 shadow-glow"
                style={{ width: `${audioLevel}%` }}
              ></div>
            </div>
            <span className="text-xs text-white font-medium bg-white/20 px-2 py-1 rounded">{Math.round(audioLevel)}%</span>
          </div>
        </div>

        {/* Language Selection */}
        <div className="glass-card rounded-2xl p-5 border-white/20">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center">
            <Globe className="w-4 h-4 mr-2" />
            Idioma da Transcrição
          </h3>
          <Select value={currentLanguage} onValueChange={onSwitchLanguage}>
            <SelectTrigger className="bg-white/20 border-white/30 text-white">
              <SelectValue placeholder="Selecione o idioma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
              <SelectItem value="en-US">English (United States)</SelectItem>
              <SelectItem value="es-ES">Español (España)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Enhanced Mode Toggle */}
        <div className="glass-card rounded-2xl p-5 border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Brain className="w-5 h-5 text-primary" />
              <div>
                <h3 className="text-sm font-semibold text-white">Modo Avançado</h3>
                <p className="text-xs text-white/70">IA para melhorar transcrição</p>
              </div>
            </div>
            <Switch
              checked={enhancedMode}
              onCheckedChange={onToggleEnhancedMode}
              className="data-[state=checked]:bg-primary"
            />
          </div>
        </div>

        {/* Translation Center */}
        <div className="glass-card rounded-2xl p-5 border-white/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Languages className="w-5 h-5 text-secondary" />
              <div>
                <h3 className="text-sm font-semibold text-white">Central de Tradução</h3>
                <p className="text-xs text-white/70">Tradução automática e pesquisa de palavras</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {autoTranslationEnabled && (
                <Badge variant="secondary" className="text-xs bg-green-600/20 text-green-400 border-green-600/30">
                  Ativa
                </Badge>
              )}
              <Button
                onClick={() => setIsTranslationDialogOpen(true)}
                variant="outline"
                size="sm"
                className="border-white/30 text-white hover:bg-white/10 hover:scale-105 transition-all duration-300"
              >
                <Settings className="w-4 h-4 mr-1" />
                Abrir
              </Button>
            </div>
          </div>

          {autoTranslationEnabled && (
            <div className="flex items-center space-x-2 text-xs text-white/70">
              <span>Traduzindo para:</span>
              <Badge variant="outline" className="border-white/30 text-white">
                <Globe2 className="w-3 h-3 mr-1" />
                {translationTargetLanguage === "pt-BR" ? "PT-BR" : 
                 translationTargetLanguage === "en-US" ? "EN-US" : "ES-ES"}
              </Badge>
            </div>
          )}
        </div>

        {/* Language Filter */}
        <div className="glass-card rounded-3xl shadow-large border-white/20 p-6 mt-6 hover-lift">
          <h3 className="text-lg font-bold text-white mb-4 drop-shadow-lg">🎯 Filtro de Idiomas</h3>
          <p className="text-white/80 text-sm mb-4">Escolha quais idiomas devem ser detectados automaticamente:</p>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-white font-medium">🇧🇷 Português (BR)</span>
              <Switch
                checked={enabledLanguages['pt-BR']}
                onCheckedChange={() => onToggleLanguage?.('pt-BR')}
                disabled={isRecording}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white font-medium">🇺🇸 English (US)</span>
              <Switch
                checked={enabledLanguages['en-US']}
                onCheckedChange={() => onToggleLanguage?.('en-US')}
                disabled={isRecording}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white font-medium">🇪🇸 Español (ES)</span>
              <Switch
                checked={enabledLanguages['es-ES']}
                onCheckedChange={() => onToggleLanguage?.('es-ES')}
                disabled={isRecording}
              />
            </div>
          </div>

          <div className="mt-4 p-3 bg-white/10 rounded-xl">
            <p className="text-white/70 text-xs">
              💡 <strong>Dica:</strong> Desative idiomas que você não usa para melhorar a precisão da detecção.
              {isRecording && " (Pare a gravação para alterar)"}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            data-testid="button-clear-transcript"
            onClick={onClearTranscript}
            variant="outline"
            className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20"
            disabled={isRecording}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Limpar Transcrição
          </Button>

        {onForceReanalysis && (
            <Button
              onClick={onForceReanalysis}
              variant="outline"
              className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20 disabled:opacity-50"
              disabled={isRecording || !transcript.trim()}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              {isRecording ? "Pare para Reanalisar" : 
               !transcript.trim() ? "Sem Texto para Analisar" : 
               "Reanalisar Idioma e Correção"}
            </Button>
          )}
        </div>
      </div>

      <TranslationDialog
        isOpen={isTranslationDialogOpen}
        onClose={() => setIsTranslationDialogOpen(false)}
        currentTranscript={transcript}
        autoTranslationEnabled={autoTranslationEnabled}
        translationTargetLanguage={translationTargetLanguage}
        onToggleAutoTranslation={onToggleAutoTranslation}
        onSetTranslationTarget={onSetTranslationTarget}
      />
    </div>
  );
}