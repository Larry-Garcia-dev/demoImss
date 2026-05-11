"use client";

import { useState, useRef, type KeyboardEvent, type ChangeEvent } from "react";
import { Paperclip, Send, X, FileText, ImageIcon } from "lucide-react";
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
    <div className="p-4 border-t border-border bg-card">
      {attachedFile && (
        <div className="mb-3">
          <div className="inline-flex items-center gap-2 p-2 bg-secondary rounded-lg border border-border">
            {filePreview ? (
              <img
                src={filePreview}
                alt="Preview"
                className="w-12 h-12 object-cover rounded"
              />
            ) : (
              <div className="w-12 h-12 bg-primary/10 rounded flex items-center justify-center">
                {attachedFile.type === "application/pdf" ? (
                  <FileText className="w-6 h-6 text-primary" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-primary" />
                )}
              </div>
            )}
            <div className="flex-1 min-w-0 max-w-[150px]">
              <p className="text-xs font-medium text-foreground truncate">
                {attachedFile.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {(attachedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
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
          className="shrink-0 h-10 w-10"
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
          placeholder="Escribe un mensaje... (Shift+Enter para nueva línea)"
          className={cn(
            "flex-1 min-h-[42px] max-h-[120px] resize-none bg-input",
            "focus-visible:ring-primary"
          )}
          rows={1}
          disabled={isLoading}
        />

        <Button
          onClick={handleSend}
          disabled={(!message.trim() && !attachedFile) || isLoading}
          className="shrink-0 h-10 px-4"
        >
          <Send className="w-4 h-4" />
          <span className="sr-only">Enviar mensaje</span>
        </Button>
      </div>
    </div>
  );
}
