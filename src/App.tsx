import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  TutorState, 
  ChatMessage, 
  Scenario, 
  SuggestedReply,
  AppMode,
  DialogueObjective
} from './types/index.js';
import { SCENARIOS } from './data/scenarios.js';
import { Header } from './components/layout/Header.js';
import { MainMenuView } from './components/views/MainMenuView.js';
import { ReadingView } from './components/views/ReadingView.js';
import { ShadowingView } from './components/views/ShadowingView.js';
import { AvatarVisualizer } from './components/conversation/AvatarVisualizer.js';
import { ChatMessageBubble } from './components/conversation/ChatMessageBubble.js';
import { InteractionBar } from './components/conversation/InteractionBar.js';
import { DialogueObjectivesHUD } from './components/conversation/DialogueObjectivesHUD.js';
import { DialogueCompletionModal } from './components/modals/DialogueCompletionModal.js';
import { HintsModal } from './components/modals/HintsModal.js';
import { CustomScenarioModal } from './components/modals/CustomScenarioModal.js';
import { useSpeechSynthesis } from './hooks/useSpeechSynthesis.js';
import { useSpeechRecognition } from './hooks/useSpeechRecognition.js';
import { useAudioMeter } from './hooks/useAudioMeter.js';
import { sendMessageToTutor } from './services/api.js';
import { initVoices, isSpeechRecognitionSupported } from './utils/speechUtils.js';
import { Sparkles } from 'lucide-react';

export default function App() {
  // Navigation mode
  const [currentMode, setCurrentMode] = useState<AppMode>('menu');

  // Scenario state (free custom generation or default initial)
  const [currentScenario, setCurrentScenario] = useState<Scenario>(SCENARIOS[0]);
  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState(false);

  // Display Settings
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [showPinyin, setShowPinyin] = useState<boolean>(true);
  const [showTranslation, setShowTranslation] = useState<boolean>(true);

  // Conversation state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [tutorState, setTutorState] = useState<TutorState>('idle');

  // Hints Modal state
  const [isHintsModalOpen, setIsHintsModalOpen] = useState(false);
  const [currentHints, setCurrentHints] = useState<SuggestedReply[]>([]);

  // Dialogue Objectives & Timer State
  const [objectives, setObjectives] = useState<DialogueObjective[]>(
    (SCENARIOS[0].objectives || []).map((o) => ({ ...o, completed: false }))
  );
  const totalTimeSeconds = currentScenario.timeLimitSeconds || 240;
  const [timeRemaining, setTimeRemaining] = useState<number>(totalTimeSeconds);
  const [isTimeUp, setIsTimeUp] = useState<boolean>(false);
  const [isDialogueFinished, setIsDialogueFinished] = useState<boolean>(false);
  const [finalFeedback, setFinalFeedback] = useState<string | null>(null);
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState<boolean>(false);

  // Live Countdown Timer
  useEffect(() => {
    if (currentMode !== 'conversation' || isDialogueFinished || isTimeUp) {
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsTimeUp(true);
          setIsCompletionModalOpen(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentMode, isDialogueFinished, isTimeUp]);

  // DOM ref for auto-scroll
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const activeAbortRef = useRef<AbortController | null>(null);

  // Speech Hooks
  const { isPlaying, currentText, speak, stop: stopAudio } = useSpeechSynthesis({ speechRate });
  const { audioLevel, start: startAudioMeter, stop: stopAudioMeter } = useAudioMeter();

  // Preload speech synthesis voices on mount
  useEffect(() => {
    initVoices();
  }, []);

  // Sync tutor speaking state with synthesis hook
  useEffect(() => {
    if (isPlaying) {
      setTutorState('speaking');
    } else if (tutorState === 'speaking') {
      setTutorState('idle');
    }
  }, [isPlaying]);

  // Handle playing audio
  const handlePlayAudio = useCallback((text: string) => {
    speak(text, speechRate);
  }, [speak, speechRate]);

  // Send message to server backend (Gemini API with custom prompt context)
  const handleSendMessage = useCallback(async (userText: string) => {
    if (!userText.trim()) return;

    stopAudio();
    if (activeAbortRef.current) {
      activeAbortRef.current.abort();
    }
    const abortController = new AbortController();
    activeAbortRef.current = abortController;

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
      // Send full role prompt and situation context to Gemini
      const scenarioContext = currentScenario.rolePrompt 
        ? `${currentScenario.title}: ${currentScenario.rolePrompt} - ${currentScenario.description}`
        : currentScenario.id;

      const data = await sendMessageToTutor(
        userText,
        scenarioContext,
        messages.slice(-6).map((m) => ({ sender: m.sender, hanzi: m.hanzi })),
        objectives,
        abortController.signal
      );

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

      // Update completed objectives checklist
      if (Array.isArray(data.completed_objective_ids) && data.completed_objective_ids.length > 0) {
        setObjectives((prev) =>
          prev.map((obj) =>
            data.completed_objective_ids!.includes(obj.id)
              ? { ...obj, completed: true }
              : obj
          )
        );
      }

      // Handle dialogue finish trigger
      if (data.is_dialogue_finished) {
        setIsDialogueFinished(true);
        if (data.final_feedback) {
          setFinalFeedback(data.final_feedback);
        }
        setTimeout(() => {
          setIsCompletionModalOpen(true);
        }, 3000);
      }

      // Automatically speak AI reply
      handlePlayAudio(data.reply_hanzi);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error in conversation turn:', err);
        setTutorState('idle');
      }
    }
  }, [currentScenario, handlePlayAudio, messages, objectives, stopAudio]);

  // Speech Recognition Hook (Continuous mode with 100% manual user control)
  const {
    isRecording,
    recordingSeconds,
    error: speechError,
    startRecording: startVoiceRecording,
    stopRecording: stopVoiceRecording,
  } = useSpeechRecognition({
    lang: 'zh-CN',
    onTranscriptFinalized: (transcript) => {
      stopAudioMeter();
      if (transcript) {
        handleSendMessage(transcript);
      } else {
        setTutorState('idle');
      }
    },
    onError: () => {
      stopAudioMeter();
      setTutorState('idle');
    }
  });

  // Start 1-Click / Push-To-Talk Voice Recording
  const startRecording = async () => {
    stopAudio();
    setTutorState('listening');
    await startAudioMeter();
    startVoiceRecording();
  };

  // Stop Voice Recording and Submit
  const stopRecording = () => {
    stopAudioMeter();
    stopVoiceRecording();
  };

  // Initialize conversation with given scenario
  const initScenario = useCallback((scenario: Scenario, shouldSpeak = true) => {
    stopAudio();
    if (activeAbortRef.current) {
      activeAbortRef.current.abort();
    }

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

    // Reset objectives, timer & completion flags
    const defaultObjs = (scenario.objectives && scenario.objectives.length > 0)
      ? scenario.objectives
      : [
          { id: 'obj_1', description: 'Saludar e iniciar el diálogo comunicando tu intención', completed: false },
          { id: 'obj_2', description: 'Consultar detalles, opciones o precio', completed: false },
          { id: 'obj_3', description: 'Confirmar el acuerdo y despedirse cordialmente', completed: false },
        ];
    setObjectives(defaultObjs.map((o) => ({ ...o, completed: false })));
    setTimeRemaining(scenario.timeLimitSeconds || 240);
    setIsTimeUp(false);
    setIsDialogueFinished(false);
    setFinalFeedback(null);
    setIsCompletionModalOpen(false);

    if (shouldSpeak) {
      setTimeout(() => {
        handlePlayAudio(initialMsg.hanzi);
      }, 400);
    }
  }, [handlePlayAudio, stopAudio]);

  // Auto scroll to bottom in chat
  useEffect(() => {
    if (currentMode === 'conversation') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, tutorState, currentMode]);

  // Handle custom scenario generated by IA prompt
  const handleScenarioGenerated = (newScenario: Scenario) => {
    setCurrentScenario(newScenario);
    setCurrentMode('conversation');
    initScenario(newScenario, true);
  };

  // Reset conversation
  const handleResetChat = () => {
    initScenario(currentScenario, true);
  };

  // Switch mode handler: when selecting conversation, open custom scenario generation modal
  const handleSelectMode = (mode: AppMode) => {
    stopAudio();
    stopAudioMeter();
    if (mode === 'conversation') {
      setIsScenarioModalOpen(true);
    } else {
      setCurrentMode(mode);
    }
  };

  const handleGoToMenu = () => {
    stopAudio();
    stopAudioMeter();
    setCurrentMode('menu');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* 1. Header with Mode Navigation & Global Controls */}
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

      {/* 2. Mode Content Views */}
      {currentMode === 'menu' && (
        <MainMenuView onSelectMode={handleSelectMode} />
      )}

      {currentMode === 'reading' && (
        <ReadingView onBackToMenu={handleGoToMenu} />
      )}

      {currentMode === 'shadowing' && (
        <ShadowingView onBackToMenu={handleGoToMenu} />
      )}

      {currentMode === 'conversation' && (
        <>
          {/* Main Body: Avatar Visualizer & Conversation Flow */}
          <main className="flex-1 flex flex-col max-w-4xl w-full mx-auto px-3 sm:px-6 pt-3 pb-6">
            
            {/* Central Dynamic Avatar & Sound Visualizer */}
            <div className="py-2 border-b border-slate-800/60 bg-gradient-to-b from-slate-900/30 to-transparent rounded-2xl mb-3">
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

            {/* Live Mission Control: Objectives, Timer & Dialogue Structure */}
            <DialogueObjectivesHUD
              objectives={objectives}
              dialogueStructure={currentScenario.dialogueStructure}
              timeRemainingSeconds={timeRemaining}
              totalTimeSeconds={currentScenario.timeLimitSeconds || 240}
              isCompleted={isDialogueFinished}
            />

            {/* Conversation History Area */}
            <div className="flex-1 overflow-y-auto space-y-4 px-1 pb-4">
              <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>
                    <strong>Modo 1-Clic:</strong> Haz clic para hablar a tu propio ritmo sin cortes automáticos. Haz clic de nuevo para enviar. Lee las pistas abajo mientras hablas.
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsScenarioModalOpen(true)}
                    className="text-xs font-semibold text-rose-400 hover:text-rose-300 underline whitespace-nowrap cursor-pointer"
                  >
                    Nueva situación IA
                  </button>
                </div>
              </div>

              {messages.map((msg) => (
                <ChatMessageBubble
                  key={msg.id}
                  message={msg}
                  showPinyin={showPinyin}
                  showTranslation={showTranslation}
                  onPlayAudio={handlePlayAudio}
                  isCurrentlyPlaying={currentText === msg.hanzi}
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

          {/* Bottom Interaction Bar with Integrated Contextual Hints */}
          <InteractionBar
            isRecording={isRecording}
            isProcessing={tutorState === 'thinking'}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            onSendMessage={handleSendMessage}
            hasSpeechRecognition={isSpeechRecognitionSupported()}
            recordingSeconds={recordingSeconds}
            speechError={speechError}
            hints={currentHints}
            onPlayAudio={handlePlayAudio}
            showPinyin={showPinyin}
          />
        </>
      )}

      {/* Free Hypothetical Scenario Generator Modal (Accessible from Menu, Header, and Chat) */}
      <CustomScenarioModal
        isOpen={isScenarioModalOpen}
        onClose={() => setIsScenarioModalOpen(false)}
        currentScenario={currentScenario}
        onScenarioGenerated={handleScenarioGenerated}
        onUseDefaultScenario={() => {
          setIsScenarioModalOpen(false);
          setCurrentMode('conversation');
          initScenario(currentScenario, true);
        }}
      />

      {/* Dialogue Completion & Summary Modal (Mission Accomplished or Time Expired) */}
      <DialogueCompletionModal
        isOpen={isCompletionModalOpen}
        onClose={() => setIsCompletionModalOpen(false)}
        isAllCompleted={isDialogueFinished || (objectives.length > 0 && objectives.every((o) => o.completed))}
        isTimeUp={isTimeUp}
        objectives={objectives}
        elapsedSeconds={Math.max(0, (currentScenario.timeLimitSeconds || 240) - timeRemaining)}
        finalFeedback={finalFeedback}
        onRestart={() => initScenario(currentScenario, true)}
        onNewScenario={() => {
          setIsCompletionModalOpen(false);
          setIsScenarioModalOpen(true);
        }}
        onGoToMenu={handleGoToMenu}
      />
    </div>
  );
}
