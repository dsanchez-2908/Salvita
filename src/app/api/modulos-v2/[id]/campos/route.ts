import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// GET /api/modulos-v2/[id]/campos - Obtener campos de un módulo
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "No autorizado" },
        { status: 401 }
      );
    }

    const moduloId = parseInt(params.id);

    if (isNaN(moduloId)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "ID de módulo inválido" },
        { status: 400 }
      );
    }

    // Obtener campos del módulo
    const campos = await query(
      `SELECT 
        c.Id,
        c.Nombre,
        c.NombreColumna,
        c.TipoDato,
        c.Largo,
        c.Obligatorio,
        c.Visible,
        c.VisibleEnGrilla,
        c.Orden,
        c.ListaId,
        l.Nombre as ListaNombre
       FROM TD_CAMPOS c
       LEFT JOIN TD_LISTAS l ON c.ListaId = l.Id
       WHERE c.ModuloId = @moduloId
       ORDER BY c.Orden, c.Nombre`,
      { moduloId }
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: campos,
    });
  } catch (error: any) {
    console.error("Error en GET /api/modulos-v2/[id]/campos:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: error.message || "Error al obtener campos" },
      { status: 500 }
    );
  }
}
