"use client";

import { useEffect, useRef } from 'react';

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
        mode: 'fullscreen',
        webhookUrl: webhookUrl,
        target: chatRef.current!,
        initialMessages: [
          'Hola! 👋',
          'Soy el asistente virtual de Salvita. ¿En qué puedo ayudarte?',
        ],
        i18n: {
          es: {
            title: 'Asistente Salvita',
            subtitle: 'Pregunta lo que necesites',
            footer: '',
            getStarted: 'Comenzar conversación',
            inputPlaceholder: 'Escribe tu mensaje...',
          },
        },
        defaultLanguage: 'es',
      });
    };

    initializeChat();
  }, [webhookUrl]);

  if (!webhookUrl) return null;

  return (
    <div 
      ref={chatRef}
      className="w-full h-full chatbot-container"
      style={{ minHeight: '100%', width: '100%' }}
    />
  );
}
