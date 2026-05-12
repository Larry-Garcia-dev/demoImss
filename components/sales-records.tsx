"use client";

import { useState } from "react";
import { Receipt, ChevronDown, ChevronUp, DollarSign, Package, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { OrderReceipt } from "./chat-message";

interface SalesRecordsProps {
  sales: OrderReceipt[];
}

export function SalesRecords({ sales }: SalesRecordsProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Calculate totals
  const totalSales = sales.reduce((acc, sale) => acc + Number(sale.total || 0), 0);
  const totalItems = sales.reduce((acc, sale) => 
    acc + sale.items.reduce((itemAcc, item) => itemAcc + Number(item.quantity || 0), 0), 0
  );

  if (sales.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-border bg-card/80 backdrop-blur-sm">
      <Button
        variant="ghost"
        className="w-full flex items-center justify-between px-4 py-3.5 h-auto hover:bg-secondary/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Receipt className="w-4 h-4 text-primary" />
          </div>
          <div className="text-left">
            <span className="font-medium text-sm block">Registro de Ventas</span>
            <span className="text-xs text-muted-foreground">
              {sales.length} venta{sales.length !== 1 ? "s" : ""} registrada{sales.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs">
              <Package className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">{totalItems} uds</span>
            </div>
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-success" />
              <span className="text-sm font-semibold text-success">${totalSales.toFixed(2)}</span>
            </div>
          </div>
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </Button>

      {isOpen && (
        <div className="px-4 pb-4 border-t border-border animate-in slide-in-from-top-2 duration-200">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3 mt-3 mb-4">
            <div className="p-3 rounded-lg bg-secondary/50 border border-border/50">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Receipt className="w-3.5 h-3.5" />
                <span className="text-xs">Ventas</span>
              </div>
              <p className="text-lg font-bold text-foreground">{sales.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/50 border border-border/50">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Package className="w-3.5 h-3.5" />
                <span className="text-xs">Unidades</span>
              </div>
              <p className="text-lg font-bold text-foreground">{totalItems}</p>
            </div>
            <div className="p-3 rounded-lg bg-success/10 border border-success/20">
              <div className="flex items-center gap-2 text-success mb-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span className="text-xs">Total</span>
              </div>
              <p className="text-lg font-bold text-success">${totalSales.toFixed(2)}</p>
            </div>
          </div>

          {/* Sales List */}
          <ScrollArea className="h-[180px]">
            <div className="space-y-2">
              {sales.map((sale, idx) => (
                <div
                  key={sale.orderId || idx}
                  className="p-3 rounded-lg bg-card border border-border hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                        #{sale.orderId}
                      </span>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs",
                          sale.status === "confirmed" 
                            ? "border-success/50 text-success bg-success/10" 
                            : "border-warning/50 text-warning-foreground bg-warning/10"
                        )}
                      >
                        {sale.status === "confirmed" ? "Confirmado" : sale.status}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{sale.date}</span>
                  </div>
                  <div className="space-y-1">
                    {sale.items.map((item, itemIdx) => (
                      <div key={itemIdx} className="flex justify-between text-sm">
                        <span className="text-foreground">
                          {item.name} <span className="text-muted-foreground">x{item.quantity}</span>
                        </span>
                        <span className="font-medium tabular-nums">${Number(item.price || 0).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-border/50">
                    <span className="text-xs text-muted-foreground">Total</span>
                    <span className="font-bold text-primary">${Number(sale.total || 0).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
