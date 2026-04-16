import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getUserFromRequest, registrarTraza } from "@/lib/auth";

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

// POST /api/tareas/[id]/rechazar - Rechazar una tarea
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
    const { motivo } = body;
    const tareaId = parseInt(params.id);

    if (!motivo || motivo.trim() === "") {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "El motivo de rechazo es obligatorio" },
        { status: 400 }
      );
    }

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

    // Validar que el usuario puede realizar la acción
    const puedeRealizarAccion = await verificarPuedeRealizarAccion(user.userId, tarea);
    if (!puedeRealizarAccion) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Solo el usuario que tomó la tarea puede rechazarla" },
        { status: 403 }
      );
    }

    // Rechazar la tarea
    await query(
      `
      UPDATE TD_TAREAS 
      SET Estado = 'Rechazada', 
          FechaRechazo = GETDATE()
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
      VALUES (@tareaId, @userId, @usuario, 'Rechazar', @detalle, GETDATE())
      `,
      {
        tareaId,
        userId: user.userId,
        usuario: user.nombre,
        detalle: `Tarea rechazada: ${motivo}`,
      }
    );
    
    // Obtener datos de la tarea para la traza
    const tareaInfo = await query(
      `SELECT pt.Nombre as PlantillaNombre 
       FROM TD_TAREAS t
       INNER JOIN TD_PLANTILLA_TAREAS pt ON t.PlantillaTareaId = pt.Id
       WHERE t.Id = @tareaId`,
      { tareaId }
    );
    
    // Registrar traza de auditoría
    await registrarTraza(
      user.userId,
      'Rechazar',
      'Tareas',
      `Tarea rechazada - Plantilla: "${tareaInfo[0]?.PlantillaNombre || 'Desconocida'}" - Motivo: ${motivo.substring(0, 100)}`
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Tarea rechazada exitosamente",
    });
  } catch (error: any) {
    console.error("Error en POST /api/tareas/[id]/rechazar:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: error.message || "Error al rechazar tarea" },
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

// Función auxiliar para verificar si el usuario puede realizar acciones sobre la tarea
async function verificarPuedeRealizarAccion(userId: number, tarea: any): Promise<boolean> {
  // Si la tarea está Tomada, solo quien la tomó puede realizar acciones
  if (tarea.Estado === 'Tomada') {
    return tarea.UsuarioTomadaPorId === userId;
  }

  // Si la tarea está Pendiente y es asignación directa a usuario, solo ese usuario puede actuar
  if (tarea.Estado === 'Pendiente' && tarea.TipoAsignacion === 'Usuario') {
    return tarea.UsuarioAsignadoId === userId;
  }

  // Para otros casos (ej. Pendiente en Bandeja), cualquiera con acceso puede actuar
  return true;
}
