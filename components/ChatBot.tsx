import React, { useState, useRef, useEffect } from 'react';
import { sendMessageToGemini } from '../services/geminiService';
import { ChatMessage } from '../types';

const ChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: '¡Hola! Soy tu asistente virtual de BeautyManager. ¿En qué puedo ayudarte hoy?',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const toggleChat = () => setIsOpen(!isOpen);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const responseText = await sendMessageToGemini(inputValue);
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 w-80 md:w-96 bg-card-light dark:bg-card-dark rounded-2xl shadow-2xl border border-border-light dark:border-border-dark overflow-hidden flex flex-col h-[500px] animate-in slide-in-from-bottom-5 fade-in duration-200">
          {/* Header */}
          <div className="bg-primary p-4 flex justify-between items-center text-white">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined">smart_toy</span>
              <span className="font-bold">Asistente IA</span>
            </div>
            <button onClick={toggleChat} className="hover:bg-white/20 rounded-full p-1 transition-colors">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-background-light dark:bg-background-dark/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                  msg.role === 'user'
                    ? 'bg-primary text-white self-end rounded-tr-none'
                    : 'bg-white dark:bg-card-dark border border-border-light dark:border-border-dark text-text-main-light dark:text-text-main-dark self-start rounded-tl-none shadow-sm'
                }`}
              >
                {msg.text}
              </div>
            ))}
            {isLoading && (
              <div className="bg-white dark:bg-card-dark border border-border-light dark:border-border-dark self-start rounded-2xl rounded-tl-none p-3 shadow-sm flex gap-1">
                <span className="w-2 h-2 bg-text-sec-light rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-text-sec-light rounded-full animate-bounce [animation-delay:-.3s]"></span>
                <span className="w-2 h-2 bg-text-sec-light rounded-full animate-bounce [animation-delay:-.5s]"></span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-card-light dark:bg-card-dark border-t border-border-light dark:border-border-dark">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Escribe tu mensaje..."
                className="flex-1 bg-background-light dark:bg-background-dark rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-text-main-light dark:text-text-main-dark placeholder:text-text-sec-light"
              />
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="bg-primary text-white p-2 rounded-full hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[20px]">send</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={toggleChat}
        className="group flex items-center justify-center w-14 h-14 bg-primary text-white rounded-full shadow-lg hover:bg-primary/90 hover:scale-105 transition-all duration-200"
      >
        <span className={`material-symbols-outlined text-3xl transition-transform duration-200 ${isOpen ? 'rotate-90 scale-0 absolute' : 'scale-100'}`}>
          smart_toy
        </span>
        <span className={`material-symbols-outlined text-3xl transition-transform duration-200 ${isOpen ? 'scale-100' : '-rotate-90 scale-0 absolute'}`}>
          close
        </span>
      </button>
    </div>
  );
};

export default ChatBot;