
import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { streamChatResponse, ApiMessage } from './services/geminiService';
import { Message, Sender } from './types';

// --- SVG Icons ---
const BotIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2a10 10 0 00-9.95 9.08 1.49 1.49 0 00.05.92 10 10 0 009.9 9.95.93.93 0 00.45 0 10 10 0 009.9-9.95.93.93 0 000-.45A10 10 0 0012 2zm0 18a8 8 0 01-8-8 8 8 0 018-8 8 8 0 018 8 8 8 0 01-8 8z"/><circle cx="8.5" cy="11.5" r="1.5"/><circle cx="15.5" cy="11.5" r="1.5"/><path d="M12 14.5a3.5 3.5 0 00-3.5 3.5.5.5 0 00.5.5h6a.5.5 0 00.5-.5 3.5 3.5 0 00-3.5-3.5z"/>
  </svg>
);

const UserIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </svg>
);

const SendIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3.4 20.4l17.45-7.48a1 1 0 000-1.84L3.4 3.6a1 1 0 00-1.39 1.14l2.1 7.26-2.1 7.26a1 1 0 001.39 1.14z" />
  </svg>
);

const HeaderIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 3H5c-1.1 0-1.99.9-1.99 2L3 19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 11h-4v4h-4v-4H6v-4h4V6h4v4h4v4z" />
    </svg>
);

const AlertIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
  </svg>
);

const CloseIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
  </svg>
);

// --- Helper Components ---

const SimpleMarkdown: React.FC<{ text: string }> = ({ text }) => {
  const elements = text.split('\n').map((line, i) => {
    if (line.trim() === '') return <div key={i} className="h-4" />;
    
    if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
      const content = line.trim().substring(2);
      const segments = content.split(/(\*\*.*?\*\*)/g).filter(Boolean);
      return (
        <div key={i} className="flex items-start">
          <span className="mr-2 mt-1">&bull;</span>
          <p>
             {segments.map((segment, segIndex) => 
               segment.startsWith('**') && segment.endsWith('**') ? 
               <strong key={segIndex}>{segment.slice(2, -2)}</strong> : 
               <span key={segIndex}>{segment}</span>
             )}
          </p>
        </div>
      );
    }
    
    const segments = line.split(/(\*\*.*?\*\*)/g).filter(Boolean);
    return (
      <p key={i}>
        {segments.map((segment, segIndex) => 
          segment.startsWith('**') && segment.endsWith('**') ? 
          <strong key={segIndex}>{segment.slice(2, -2)}</strong> : 
          <span key={segIndex}>{segment}</span>
        )}
      </p>
    );
  });
  
  return <div className="space-y-1">{elements}</div>;
};

const ChatMessage: React.FC<{ message: Message }> = ({ message }) => {
  const isUser = message.sender === Sender.User;

  if (!isUser && message.text === '') {
    return (
      <div className="flex items-start gap-3 my-4 justify-start" aria-label="AI is typing">
        <BotIcon className="w-8 h-8 text-gray-400 dark:text-gray-500 flex-shrink-0" />
        <div className="px-5 py-4 rounded-2xl shadow-md bg-white dark:bg-gray-800 rounded-bl-none">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-start gap-3 my-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && <BotIcon className="w-8 h-8 text-cyan-500 flex-shrink-0" />}
      <div className={`max-w-md lg:max-w-2xl px-5 py-3 rounded-2xl shadow-md ${isUser ? 'bg-cyan-500 text-white rounded-br-none' : 'bg-white dark:bg-gray-800 dark:text-gray-200 rounded-bl-none'}`}>
        <SimpleMarkdown text={message.text} />
      </div>
       {isUser && <UserIcon className="w-8 h-8 text-gray-500 dark:text-gray-400 flex-shrink-0" />}
    </div>
  );
};

const SuggestionChip: React.FC<{ text: string; onClick: () => void }> = ({ text, onClick }) => (
    <button
        onClick={onClick}
        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-300 rounded-full hover:bg-cyan-100 dark:hover:bg-cyan-800 transition-colors"
    >
        {text}
    </button>
);


// --- Main App Component ---

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasStarted = useRef(false);

  const handleSendMessage = useCallback(async (e?: FormEvent, messageText?: string) => {
    e?.preventDefault();
    const currentInput = messageText || input;
    
    if (!currentInput.trim() || isLoading) return;

    const apiHistory: ApiMessage[] = [
      ...messages.map(msg => ({
        role: msg.sender === Sender.User ? 'user' as const : 'assistant' as const,
        content: msg.text,
      })),
      { role: 'user' as const, content: currentInput },
    ];

    if (!messageText) {
      const userMessage: Message = { id: Date.now().toString(), text: currentInput, sender: Sender.User };
      setMessages(prev => [...prev, userMessage]);
    }
    
    setInput('');
    setIsLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const aiMessageId = (Date.now() + 1).toString();
    try {
      setMessages(prev => [...prev.filter(m => m.id !== aiMessageId), { id: aiMessageId, text: '', sender: Sender.AI }]);

      const stream = streamChatResponse(apiHistory);
      
      let text = '';
      for await (const chunk of stream) {
        text += chunk;
        setMessages(prev => prev.map(m => m.id === aiMessageId ? { ...m, text } : m));
      }
    } catch (error) {
      console.error("Error sending message:", error);
      let errorMessageText = "Sorry, I encountered an error. Please try again.";
      if (error instanceof Error) {
        errorMessageText = error.message;
      }

      if (errorMessageText.includes('401') || errorMessageText.toLowerCase().includes('api key')) {
        errorMessageText = "Authentication Error: The configured API Key is invalid or expired.";
      }

      const errorMessage: Message = { 
        id: aiMessageId, 
        text: errorMessageText, 
        sender: Sender.AI 
      };
       setMessages(prev => prev.map(m => m.id === aiMessageId ? errorMessage : m));
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages]);

  const startConversation = useCallback(async () => {
      if (hasStarted.current || messages.length > 0) return;
      hasStarted.current = true;
      setIsLoading(true);
      // Start conversation with a generic greeting to trigger the system prompt behavior (intro + disclaimer)
      await handleSendMessage(undefined, "Hello");
      setIsLoading(false);
  }, [messages.length, handleSendMessage]);
  
  useEffect(() => {
    startConversation();
  }, [startConversation]);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSuggestionClick = (suggestion: string) => {
      setInput(suggestion);
      textareaRef.current?.focus();
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        const scrollHeight = textareaRef.current.scrollHeight;
        textareaRef.current.style.height = `${scrollHeight}px`;
      }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSendMessage();
      }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950 font-sans">
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm border-b dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto">
            <div className="flex flex-row items-center justify-center gap-3 p-3">
                <div className="flex items-center gap-3">
                    <HeaderIcon className="w-7 h-7 text-cyan-500" />
                    <div>
                        <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                            AI Disease Awareness
                        </h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Public Health ChatBot</p>
                    </div>
                </div>
            </div>
            
            {showDisclaimer && (
                <div className="bg-amber-50 dark:bg-amber-950/50 border-t border-b border-amber-200 dark:border-amber-800 px-4 py-3 flex items-start gap-3 relative animate-in fade-in slide-in-from-top-2 duration-300">
                    <AlertIcon className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                    <div className="flex-1 text-sm text-amber-800 dark:text-amber-200 pr-6">
                        <p className="font-semibold mb-1">Important Medical Disclaimer</p>
                        <p className="opacity-90">
                            I am an AI assistant, not a doctor. The information I provide is for educational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment. Always consult with a qualified healthcare provider for any medical concerns.
                        </p>
                    </div>
                    <button 
                        onClick={() => setShowDisclaimer(false)}
                        className="absolute top-3 right-3 p-1 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-full transition-colors"
                        aria-label="Dismiss disclaimer"
                    >
                        <CloseIcon className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm p-4 border-t dark:border-gray-800 sticky bottom-0">
        <div className="max-w-4xl mx-auto">
          {messages.length <= 2 && !isLoading && (
              <div className="flex flex-wrap items-center justify-center gap-2 mb-3 px-2">
                  <SuggestionChip text="What is Diabetes?" onClick={() => handleSuggestionClick("What is Diabetes?")} />
                  <SuggestionChip text="Symptoms of the flu" onClick={() => handleSuggestionClick("What are the common symptoms of the flu?")} />
                  <SuggestionChip text="How to prevent heart disease?" onClick={() => handleSuggestionClick("How to prevent heart disease?")} />
              </div>
          )}
          <form onSubmit={handleSendMessage} className="flex items-end gap-3">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask about symptoms, prevention, etc..."
              className="flex-1 p-3 border rounded-2xl focus:ring-2 focus:ring-cyan-500 focus:outline-none bg-gray-100 dark:bg-gray-800 dark:text-white dark:border-gray-700 resize-none max-h-40"
              rows={1}
              disabled={isLoading}
              aria-label="Chat input"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="p-3 bg-cyan-500 text-white rounded-full disabled:bg-cyan-300 disabled:cursor-not-allowed hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 dark:ring-offset-gray-900 transition-colors flex-shrink-0"
              aria-label="Send message"
            >
              <SendIcon className="w-6 h-6" />
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
}
