import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// GET /api/tareas/[id]/historial - Obtener historial de una tarea
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

    const tareaId = parseInt(params.id);

    // Obtener historial
    const historial = await query(
      `
      SELECT 
        h.*,
        u.Nombre as UsuarioNombre
      FROM TD_TAREA_HISTORIAL h
      INNER JOIN TD_USUARIOS u ON h.UsuarioId = u.Id
      WHERE h.TareaId = @tareaId
      ORDER BY h.FechaHora DESC
      `,
      { tareaId }
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: historial,
    });
  } catch (error: any) {
    console.error("Error en GET /api/tareas/[id]/historial:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: error.message || "Error al obtener historial" },
      { status: 500 }
    );
  }
}
