import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

// POST /api/tareas/[id]/tomar - Tomar una tarea pendiente de bandeja grupal
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

    const tareaId = parseInt(params.id);

    // Verificar que la tarea existe y está pendiente
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

    if (tarea.Estado !== "Pendiente") {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Solo se pueden tomar tareas pendientes" },
        { status: 400 }
      );
    }

    if (tarea.TipoAsignacion !== "Bandeja") {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Solo se pueden tomar tareas asignadas a bandejas" },
        { status: 400 }
      );
    }

    // Verificar que el usuario tiene acceso a la bandeja
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
      { bandejaId: tarea.BandejaAsignadaId, userId: user.userId }
    );

    if (acceso.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "No tienes acceso a esta bandeja" },
        { status: 403 }
      );
    }

    // Tomar la tarea
    await query(
      `
      UPDATE TD_TAREAS 
      SET Estado = 'Tomada', 
          UsuarioTomadaPorId = @userId, 
          FechaTomada = GETDATE()
      WHERE Id = @tareaId
      `,
      { tareaId, userId: user.userId }
    );

    // Registrar en historial
    await query(
      `
      INSERT INTO TD_TAREA_HISTORIAL (
        TareaId, UsuarioId, Usuario, Accion, Detalle, FechaHora
      )
      VALUES (@tareaId, @userId, @usuario, 'Tomar', 'Tarea tomada para trabajar', GETDATE())
      `,
      {
        tareaId,
        userId: user.userId,
        usuario: user.nombre,
      }
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Tarea tomada exitosamente",
    });
  } catch (error: any) {
    console.error("Error en POST /api/tareas/[id]/tomar:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: error.message || "Error al tomar tarea" },
      { status: 500 }
    );
  }
}
