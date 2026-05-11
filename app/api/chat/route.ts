import { NextRequest, NextResponse } from "next/server";
import { processUserMessage } from "@/lib/services/chat-service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const message = formData.get("message") as string | null;
    const historyRaw = formData.get("history") as string | null;
    const file = formData.get("file") as File | null;

    // Validamos que al menos haya un mensaje de texto o un archivo
    if (!message && !file) {
      return NextResponse.json(
        { success: false, error: "Debes enviar un mensaje o un archivo." },
        { status: 400 }
      );
    }

    // Parse history
    let history: { role: string; content: string }[] = [];
    if (historyRaw) {
      try {
        history = JSON.parse(historyRaw);
      } catch {
        history = [];
      }
    }

    // Convert file to base64 if exists
    let fileBase64URI: string | null = null;
    if (file) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64String = buffer.toString("base64");
      fileBase64URI = `data:${file.type};base64,${base64String}`;
    }

    // Process the message
    const result = await processUserMessage(message || "", history, fileBase64URI);

    return NextResponse.json({
      success: true,
      reply: result.reply,
      history: result.updatedHistory,
    });
  } catch (error) {
    console.error("Error en la API de chat:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error procesando tu solicitud.",
      },
      { status: 500 }
    );
  }
}
