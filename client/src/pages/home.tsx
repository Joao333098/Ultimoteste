import { useState } from "react";
import Header from "@/components/header";
import RecordingControls from "@/components/recording-controls";
import TranscriptionDisplay from "@/components/transcription-display";
import AiAnalysis from "@/components/ai-analysis";
import SidebarStats from "@/components/sidebar-stats";
import HistorySection from "@/components/history-section";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useQuery } from "@tanstack/react-query";

export default function Home() {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const {
    isRecording,
    transcript,
    detectedLanguage,
    confidence,
    audioLevel,
    recordingTime,
    wordCount,
    languageCount,
    startRecording,
    stopRecording,
    clearTranscript,
    switchLanguage,
    toggleEnhancedMode,
    currentLanguage,
    enhancedMode,
    detectedLanguages,
    autoTranslationEnabled,
    translationTargetLanguage,
    translatedTranscript,
    toggleAutoTranslation,
    setTranslationTarget,
    forceReanalysis,
    enabledLanguages,
    toggleLanguage
  } = useSpeechRecognition();

  const { data: sessions = [], refetch: refetchSessions } = useQuery({
    queryKey: ["/api/sessions"],
  });

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Control Panel */}
        <div className="glass-card rounded-3xl shadow-large p-8 mb-8 animate-fade-in hover-lift border-white/20">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Recording Controls */}
            <div className="lg:col-span-1">
              <RecordingControls
                isRecording={isRecording}
                recordingTime={recordingTime}
                audioLevel={audioLevel}
                detectedLanguage={detectedLanguage}
                confidence={confidence}
                currentLanguage={currentLanguage}
                enhancedMode={enhancedMode}
                transcript={transcript}
                onStartRecording={startRecording}
                onStopRecording={stopRecording}
                onClearTranscript={clearTranscript}
                onSwitchLanguage={switchLanguage}
                onToggleEnhancedMode={toggleEnhancedMode}
                autoTranslationEnabled={autoTranslationEnabled}
                translationTargetLanguage={translationTargetLanguage}
                onToggleAutoTranslation={toggleAutoTranslation}
                onSetTranslationTarget={setTranslationTarget}
                onForceReanalysis={forceReanalysis}
                enabledLanguages={enabledLanguages}
                onToggleLanguage={toggleLanguage}
              />
            </div>

            {/* Real-time Transcription */}
            <div className="lg:col-span-2">
              <TranscriptionDisplay
                transcript={transcript}
                isRecording={isRecording}
                currentSessionId={currentSessionId}
                translatedTranscript={translatedTranscript}
                autoTranslationEnabled={autoTranslationEnabled}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* AI Analysis Panel */}
          <div className="lg:col-span-2 space-y-6">
            <AiAnalysis
              transcript={transcript}
              currentSessionId={currentSessionId}
            />
          </div>

          {/* Sidebar Stats */}
          <div className="lg:col-span-1 space-y-6">
            <SidebarStats
              recordingTime={recordingTime}
              wordCount={wordCount}
              languageCount={languageCount}
              transcript={transcript}
            />
          </div>
        </div>

        {/* History Section */}
        <div className="mt-8">
          <HistorySection
            sessions={sessions}
            onRefetch={refetchSessions}
          />
        </div>
      </main>

      {/* Floating Action Button for Mobile */}
      <div className="fixed bottom-6 right-6 lg:hidden">
        <button
          data-testid="button-mobile-record"
          onClick={isRecording ? stopRecording : startRecording}
          className="w-16 h-16 bg-gradient-to-r from-primary to-secondary rounded-full shadow-lg flex items-center justify-center hover:shadow-xl hover:scale-110 transition-all duration-300"
        >
          <i className={`fas ${isRecording ? 'fa-stop' : 'fa-microphone'} text-white text-xl`}></i>
        </button>
      </div>
    </div>
  );
}