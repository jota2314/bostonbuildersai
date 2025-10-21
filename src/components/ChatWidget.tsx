'use client';

import { MessageCircle, X, Send, Mic, Volume2, VolumeX } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { isToolUIPart, getToolName, DefaultChatTransport } from 'ai';
import QuickReplyButton from './QuickReplyButton';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [showNotification, setShowNotification] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
    // SDK 5: No maxSteps needed - server handles multi-step automatically
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-play voice responses
  useEffect(() => {
    if (!isVoiceEnabled || messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];

    // Only play voice for new assistant messages
    if (lastMessage.role === 'assistant' && status === 'ready') {
      // Extract text from message parts
      const text = lastMessage.parts
        ?.filter((part: { type: string; text?: string }) => part.type === 'text')
        .map((part: { type: string; text?: string }) => part.text)
        .join(' ');

      if (text && text.trim()) {
        playVoiceResponse(text);
      }
    }
  }, [messages, status, isVoiceEnabled]);

  const playVoiceResponse = async (text: string) => {
    try {
      setIsPlayingAudio(true);

      // Call TTS API
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('TTS API error');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      // Play the new audio
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlayingAudio(false);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setIsPlayingAudio(false);
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
    } catch (error) {
      console.error('Error playing voice response:', error);
      setIsPlayingAudio(false);
    }
  };

  // Show notification popup after delay (if not previously dismissed)
  useEffect(() => {
    const notificationDismissed = localStorage.getItem('chatNotificationDismissed');

    if (!notificationDismissed && !isOpen) {
      const timer = setTimeout(() => {
        setShowNotification(true);
      }, 3000); // Show after 3 seconds

      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleDismissNotification = () => {
    setShowNotification(false);
    localStorage.setItem('chatNotificationDismissed', 'true');
  };

  const handleOpenChat = () => {
    setIsOpen(true);
    setShowNotification(false);
  };

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = event.results[0][0].transcript;
          setInput(transcript);
          setIsRecording(false);
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error('Speech recognition error:', event.error);
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || status === 'submitted' || status === 'streaming') return;

    sendMessage({ text: input });
    setInput('');
  };

  const handleQuickReply = (message: string) => {
    if (status === 'submitted' || status === 'streaming') return;
    sendMessage({ text: message });
  };

  // Render message content including tool UI parts (SDK 5)
  const renderMessageContent = (message: typeof messages[0]) => {
    if (!message.parts || message.parts.length === 0) return null;

    return (
      <div className="space-y-2">
        {message.parts.map((part, idx: number) => {
          if (part.type === 'text') {
            return <div key={idx}>{part.text}</div>;
          }

          if (isToolUIPart(part)) {
            const name = getToolName(part);
            const isDone = part.state === 'output-available';
            return (
              <details key={`tool-${idx}`} className="bg-slate-800/50 rounded p-2">
                <summary className="cursor-pointer">
                  <span className="font-semibold">{name}</span>
                  <span className="ml-2 text-xs opacity-70">{isDone ? 'done' : 'calling...'}</span>
                </summary>
                {isDone ? (
                  <pre className="mt-2 text-xs whitespace-pre-wrap break-words">
                    {typeof part.output === 'string'
                      ? part.output
                      : JSON.stringify(part.output, null, 2)}
                  </pre>
                ) : null}
              </details>
            );
          }

          return null;
        })}
      </div>
    );
  };

  return (
    <>
      {!isOpen && (
        <>
          {/* Notification bubble */}
          {showNotification && (
            <div className="fixed bottom-24 right-6 bg-white text-gray-800 rounded-lg shadow-2xl p-4 max-w-xs z-50 animate-slideInRight border-2 border-primary">
              <button
                onClick={handleDismissNotification}
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <p className="font-semibold text-primary mb-1">👋 Have questions?</p>
              <p className="text-sm text-gray-600 mb-3">Let&apos;s chat! I can help you schedule a meeting with Jorge.</p>
              <button
                onClick={handleOpenChat}
                className="w-full bg-primary hover:bg-primary-dark text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
              >
                Start Chat
              </button>
            </div>
          )}

          {/* Chat button with pulse */}
          <button
            onClick={handleOpenChat}
            className={`fixed bottom-6 right-6 bg-primary hover:bg-primary-dark text-white rounded-full p-4 shadow-lg transition-all z-50 ${
              showNotification ? 'animate-pulse' : ''
            }`}
          >
            <MessageCircle className="w-6 h-6" />
          </button>
        </>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-slate-800 rounded-lg shadow-2xl flex flex-col z-50 border border-slate-700">
          <div className="bg-primary p-4 rounded-t-lg flex items-center justify-between">
            <div>
              <h3 className="text-white font-bold">Book a Call with Jorge</h3>
              <p className="text-white/80 text-xs">Usually responds in seconds</p>
            </div>
            <div className="flex items-center gap-2">
              {isPlayingAudio && (
                <span className="text-white text-xs animate-pulse">🔊 Speaking...</span>
              )}
              <button
                onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                className="text-white hover:bg-primary-dark rounded p-1 transition-colors"
                title={isVoiceEnabled ? 'Mute voice' : 'Enable voice'}
              >
                {isVoiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-primary-dark rounded p-1 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Initial welcome message with quick replies */}
            {messages.length === 0 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-lg p-4 bg-slate-700 text-slate-100">
                    <p className="mb-1">👋 Hey! I can help you schedule a meeting with Jorge or answer any questions about our services.</p>
                    <p className="text-sm text-slate-300 mt-2">How can I help you today?</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 pl-2 animate-slideIn">
                  <QuickReplyButton
                    text="Schedule a Meeting"
                    icon="📅"
                    onClick={() => handleQuickReply('I want to schedule a meeting with Jorge')}
                  />
                  <QuickReplyButton
                    text="Ask a Question"
                    icon="💬"
                    onClick={() => handleQuickReply('I have a question about your services')}
                  />
                  <QuickReplyButton
                    text="See Pricing"
                    icon="💰"
                    onClick={() => handleQuickReply('I want to know about pricing')}
                  />
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-white'
                      : 'bg-slate-700 text-slate-100'
                  }`}
                >
                  {renderMessageContent(message)}
                </div>
              </div>
            ))}
            {(status === 'submitted' || status === 'streaming') && (
              <div className="flex justify-start">
                <div className="bg-slate-700 text-slate-100 rounded-lg p-3">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            {error && (
              <div className="flex justify-start">
                <div className="bg-red-900/50 text-red-200 rounded-lg p-3">
                  Oops, I had a glitch. Mind trying that again?
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-slate-700">
            {isRecording && (
              <div className="mb-2 text-center">
                <span className="text-primary text-sm animate-pulse">🎤 Listening...</span>
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex space-x-2">
              <button
                type="button"
                onClick={toggleRecording}
                disabled={status === 'submitted' || status === 'streaming'}
                className={`${
                  isRecording
                    ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                    : 'bg-slate-700 hover:bg-slate-600'
                } text-white rounded-lg px-3 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                title={isRecording ? 'Stop recording' : 'Start voice input'}
              >
                <Mic className="w-5 h-5" />
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type or speak your message..."
                disabled={status === 'submitted' || status === 'streaming'}
                className="flex-1 bg-slate-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={status === 'submitted' || status === 'streaming'}
                className="bg-primary hover:bg-primary-dark text-white rounded-lg px-4 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
