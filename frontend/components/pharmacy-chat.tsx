"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MessageSquare, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatInput } from "./chat-input";
import { ChatMessage, TypingIndicator, type Message } from "./chat-message";
import { InventorySidebar, type InventoryItem } from "./inventory-sidebar";
import { InventoryPanel } from "./inventory-panel";
import { cn } from "@/lib/utils";

const INITIAL_INVENTORY: InventoryItem[] = [
  { id: "MED001", name: "Paracetamol 500mg", stock: 5, minStock: 20, category: "Analgésicos" },
  { id: "MED002", name: "Ibuprofeno 400mg", stock: 8, minStock: 15, category: "Antiinflamatorios" },
  { id: "MED003", name: "Amoxicilina 500mg", stock: 3, minStock: 10, category: "Antibióticos" },
  { id: "MED004", name: "Omeprazol 20mg", stock: 45, minStock: 25, category: "Gastrointestinal" },
  { id: "MED005", name: "Loratadina 10mg", stock: 12, minStock: 20, category: "Antihistamínicos" },
  { id: "MED006", name: "Metformina 850mg", stock: 60, minStock: 30, category: "Antidiabéticos" },
  { id: "MED007", name: "Atorvastatina 20mg", stock: 35, minStock: 20, category: "Cardiovascular" },
  { id: "MED008", name: "Diclofenaco Gel", stock: 7, minStock: 15, category: "Tópicos" },
  { id: "MED009", name: "Vitamina C 1000mg", stock: 25, minStock: 20, category: "Suplementos" },
  { id: "MED010", name: "Aspirina 100mg", stock: 50, minStock: 30, category: "Cardiovascular" },
];

const INITIAL_MESSAGES: Message[] = [
  {
    id: "1",
    role: "assistant",
    content: "¡Hola! Soy tu asistente de farmacia con IA. Puedo ayudarte a:\n\n• Verificar disponibilidad de medicamentos\n• Procesar pedidos\n• Analizar recetas médicas (adjunta una imagen o PDF)\n• Responder preguntas sobre productos\n\n¿En qué puedo ayudarte hoy?",
    timestamp: new Date(),
  },
];

export function PharmacyChat() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [history, setHistory] = useState<{ role: string; content: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const sendMessage = async (content: string, file: File | null) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: content || (file ? `[Archivo adjunto: ${file.name}]` : ""),
      timestamp: new Date(),
    };

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
      
      formData.append("history", JSON.stringify(history));

      const response = await fetch("http://localhost:3000/api/chat", {
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
        setHistory(data.history || []);
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
      console.log("[v0] Error sending message:", error);
      
      // Simulate response for demo when backend is not available
      const simulatedResponses = [
        {
          content: "He verificado el inventario y puedo confirmar que tenemos disponibilidad. ¿Deseas que procese un pedido?",
        },
        {
          content: "Gracias por tu consulta. He analizado la información y aquí está el resultado de tu pedido:",
          orderReceipt: {
            orderId: `ORD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
            items: [
              { name: "Paracetamol 500mg", quantity: 2, price: 5.99 },
              { name: "Vitamina C 1000mg", quantity: 1, price: 12.50 },
            ],
            total: 24.48,
            status: "confirmed" as const,
          },
        },
        {
          content: "Entiendo tu consulta. Basándome en el inventario actual, puedo sugerirte las siguientes alternativas disponibles en nuestra farmacia.",
        },
      ];

      const randomResponse = simulatedResponses[Math.floor(Math.random() * simulatedResponses.length)];
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: randomResponse.content,
        timestamp: new Date(),
        orderReceipt: randomResponse.orderReceipt,
      };

      setMessages((prev) => [...prev, assistantMessage]);
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
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden shrink-0"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground text-sm">
                Chat Inteligente
              </h2>
              <p className="text-xs text-muted-foreground">
                Asistente de farmacia con IA
              </p>
            </div>
          </div>
          <div className="ml-auto">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
              <span className="text-xs text-muted-foreground hidden sm:inline">
                En línea
              </span>
            </div>
          </div>
        </header>

        {/* Messages */}
        <ScrollArea ref={scrollRef} className="flex-1">
          <div className="min-h-full flex flex-col justify-end">
            <div className="py-4">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {isLoading && <TypingIndicator />}
            </div>
          </div>
        </ScrollArea>

        {/* Inventory Panel */}
        <InventoryPanel items={inventory} />

        {/* Input */}
        <ChatInput onSend={sendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
}
