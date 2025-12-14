import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { ApiResponse } from "@/types";

// GET - Obtener valores de una lista
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "No autenticado" },
        { status: 401 }
      );
    }

    const listaId = parseInt(params.id);

    // Obtener valores de la lista
    const valores = await query(
      `SELECT * FROM TD_VALORES_LISTA 
       WHERE ListaId = @listaId AND Estado = 'Activo'
       ORDER BY Orden, Valor`,
      { listaId }
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: valores,
    });
  } catch (error: any) {
    console.error("Error obteniendo valores de lista:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error en el servidor" },
      { status: 500 }
    );
  }
}
