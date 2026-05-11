"use client";

import { useState, useRef, type KeyboardEvent, type ChangeEvent } from "react";
import { Paperclip, Send, X, FileText, ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string, file: File | null) => void;
  isLoading: boolean;
}

export function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file);
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setFilePreview(event.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }
    }
  };

  const removeFile = () => {
    setAttachedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSend = () => {
    if ((!message.trim() && !attachedFile) || isLoading) return;
    onSend(message.trim(), attachedFile);
    setMessage("");
    removeFile();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4 border-t border-border bg-card/80 backdrop-blur-sm">
      {attachedFile && (
        <div className="mb-3">
          <div className="inline-flex items-center gap-3 p-2.5 bg-gradient-to-r from-secondary to-secondary/80 rounded-xl border border-border shadow-sm">
            {filePreview ? (
              <img
                src={filePreview}
                alt="Preview"
                className="w-14 h-14 object-cover rounded-lg border border-border"
              />
            ) : (
              <div className="w-14 h-14 bg-primary/10 rounded-lg flex items-center justify-center border border-primary/20">
                {attachedFile.type === "application/pdf" ? (
                  <FileText className="w-6 h-6 text-primary" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-primary" />
                )}
              </div>
            )}
            <div className="flex-1 min-w-0 max-w-[180px]">
              <p className="text-sm font-medium text-foreground truncate">
                {attachedFile.name}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {(attachedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 rounded-full hover:bg-destructive/10 hover:text-destructive"
              onClick={removeFile}
            >
              <X className="w-4 h-4" />
              <span className="sr-only">Eliminar archivo</span>
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          variant="outline"
          size="icon"
          className="shrink-0 h-11 w-11 rounded-xl border-border hover:bg-primary/5 hover:border-primary/30 transition-colors"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
        >
          <Paperclip className="w-4 h-4" />
          <span className="sr-only">Adjuntar archivo</span>
        </Button>

        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe tu mensaje... (Shift+Enter para nueva linea)"
          className={cn(
            "flex-1 min-h-[44px] max-h-[120px] resize-none bg-input rounded-xl border-border",
            "focus-visible:ring-primary/30 focus-visible:border-primary/50",
            "placeholder:text-muted-foreground/70"
          )}
          rows={1}
          disabled={isLoading}
        />

        <Button
          onClick={handleSend}
          disabled={(!message.trim() && !attachedFile) || isLoading}
          className={cn(
            "shrink-0 h-11 px-5 rounded-xl shadow-sm transition-all",
            "bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary",
            "disabled:opacity-50"
          )}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          <span className="sr-only">Enviar mensaje</span>
        </Button>
      </div>
    </div>
  );
}
