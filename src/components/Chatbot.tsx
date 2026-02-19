"use client";

import { useEffect, useRef } from 'react';
import '@n8n/chat/style.css';

interface ChatbotProps {
  webhookUrl: string;
}

export default function Chatbot({ webhookUrl }: ChatbotProps) {
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!webhookUrl || !chatRef.current) return;

    // Dynamically import and initialize the chat
    const initializeChat = async () => {
      const { createChat } = await import('@n8n/chat');
      
      createChat({
        webhookUrl: webhookUrl,
        mode: 'fullscreen',
        target: chatRef.current!,
        showWelcomeScreen: false,
        loadPreviousSession: true,
        initialMessages: [
          'Hola, soy el Asistente Virtual de Salvita. ¿En qué puedo ayudarte?',
        ],
        i18n: {
          en: {
            title: 'Asistente Salvita',
            subtitle: '',
            footer: '',
            getStarted: 'Comenzar conversación',
            inputPlaceholder: 'Escribe tu mensaje...',
          },
        },
        defaultLanguage: 'en',
      });
    };

    initializeChat();
  }, [webhookUrl]);

  if (!webhookUrl) return null;

  return (
    <div 
      ref={chatRef}
      className="w-full h-full"
      style={{ width: '100%', height: '100%' }}
    />
  );
}
