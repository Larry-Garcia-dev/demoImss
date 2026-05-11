"use client";

import { AlertTriangle, Package, Pill, TrendingDown, Activity } from "lucide-react";
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
  const criticalItems = lowStockItems.filter((item) => item.stock <= item.minStock / 2);

  return (
    <aside
      className={cn(
        "w-full lg:w-80 bg-sidebar border-r border-sidebar-border flex flex-col",
        className
      )}
    >
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-sm">
            <Pill className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-sidebar-foreground text-base">PharmAssist AI</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Activity className="w-3 h-3" />
              Asistente de Farmacia
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <Card className="border-warning/30 bg-gradient-to-br from-warning/5 to-warning/10 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2 text-warning-foreground font-semibold">
              <AlertTriangle className="w-4 h-4" />
              Alertas de Inventario
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-2xl font-bold text-warning-foreground">
                  {lowStockItems.length}
                </p>
                <p className="text-xs text-muted-foreground">
                  Productos con stock bajo
                </p>
              </div>
              {criticalItems.length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  <TrendingDown className="w-3 h-3 mr-1" />
                  {criticalItems.length} criticos
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="px-4 pb-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Productos con Alerta
        </h3>
      </div>

      <ScrollArea className="flex-1 px-4 pb-4">
        <div className="space-y-2">
          {lowStockItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">Sin alertas de stock</p>
              <p className="text-xs mt-1">Todo el inventario esta en orden</p>
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
  const percentage = Math.min((item.stock / item.minStock) * 100, 100);

  return (
    <div
      className={cn(
        "p-3 rounded-xl border transition-all duration-200 hover:shadow-sm cursor-pointer",
        isCritical
          ? "bg-gradient-to-br from-destructive/5 to-destructive/10 border-destructive/30 hover:border-destructive/50"
          : "bg-gradient-to-br from-warning/5 to-warning/10 border-warning/30 hover:border-warning/50"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground truncate">
            {item.name}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{item.category}</p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "text-xs shrink-0 font-semibold",
            isCritical
              ? "border-destructive/50 text-destructive bg-destructive/10"
              : "border-warning/50 text-warning-foreground bg-warning/10"
          )}
        >
          {item.stock} uds
        </Badge>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 h-2 bg-secondary/60 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              isCritical ? "bg-destructive" : "bg-warning"
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground font-medium tabular-nums">
          {item.minStock}
        </span>
      </div>
    </div>
  );
}
