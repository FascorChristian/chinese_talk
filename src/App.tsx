import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  TutorState, 
  ChatMessage, 
  Scenario, 
  SuggestedReply,
  AppMode
} from './types';
import { SCENARIOS } from './data/scenarios';
import { Header } from './components/Header';
import { MainMenu } from './components/MainMenu';
import { ReadingMode } from './components/ReadingMode';
import { ShadowingMode } from './components/ShadowingMode';
import { AvatarVisualizer } from './components/AvatarVisualizer';
import { ChatMessageBubble } from './components/ChatMessageBubble';
import { InteractionBar } from './components/InteractionBar';
import { HintsModal } from './components/HintsModal';
import { ScenarioModal } from './components/ScenarioModal';
import { 
  playMandarinTTS, 
  stopMandarinTTS, 
  initVoices, 
  isSpeechRecognitionSupported, 
  AudioMeter 
} from './utils/speechUtils';
import { Sparkles, MessageCircle, HelpCircle } from 'lucide-react';

export default function App() {
  // App navigation mode: 'menu' | 'conversation' | 'reading' | 'shadowing'
  const [currentMode, setCurrentMode] = useState<AppMode>('menu');

  // Scenario state
  const [currentScenario, setCurrentScenario] = useState<Scenario>(SCENARIOS[0]);
  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState(false);

  // Display Settings
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [showPinyin, setShowPinyin] = useState<boolean>(true);
  const [showTranslation, setShowTranslation] = useState<boolean>(true);

  // Chat & Conversation state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [tutorState, setTutorState] = useState<TutorState>('idle');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [currentlyPlayingText, setCurrentlyPlayingText] = useState<string | null>(null);

  // Hints Modal state
  const [isHintsModalOpen, setIsHintsModalOpen] = useState(false);
  const [currentHints, setCurrentHints] = useState<SuggestedReply[]>([]);

  // Speech Recognition state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const recognizedTranscriptRef = useRef<string>('');
  const audioMeterRef = useRef<AudioMeter | null>(null);
  const timerIntervalRef = useRef<any>(null);

  // DOM refs
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const cancelTtsRef = useRef<(() => void) | null>(null);

  // Preload speech synthesis voices on mount
  useEffect(() => {
    initVoices();
  }, []);

  // Initialize conversation when scenario changes
  const initScenario = useCallback((scenario: Scenario, shouldSpeak = true) => {
    stopMandarinTTS();
    const initialMsg: ChatMessage = {
      id: `initial-${Date.now()}`,
      sender: 'assistant',
      hanzi: scenario.initialMessage.hanzi,
      translation: scenario.initialMessage.translation,
      suggestedReplies: scenario.initialMessage.suggestedReplies,
      timestamp: Date.now(),
    };

    setMessages([initialMsg]);
    setCurrentHints(scenario.initialMessage.suggestedReplies);
    setTutorState('idle');

    if (shouldSpeak) {
      setTimeout(() => {
        handlePlayAudio(initialMsg.hanzi);
      }, 400);
    }
  }, [speechRate]);

  useEffect(() => {
    if (currentMode === 'conversation') {
      initScenario(currentScenario, true);
    }
    return () => {
      stopMandarinTTS();
    };
  }, [currentScenario.id, currentMode]);

  // Auto scroll to bottom in chat
  useEffect(() => {
    if (currentMode === 'conversation') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, tutorState, currentMode]);

  // Audio playback handler
  const handlePlayAudio = (text: string) => {
    if (cancelTtsRef.current) {
      cancelTtsRef.current();
    }

    setCurrentlyPlayingText(text);
    setTutorState('speaking');

    cancelTtsRef.current = playMandarinTTS(
      text,
      speechRate,
      () => {
        setTutorState('speaking');
      },
      () => {
        setTutorState('idle');
        setCurrentlyPlayingText(null);
      },
      (err) => {
        console.warn('TTS playback error:', err);
        setTutorState('idle');
        setCurrentlyPlayingText(null);
      }
    );
  };

  // Switch scenario
  const handleSelectScenario = (scenario: Scenario) => {
    setCurrentScenario(scenario);
  };

  // Reset conversation
  const handleResetChat = () => {
    initScenario(currentScenario, true);
  };

  // Switch mode handler
  const handleSelectMode = (mode: AppMode) => {
    stopMandarinTTS();
    setCurrentMode(mode);
    if (mode === 'conversation') {
      initScenario(currentScenario, true);
    }
  };

  const handleGoToMenu = () => {
    stopMandarinTTS();
    setCurrentMode('menu');
  };

  // Send message to server backend (Gemini API or intelligent fallback)
  const handleSendMessage = async (userText: string) => {
    if (!userText.trim()) return;

    stopMandarinTTS();
    setSpeechError(null);

    const userMessageId = `user-${Date.now()}`;
    const userMessage: ChatMessage = {
      id: userMessageId,
      sender: 'user',
      hanzi: userText,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setTutorState('thinking');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          scenario: currentScenario.id,
          history: messages.slice(-6).map((m) => ({
            sender: m.sender,
            hanzi: m.hanzi,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Update user message with feedback if returned
      if (data.user_correction || data.native_alternative) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === userMessageId
              ? {
                  ...msg,
                  userCorrection: data.user_correction,
                  nativeAlternative: data.native_alternative,
                }
              : msg
          )
        );
      }

      // Add Assistant Message
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        hanzi: data.reply_hanzi,
        translation: data.reply_translation,
        suggestedReplies: data.suggested_replies || [],
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (data.suggested_replies && data.suggested_replies.length > 0) {
        setCurrentHints(data.suggested_replies);
      }

      // Automatically speak AI reply
      handlePlayAudio(data.reply_hanzi);
    } catch (err: any) {
      console.error('Error in conversation turn:', err);
      setTutorState('idle');
      setSpeechError('No se pudo conectar con el tutor. Inténtalo de nuevo.');
    }
  };

  // Start Push-To-Talk Voice Recording
  const startRecording = async () => {
    stopMandarinTTS();
    setSpeechError(null);
    recognizedTranscriptRef.current = '';
    setRecordingSeconds(0);

    // 1. Start audio meter for live pulsing sphere
    try {
      audioMeterRef.current = new AudioMeter((volume) => {
        setAudioLevel(volume);
      });
      await audioMeterRef.current.start();
    } catch (err) {
      console.warn('Microphone stream error:', err);
    }

    // 2. Start Speech Recognition
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.lang = 'zh-CN';
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognition.continuous = false;

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            currentTranscript += event.results[i][0].transcript;
          }
          recognizedTranscriptRef.current = currentTranscript;
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition error:', event.error);
          if (event.error === 'not-allowed') {
            setSpeechError('Permiso de micrófono denegado. Puedes usar el teclado para escribir en chino.');
          } else if (event.error !== 'no-speech') {
            setSpeechError(`Aviso de voz: ${event.error}`);
          }
        };

        recognition.start();
      } catch (err) {
        console.warn('SpeechRecognition initialization error:', err);
      }
    } else {
      setSpeechError('Tu navegador no soporta Speech Recognition en zh-CN nativo. Puedes usar el teclado o las pistas.');
    }

    setIsRecording(true);
    setTutorState('listening');

    timerIntervalRef.current = setInterval(() => {
      setRecordingSeconds((sec) => sec + 1);
    }, 1000);
  };

  // Stop Push-To-Talk Voice Recording and Submit
  const stopRecording = () => {
    if (!isRecording) return;

    setIsRecording(false);
    clearInterval(timerIntervalRef.current);

    if (audioMeterRef.current) {
      audioMeterRef.current.stop();
      audioMeterRef.current = null;
    }
    setAudioLevel(0);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    setTimeout(() => {
      const transcript = recognizedTranscriptRef.current.trim();
      if (transcript) {
        handleSendMessage(transcript);
      } else {
        setTutorState('idle');
        setSpeechError('No se detectó audio en chino. Mantén presionado y habla con claridad o usa el teclado.');
      }
    }, 300);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* 1. Header with Mode Navigation & Controls */}
      <Header
        currentScenario={currentScenario}
        onSelectScenario={() => setIsScenarioModalOpen(true)}
        speechRate={speechRate}
        onChangeSpeed={(speed) => setSpeechRate(speed)}
        showPinyin={showPinyin}
        onTogglePinyin={() => setShowPinyin(!showPinyin)}
        showTranslation={showTranslation}
        onToggleTranslation={() => setShowTranslation(!showTranslation)}
        onResetChat={handleResetChat}
        currentMode={currentMode}
        onGoToMenu={handleGoToMenu}
      />

      {/* 2. Mode Content Rendering */}
      {currentMode === 'menu' && (
        <MainMenu onSelectMode={handleSelectMode} />
      )}

      {currentMode === 'reading' && (
        <ReadingMode onBackToMenu={handleGoToMenu} />
      )}

      {currentMode === 'shadowing' && (
        <ShadowingMode onBackToMenu={handleGoToMenu} />
      )}

      {currentMode === 'conversation' && (
        <>
          {/* Main Body: Avatar Visualizer & Conversation Flow */}
          <main className="flex-1 flex flex-col max-w-4xl w-full mx-auto px-3 sm:px-6 pt-3 pb-6">
            
            {/* Central Dynamic Avatar & Sound Visualizer */}
            <div className="py-2 border-b border-slate-800/60 bg-gradient-to-b from-slate-900/30 to-transparent rounded-2xl mb-4">
              <AvatarVisualizer
                state={tutorState}
                audioLevel={audioLevel}
                onClickAvatar={() => {
                  if (messages.length > 0) {
                    const lastAi = [...messages].reverse().find((m) => m.sender === 'assistant');
                    if (lastAi) handlePlayAudio(lastAi.hanzi);
                  }
                }}
                scenarioTitle={currentScenario.title}
              />
            </div>

            {/* Conversation History Area */}
            <div className="flex-1 overflow-y-auto space-y-4 px-1 pb-4">
              
              <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>
                    <strong>Práctica Oral:</strong> Mantén presionado el botón central para hablar en chino. Li Ming te escuchará y te dará correcciones y pronunciación nativa.
                  </span>
                </div>
                <button
                  onClick={() => setIsHintsModalOpen(true)}
                  className="text-xs font-semibold text-amber-400 hover:text-amber-300 underline whitespace-nowrap cursor-pointer"
                >
                  Ver pistas
                </button>
              </div>

              {messages.map((msg) => (
                <ChatMessageBubble
                  key={msg.id}
                  message={msg}
                  showPinyin={showPinyin}
                  showTranslation={showTranslation}
                  onPlayAudio={handlePlayAudio}
                  isCurrentlyPlaying={currentlyPlayingText === msg.hanzi}
                />
              ))}

              {tutorState === 'thinking' && (
                <div className="flex items-center gap-3 mr-auto mb-4 animate-fadeIn">
                  <div className="w-8 h-8 rounded-lg bg-rose-600/30 border border-rose-500/30 flex items-center justify-center text-xs text-rose-300 font-bold">
                    李
                  </div>
                  <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-slate-900 border border-slate-800 flex items-center gap-2 text-xs text-amber-300">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    <span>Li Ming está evaluando tu respuesta y preparando su turno...</span>
                  </div>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

          </main>

          {/* Bottom Interaction Bar */}
          <InteractionBar
            isRecording={isRecording}
            isProcessing={tutorState === 'thinking'}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            onOpenHints={() => setIsHintsModalOpen(true)}
            onSendMessage={handleSendMessage}
            hasSpeechRecognition={isSpeechRecognitionSupported()}
            recordingSeconds={recordingSeconds}
            speechError={speechError}
          />

          {/* Hints Modal */}
          <HintsModal
            isOpen={isHintsModalOpen}
            onClose={() => setIsHintsModalOpen(false)}
            hints={currentHints}
            onSelectHint={(text) => handleSendMessage(text)}
            onPlayAudio={handlePlayAudio}
            showPinyin={showPinyin}
          />

          {/* Scenario Selector Modal */}
          <ScenarioModal
            isOpen={isScenarioModalOpen}
            onClose={() => setIsScenarioModalOpen(false)}
            scenarios={SCENARIOS}
            selectedScenarioId={currentScenario.id}
            onSelectScenario={handleSelectScenario}
          />
        </>
      )}

    </div>
  );
}

