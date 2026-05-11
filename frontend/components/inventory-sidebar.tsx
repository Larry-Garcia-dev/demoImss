"use client";

import { AlertTriangle, Package, Pill } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface InventoryItem {
  id: string;
  name: string;
  stock: number;
  minStock: number;
  category: string;
}

interface InventorySidebarProps {
  items: InventoryItem[];
  className?: string;
}

export function InventorySidebar({ items, className }: InventorySidebarProps) {
  const lowStockItems = items.filter((item) => item.stock <= item.minStock);

  return (
    <aside
      className={cn(
        "w-full lg:w-80 bg-card border-r border-border flex flex-col",
        className
      )}
    >
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Pill className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground">PharmAssist AI</h1>
            <p className="text-xs text-muted-foreground">
              Asistente de Farmacia
            </p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <Card className="border-warning/30 bg-warning/5">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2 text-warning-foreground">
              <AlertTriangle className="w-4 h-4" />
              Alertas de Inventario
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-xs text-muted-foreground">
              {lowStockItems.length} producto
              {lowStockItems.length !== 1 ? "s" : ""} con stock bajo
            </p>
          </CardContent>
        </Card>
      </div>

      <ScrollArea className="flex-1 px-4 pb-4">
        <div className="space-y-2">
          {lowStockItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Sin alertas de stock</p>
            </div>
          ) : (
            lowStockItems.map((item) => (
              <InventoryAlertItem key={item.id} item={item} />
            ))
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}

function InventoryAlertItem({ item }: { item: InventoryItem }) {
  const isCritical = item.stock <= item.minStock / 2;

  return (
    <div
      className={cn(
        "p-3 rounded-lg border transition-colors",
        isCritical
          ? "bg-destructive/5 border-destructive/30"
          : "bg-warning/5 border-warning/30"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground truncate">
            {item.name}
          </p>
          <p className="text-xs text-muted-foreground">{item.category}</p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "text-xs shrink-0",
            isCritical
              ? "border-destructive/50 text-destructive bg-destructive/10"
              : "border-warning/50 text-warning-foreground bg-warning/10"
          )}
        >
          {item.stock} uds
        </Badge>
      </div>
      <div className="mt-2 flex items-center gap-1">
        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              isCritical ? "bg-destructive" : "bg-warning"
            )}
            style={{
              width: `${Math.min((item.stock / item.minStock) * 100, 100)}%`,
            }}
          />
        </div>
        <span className="text-xs text-muted-foreground">
          Min: {item.minStock}
        </span>
      </div>
    </div>
  );
}
