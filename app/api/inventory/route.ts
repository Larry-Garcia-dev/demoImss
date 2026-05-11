import { NextResponse } from "next/server";
import { checkStock } from "@/lib/services/inventory-service";

export const runtime = "nodejs";

export async function GET() {
  try {
    // Get all products by searching with empty string or wildcard
    const inventory = await checkStock("");
    
    return NextResponse.json({
      success: true,
      inventory,
    });
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error obteniendo inventario",
      },
      { status: 500 }
    );
  }
}
