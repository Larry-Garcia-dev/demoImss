"use client";

import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  orderReceipt?: OrderReceipt;
}

export interface OrderReceipt {
  orderId: string;
  items: { name: string; quantity: number; price: number }[];
  total: number;
  status: "confirmed" | "pending" | "delivered";
}

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isAssistant = message.role === "assistant";

  return (
    <div
      className={cn(
        "flex gap-3 p-4",
        isAssistant ? "justify-start" : "justify-end"
      )}
    >
      {isAssistant && (
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary flex items-center justify-center">
          <Bot className="w-5 h-5 text-primary-foreground" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-3 shadow-sm",
          isAssistant
            ? "bg-card border border-border text-card-foreground"
            : "bg-primary text-primary-foreground"
        )}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </p>
        {message.orderReceipt && (
          <OrderReceiptCard receipt={message.orderReceipt} />
        )}
        <span
          className={cn(
            "text-xs mt-2 block",
            isAssistant ? "text-muted-foreground" : "text-primary-foreground/70"
          )}
        >
          {message.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
      {!isAssistant && (
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <User className="w-5 h-5 text-secondary-foreground" />
        </div>
      )}
    </div>
  );
}

function OrderReceiptCard({ receipt }: { receipt: OrderReceipt }) {
  const statusColors = {
    confirmed: "bg-success/10 text-success border-success/30",
    pending: "bg-warning/10 text-warning-foreground border-warning/30",
    delivered: "bg-primary/10 text-primary border-primary/30",
  };

  return (
    <div className="mt-3 p-4 bg-secondary/50 rounded-xl border border-border">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-foreground text-sm">
          Recibo Digital
        </h4>
        <span
          className={cn(
            "text-xs px-2 py-1 rounded-full border",
            statusColors[receipt.status]
          )}
        >
          {receipt.status === "confirmed"
            ? "Confirmado"
            : receipt.status === "pending"
            ? "Pendiente"
            : "Entregado"}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mb-2">
        Orden #{receipt.orderId}
      </p>
      <div className="space-y-1">
        {receipt.items.map((item, idx) => (
          <div
            key={idx}
            className="flex justify-between text-xs text-foreground"
          >
            <span>
              {item.name} x{item.quantity}
            </span>
            <span>${item.price.toFixed(2)}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-border mt-2 pt-2 flex justify-between font-semibold text-sm text-foreground">
        <span>Total</span>
        <span>${receipt.total.toFixed(2)}</span>
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex gap-3 p-4 justify-start">
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary flex items-center justify-center">
        <Bot className="w-5 h-5 text-primary-foreground" />
      </div>
      <div className="bg-card border border-border rounded-2xl px-4 py-3 shadow-sm">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
