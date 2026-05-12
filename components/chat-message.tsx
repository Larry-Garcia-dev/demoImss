"use client";

import { useState, useEffect } from "react";
import { User, Stethoscope, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  items: { name: string; quantity: number; price: number; unitPrice?: number }[];
  total: number;
  status: "confirmed" | "pending" | "delivered";
  date?: string;
  previousStock?: number;
  newStock?: number;
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
  const receiptDate = receipt.date || new Date().toLocaleString("es-MX");

  // Generate downloadable ticket as text file
  const downloadTicket = () => {
    const ticketContent = `
════════════════════════════════════════════
           FARMACIA AI - RECIBO DE ORDEN
════════════════════════════════════════════

Orden #: ${receipt.orderId}
Fecha: ${receiptDate}
Estado: ${status.label}

────────────────────────────────────────────
                  DETALLE
────────────────────────────────────────────
${receipt.items.map(item => {
  const unitPrice = Number(item.unitPrice) || Number(item.price) / Number(item.quantity) || 0;
  const subtotal = Number(item.price) || 0;
  return `${item.name}
  Cantidad: ${item.quantity} unidades
  Precio unitario: $${unitPrice.toFixed(2)}
  Subtotal: $${subtotal.toFixed(2)}`;
}).join('\n\n')}

────────────────────────────────────────────
TOTAL: $${receipt.total.toFixed(2)}
────────────────────────────────────────────
${receipt.newStock !== undefined ? `
Stock restante: ${receipt.newStock} unidades
` : ''}
════════════════════════════════════════════
        Gracias por su preferencia
          PharmAssist AI System
════════════════════════════════════════════
    `.trim();

    const blob = new Blob([ticketContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ticket-${receipt.orderId}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Print ticket
  const printTicket = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ticket ${receipt.orderId}</title>
        <style>
          body { font-family: 'Courier New', monospace; padding: 20px; max-width: 300px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
          .title { font-size: 16px; font-weight: bold; }
          .subtitle { font-size: 12px; color: #666; }
          .info { margin: 10px 0; font-size: 12px; }
          .items { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 10px 0; margin: 10px 0; }
          .item { margin: 8px 0; }
          .item-name { font-weight: bold; }
          .item-detail { font-size: 11px; color: #666; margin-left: 10px; }
          .total { font-size: 16px; font-weight: bold; text-align: right; margin-top: 10px; }
          .footer { text-align: center; margin-top: 20px; font-size: 11px; color: #666; }
          .status { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; background: #e8f5e9; color: #2e7d32; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">FARMACIA AI</div>
          <div class="subtitle">Recibo de Orden</div>
        </div>
        <div class="info">
          <div><strong>Orden:</strong> #${receipt.orderId}</div>
          <div><strong>Fecha:</strong> ${receiptDate}</div>
          <div><strong>Estado:</strong> <span class="status">${status.label}</span></div>
        </div>
        <div class="items">
          ${receipt.items.map(item => {
            const unitPrice = Number(item.unitPrice) || Number(item.price) / Number(item.quantity) || 0;
            const subtotal = Number(item.price) || 0;
            return `
            <div class="item">
              <div class="item-name">${item.name}</div>
              <div class="item-detail">Cant: ${item.quantity} x $${unitPrice.toFixed(2)}</div>
              <div class="item-detail">Subtotal: $${subtotal.toFixed(2)}</div>
            </div>
          `}).join('')}
        </div>
        <div class="total">TOTAL: $${Number(receipt.total || 0).toFixed(2)}</div>
        ${receipt.newStock !== undefined ? `<div class="info">Stock restante: ${receipt.newStock} unidades</div>` : ''}
        <div class="footer">
          <p>Gracias por su preferencia</p>
          <p>PharmAssist AI System</p>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

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
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground font-mono bg-muted/50 inline-block px-2 py-0.5 rounded">
          #{receipt.orderId}
        </p>
        <p className="text-xs text-muted-foreground">{receiptDate}</p>
      </div>
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
            <span className="font-medium tabular-nums">${Number(item.price || 0).toFixed(2)}</span>
          </div>
        ))}
      </div>
      {receipt.newStock !== undefined && (
        <p className="text-xs text-muted-foreground mt-2">
          Stock restante: <span className="font-medium">{receipt.newStock} unidades</span>
        </p>
      )}
      <div className="border-t border-border mt-3 pt-3 flex justify-between items-center">
        <div>
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="text-lg font-bold text-primary tabular-nums ml-2">${Number(receipt.total || 0).toFixed(2)}</span>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={downloadTicket}
            className="h-8 text-xs"
          >
            <Download className="w-3 h-3 mr-1" />
            Descargar
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={printTicket}
            className="h-8 text-xs"
          >
            <Printer className="w-3 h-3 mr-1" />
            Imprimir
          </Button>
        </div>
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
