import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

// POST /api/tareas/[id]/finalizar - Finalizar una tarea tomada
export async function POST(
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

    const body = await request.json();
    const { comentario } = body;
    const tareaId = parseInt(params.id);

    // Verificar que la tarea existe y está tomada por el usuario
    const tareas = await query(
      `SELECT * FROM TD_TAREAS WHERE Id = @tareaId`,
      { tareaId }
    );

    if (tareas.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Tarea no encontrada" },
        { status: 404 }
      );
    }

    const tarea = tareas[0];

    if (tarea.Estado !== "Tomada") {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Solo se pueden finalizar tareas tomadas" },
        { status: 400 }
      );
    }

    // Verificar que el usuario es quien tomó la tarea
    if (tarea.UsuarioTomadaPorId !== user.userId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Solo puedes finalizar tareas que has tomado" },
        { status: 403 }
      );
    }

    // Finalizar la tarea
    await query(
      `
      UPDATE TD_TAREAS 
      SET Estado = 'Finalizada', 
          FechaFinalizacion = GETDATE()
      WHERE Id = @tareaId
      `,
      { tareaId }
    );

    // Registrar en historial
    await query(
      `
      INSERT INTO TD_TAREA_HISTORIAL (
        TareaId, UsuarioId, Usuario, Accion, Detalle, FechaHora
      )
      VALUES (@tareaId, @userId, @usuario, 'Finalizar', @detalle, GETDATE())
      `,
      {
        tareaId,
        userId: user.userId,
        usuario: user.nombre,
        detalle: comentario || 'Tarea finalizada',
      }
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Tarea finalizada exitosamente",
    });
  } catch (error: any) {
    console.error("Error en POST /api/tareas/[id]/finalizar:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: error.message || "Error al finalizar tarea" },
      { status: 500 }
    );
  }
}
