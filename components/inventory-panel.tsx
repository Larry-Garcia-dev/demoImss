"use client";

import { useState } from "react";
import { Package, ChevronDown, ChevronUp, Search, Boxes } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { InventoryItem } from "./inventory-sidebar";

interface InventoryPanelProps {
  items: InventoryItem[];
}

export function InventoryPanel({ items }: InventoryPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.id.toLowerCase().includes(search.toLowerCase())
  );

  const healthyStock = items.filter((item) => item.stock > item.minStock).length;

  return (
    <div className="border-t border-border bg-card/80 backdrop-blur-sm">
      <Button
        variant="ghost"
        className="w-full flex items-center justify-between px-4 py-3.5 h-auto hover:bg-secondary/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Boxes className="w-4 h-4 text-primary" />
          </div>
          <div className="text-left">
            <span className="font-medium text-sm block">Estado del Inventario</span>
            <span className="text-xs text-muted-foreground">
              {healthyStock} de {items.length} productos en buen estado
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs font-medium">
            {items.length} productos
          </Badge>
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </Button>

      {isOpen && (
        <div className="px-4 pb-4 border-t border-border animate-in slide-in-from-top-2 duration-200">
          <div className="relative mt-3 mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 bg-input rounded-xl border-border"
            />
          </div>

          <ScrollArea className="h-[220px]">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold text-muted-foreground">ID</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground">Nombre</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground text-right">Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id} className="hover:bg-secondary/30 transition-colors">
                    <TableCell className="text-xs font-mono text-muted-foreground py-3">
                      {item.id}
                    </TableCell>
                    <TableCell className="text-sm font-medium py-3">
                      {item.name}
                    </TableCell>
                    <TableCell className="text-right py-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs font-semibold tabular-nums",
                          item.stock <= item.minStock / 2
                            ? "border-destructive/50 text-destructive bg-destructive/10"
                            : item.stock <= item.minStock
                            ? "border-warning/50 text-warning-foreground bg-warning/10"
                            : "border-success/50 text-success bg-success/10"
                        )}
                      >
                        {item.stock} uds
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredItems.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center text-muted-foreground text-sm py-10"
                    >
                      <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      No se encontraron productos
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
