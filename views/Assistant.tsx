import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { sendMessageToOllama, ChatMessage } from '../services/ollamaService';
import ReactMarkdown from 'react-markdown';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

const Assistant: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', text: '¡Hola! Soy tu asistente de CultivaDatos. ¿Tienes dudas sobre el riego, el fertilizante o tus plantas?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load history from Supabase
  useEffect(() => {
    if (!user) return;

    const loadHistory = async () => {
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error loading chat history:', error);
          return;
        }

        if (data && data.length > 0) {
          const loadedMessages: Message[] = data.map((m: any) => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            text: m.content
          }));
          setMessages(loadedMessages);
        }
      } catch (err) {
        console.error('Failed to load chat history:', err);
      }
    };

    loadHistory();
  }, [user]);

  const saveMessage = async (text: string, role: 'user' | 'assistant') => {
    if (!user) return;
    try {
      const { error } = await supabase.from('chat_messages').insert({
        user_id: user.id,
        role,
        content: text
      });
      if (error) console.error('Error saving message:', error);
    } catch (err) {
      console.error('Failed to save message:', err);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input;
    const tempId = Date.now().toString();
    const userMsg: Message = { id: tempId, role: 'user', text: userText };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Save user message asynchronously
    saveMessage(userText, 'user');

    const history = messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.text
    }));

    try {
      const responseText = await sendMessageToOllama(userText, history);
      const botResponse = responseText || "No pude generar una respuesta.";

      const botMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', text: botResponse };
      setMessages(prev => [...prev, botMsg]);

      // Save bot message
      saveMessage(botResponse, 'assistant');
    } catch (error) {
      console.error("Error getting response:", error);
      const errorMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', text: "Lo siento, hubo un error al conectar con el asistente." };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-gray-50">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} gap-2`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-green-600'}`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={`p-3 rounded-2xl text-sm shadow-sm ${msg.role === 'user' ? 'bg-primary text-white rounded-tr-none' : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'}`}>
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-2 bg-white border border-gray-100 p-3 rounded-2xl rounded-tl-none shadow-sm items-center">
              <Loader2 size={16} className="animate-spin text-primary" />
              <span className="text-xs text-gray-500">Pensando...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-white border-t border-gray-200">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu pregunta..."
            className="w-full pl-4 pr-12 py-3 bg-gray-100 border-transparent focus:bg-white focus:border-primary border rounded-full outline-none text-sm transition-all"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className={`absolute right-2 p-2 rounded-full ${isLoading || !input.trim() ? 'text-gray-400' : 'bg-primary text-white hover:bg-green-700'}`}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Assistant;