import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// POST /api/listas/valores - Obtener valores de múltiples listas
export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "No autorizado" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { listasIds } = body;

    if (!listasIds || !Array.isArray(listasIds) || listasIds.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: true,
        data: [],
      });
    }

    // Obtener valores de todas las listas solicitadas
    const ids = listasIds.join(',');
    const valores = await query(
      `SELECT Id, ListaId, Valor, Orden 
       FROM TD_VALORES_LISTA 
       WHERE ListaId IN (${ids}) AND Estado = 'Activo'
       ORDER BY ListaId, Orden, Valor`
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: valores,
    });
  } catch (error: any) {
    console.error("Error en POST /api/listas/valores:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: error.message || "Error al obtener valores de listas" },
      { status: 500 }
    );
  }
}
