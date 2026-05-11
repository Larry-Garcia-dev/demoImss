"use client";

import { useState, useEffect } from "react";
import { Bot, User, Stethoscope } from "lucide-react";
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
  const [formattedTime, setFormattedTime] = useState<string>("");

  useEffect(() => {
    // Format time on client side only to avoid hydration mismatch
    setFormattedTime(
      message.timestamp.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  }, [message.timestamp]);

  return (
    <div
      className={cn(
        "flex gap-3 px-4 py-3",
        isAssistant ? "justify-start" : "justify-end"
      )}
    >
      {isAssistant && (
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-sm">
          <Stethoscope className="w-4 h-4 text-primary-foreground" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[80%] sm:max-w-[75%] rounded-2xl px-4 py-3",
          isAssistant
            ? "bg-card border border-border text-card-foreground shadow-sm"
            : "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground shadow-md"
        )}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </p>
        {message.orderReceipt && (
          <OrderReceiptCard receipt={message.orderReceipt} />
        )}
        {formattedTime && (
          <span
            className={cn(
              "text-[11px] mt-2 block font-medium",
              isAssistant ? "text-muted-foreground" : "text-primary-foreground/70"
            )}
          >
            {formattedTime}
          </span>
        )}
      </div>
      {!isAssistant && (
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-secondary border border-border flex items-center justify-center">
          <User className="w-4 h-4 text-secondary-foreground" />
        </div>
      )}
    </div>
  );
}

function OrderReceiptCard({ receipt }: { receipt: OrderReceipt }) {
  const statusConfig = {
    confirmed: {
      color: "bg-success/10 text-success border-success/30",
      label: "Confirmado",
      icon: "✓"
    },
    pending: {
      color: "bg-warning/10 text-warning-foreground border-warning/30",
      label: "Pendiente",
      icon: "◷"
    },
    delivered: {
      color: "bg-primary/10 text-primary border-primary/30",
      label: "Entregado",
      icon: "✓✓"
    },
  };

  const status = statusConfig[receipt.status];

  return (
    <div className="mt-4 p-4 bg-gradient-to-br from-background to-secondary/50 rounded-xl border border-border shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
            <span className="text-success text-sm">📋</span>
          </div>
          <h4 className="font-semibold text-foreground text-sm">
            Recibo Digital
          </h4>
        </div>
        <span
          className={cn(
            "text-xs px-2.5 py-1 rounded-full border font-medium flex items-center gap-1",
            status.color
          )}
        >
          <span>{status.icon}</span>
          {status.label}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mb-3 font-mono bg-muted/50 inline-block px-2 py-0.5 rounded">
        #{receipt.orderId}
      </p>
      <div className="space-y-2 bg-card/50 rounded-lg p-3 border border-border/50">
        {receipt.items.map((item, idx) => (
          <div
            key={idx}
            className="flex justify-between text-sm text-foreground"
          >
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              {item.name} <span className="text-muted-foreground">x{item.quantity}</span>
            </span>
            <span className="font-medium tabular-nums">${item.price.toFixed(2)}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-border mt-3 pt-3 flex justify-between font-bold text-base text-foreground">
        <span>Total</span>
        <span className="text-primary tabular-nums">${receipt.total.toFixed(2)}</span>
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex gap-3 px-4 py-3 justify-start">
      <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-sm">
        <Stethoscope className="w-4 h-4 text-primary-foreground animate-pulse" />
      </div>
      <div className="bg-card border border-border rounded-2xl px-5 py-3 shadow-sm">
        <div className="flex gap-1.5 items-center">
          <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
