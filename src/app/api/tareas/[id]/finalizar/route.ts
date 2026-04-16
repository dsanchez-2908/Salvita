import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

// POST /api/tareas/[id]/finalizar - Finalizar una tarea
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

    // Verificar que la tarea existe
    const tareas = await query(
      `
      SELECT t.*
      FROM TD_TAREAS t
      WHERE t.Id = @tareaId
      `,
      { tareaId }
    );

    if (tareas.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Tarea no encontrada" },
        { status: 404 }
      );
    }

    const tarea = tareas[0];

    // Verificar que el usuario tiene acceso a la tarea
    const tieneAcceso = await verificarAccesoTarea(user.userId, tarea);
    if (!tieneAcceso) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "No tienes acceso a esta tarea" },
        { status: 403 }
      );
    }

    // Finalizar la tarea
    await query(
      `
      UPDATE TD_TAREAS 
      SET Estado = 'Completada', 
          FechaCompletado = GETDATE()
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

// Función auxiliar para verificar acceso a tarea
async function verificarAccesoTarea(userId: number, tarea: any): Promise<boolean> {
  // Si el usuario tomó la tarea, tiene acceso
  if (tarea.UsuarioTomadaPorId === userId) {
    return true;
  }

  // Si es asignación directa al usuario
  if (tarea.TipoAsignacion === "Usuario" && tarea.UsuarioAsignadoId === userId) {
    return true;
  }

  // Si es asignación a bandeja, verificar si el usuario tiene acceso a la bandeja
  if (tarea.TipoAsignacion === "Bandeja") {
    const acceso = await query(
      `
      SELECT 1 
      FROM TR_BANDEJA_USUARIO 
      WHERE BandejaId = @bandejaId AND UsuarioId = @userId
      UNION
      SELECT 1
      FROM TR_BANDEJA_ROL br
      INNER JOIN TR_USUARIO_ROL ur ON br.RolId = ur.RolId
      WHERE br.BandejaId = @bandejaId AND ur.UsuarioId = @userId
      `,
      { bandejaId: tarea.BandejaAsignadaId, userId }
    );
    return acceso.length > 0;
  }

  return false;
}
