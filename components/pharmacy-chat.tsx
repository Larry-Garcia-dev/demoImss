"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Activity, Menu, X, Sparkles, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatInput } from "./chat-input";
import { ChatMessage, TypingIndicator, type Message, type OrderReceipt } from "./chat-message";
import { InventorySidebar, type InventoryItem } from "./inventory-sidebar";
import { InventoryPanel } from "./inventory-panel";
import { cn } from "@/lib/utils";

// Backend API URL - uses Express backend on port 3000
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";

// Category mapping based on active principle
const getCategoryFromPrinciple = (principle: string): string => {
  const categories: Record<string, string> = {
    "Paracetamol": "Analgésicos",
    "Ibuprofeno": "Antiinflamatorios",
    "Amoxicilina": "Antibióticos",
    "Omeprazol": "Gastrointestinal",
    "Loratadina": "Antihistamínicos",
    "Metformina": "Antidiabéticos",
    "Atorvastatina": "Cardiovascular",
    "Diclofenaco": "Tópicos",
    "Ácido Ascórbico": "Suplementos",
    "Ácido Acetilsalicílico": "Cardiovascular",
  };
  return categories[principle] || "General";
};

const INITIAL_MESSAGES: Message[] = [
  {
    id: "1",
    role: "assistant",
    content: "¡Hola! Soy tu asistente de farmacia con IA. Puedo ayudarte a:\n\n• Verificar disponibilidad de medicamentos\n• Procesar pedidos\n• Analizar recetas médicas (adjunta una imagen o PDF)\n• Responder preguntas sobre productos\n\n¿En qué puedo ayudarte hoy?",
    timestamp: new Date(),
  },
];

// Convert UI messages to API history format
function buildHistoryFromMessages(messages: Message[]): { role: string; content: string }[] {
  // Skip the initial assistant greeting message
  return messages
    .filter((msg, idx) => idx > 0) // Skip first message (greeting)
    .map((msg) => ({
      role: msg.role,
      content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
    }));
}

export function PharmacyChat() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [isLoading, setIsLoading] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch inventory from Express backend API
  const fetchInventory = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/inventory`);
      const data = await response.json();
      if (data.success && data.inventory) {
        const formattedInventory: InventoryItem[] = data.inventory.map(
          (item: { id: number; name: string; stock: number; alert_threshold: number; active_principle: string }) => ({
            id: `MED${String(item.id).padStart(3, "0")}`,
            name: item.name,
            stock: item.stock,
            minStock: item.alert_threshold || 20,
            category: getCategoryFromPrinciple(item.active_principle),
          })
        );
        setInventory(formattedInventory);
      }
    } catch (error) {
      console.error("Error fetching inventory:", error);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Clear chat and start fresh conversation
  const clearChat = useCallback(() => {
    setMessages(INITIAL_MESSAGES);
  }, []);

  const sendMessage = async (content: string, file: File | null) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: content || (file ? `[Archivo adjunto: ${file.name}]` : ""),
      timestamp: new Date(),
    };

    // Build history from current messages BEFORE adding the new user message
    const currentHistory = buildHistoryFromMessages(messages);
    
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const formData = new FormData();
      
      if (content) {
        formData.append("message", content);
      }
      
      if (file) {
        formData.append("file", file);
      }
      
      // Send the conversation history for context
      formData.append("history", JSON.stringify(currentHistory));

      const response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.reply,
          timestamp: new Date(),
          orderReceipt: data.orderReceipt,
        };

        setMessages((prev) => [...prev, assistantMessage]);
        
        // Refresh inventory in case an order was processed
        fetchInventory();
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `Lo siento, hubo un error: ${data.error || "No se pudo procesar tu solicitud."}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta de nuevo.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 lg:relative lg:z-auto transition-transform duration-300",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="lg:hidden absolute top-4 right-4 z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        <InventorySidebar items={inventory} className="h-full" />
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Header */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden shrink-0"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-sm">
              <Activity className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                Chat Inteligente
                <Sparkles className="w-3.5 h-3.5 text-accent" />
              </h2>
              <p className="text-xs text-muted-foreground">
                Asistente de farmacia con IA
                {messages.length > 1 && (
                  <span className="ml-2 text-muted-foreground/70">
                    ({messages.length - 1} mensaje{messages.length > 2 ? "s" : ""})
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearChat}
              className="text-muted-foreground hover:text-foreground"
              title="Nueva conversacion"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline text-xs">Nueva</span>
            </Button>
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-success/10 border border-success/20">
              <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
              <span className="text-xs font-medium text-success hidden sm:inline">
                En linea
              </span>
            </div>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea ref={scrollRef} className="h-full">
            <div className="py-4">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {isLoading && <TypingIndicator />}
            </div>
          </ScrollArea>
        </div>

        {/* Inventory Panel */}
        <InventoryPanel items={inventory} />

        {/* Input */}
        <ChatInput onSend={sendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
}
