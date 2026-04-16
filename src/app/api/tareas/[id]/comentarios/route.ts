import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { getUserFromRequest, registrarTraza } from "@/lib/auth";

// GET /api/tareas/[id]/comentarios - Obtener comentarios de una tarea
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "No autenticado" },
        { status: 401 }
      );
    }

    const tareaId = parseInt(params.id, 10);

    // Verificar que la tarea existe y el usuario tiene acceso
    const tareaResult = await query(
      `SELECT Id FROM TD_TAREAS WHERE Id = @tareaId`,
      { tareaId }
    );

    if (tareaResult.length === 0) {
      return NextResponse.json(
        { success: false, message: "Tarea no encontrada" },
        { status: 404 }
      );
    }

    // Obtener comentarios con información del usuario
    const comentarios = await query(
      `SELECT 
        c.Id as ComentarioId,
        c.TareaId,
        c.UsuarioId,
        u.Nombre as UsuarioNombre,
        c.Comentario,
        c.FechaHora
      FROM TD_TAREA_COMENTARIOS c
      INNER JOIN TD_USUARIOS u ON c.UsuarioId = u.Id
      WHERE c.TareaId = @tareaId
      ORDER BY c.FechaHora DESC`,
      { tareaId }
    );

    return NextResponse.json({
      success: true,
      data: comentarios,
    });
  } catch (error: any) {
    console.error("Error al obtener comentarios:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// POST /api/tareas/[id]/comentarios - Agregar un comentario
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "No autenticado" },
        { status: 401 }
      );
    }

    const tareaId = parseInt(params.id, 10);
    const body = await request.json();
    const { comentario } = body;

    // Validar que el comentario no esté vacío
    if (!comentario || !comentario.trim()) {
      return NextResponse.json(
        { success: false, message: "El comentario no puede estar vacío" },
        { status: 400 }
      );
    }

    // Verificar que la tarea existe y obtener sus datos
    const tareaResult = await query(
      `SELECT * FROM TD_TAREAS WHERE Id = @tareaId`,
      { tareaId }
    );

    if (tareaResult.length === 0) {
      return NextResponse.json(
        { success: false, message: "Tarea no encontrada" },
        { status: 404 }
      );
    }

    const tarea = tareaResult[0];

    // Validar que el usuario puede realizar la acción
    const puedeRealizarAccion = verificarPuedeRealizarAccion(user.userId, tarea);
    if (!puedeRealizarAccion) {
      return NextResponse.json(
        { success: false, message: "Solo el usuario que tomó la tarea puede agregar comentarios" },
        { status: 403 }
      );
    }

    // Insertar el comentario
    const result = await execute(
      `INSERT INTO TD_TAREA_COMENTARIOS (TareaId, UsuarioId, Usuario, Comentario, FechaHora)
       OUTPUT INSERTED.Id as ComentarioId
       VALUES (@tareaId, @usuarioId, @usuario, @comentario, GETDATE())`,
      {
        tareaId,
        usuarioId: user.userId,
        usuario: user.nombre,
        comentario: comentario.trim(),
      }
    );

    // Registrar en historial
    await query(
      `INSERT INTO TD_TAREA_HISTORIAL (TareaId, UsuarioId, Usuario, Accion, Detalle, FechaHora)
       VALUES (@tareaId, @usuarioId, @usuario, 'Comentar', @detalle, GETDATE())`,
      {
        tareaId,
        usuarioId: user.userId,
        usuario: user.nombre,
        detalle: comentario.trim().substring(0, 100) + (comentario.trim().length > 100 ? '...' : ''),
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
      'Comentar',
      'Tareas',
      `Comentario agregado - Plantilla: "${tareaInfo[0]?.PlantillaNombre || 'Desconocida'}" - Comentario: ${comentario.trim().substring(0, 100)}`
    );

    return NextResponse.json({
      success: true,
      message: "Comentario agregado exitosamente",
      data: { ComentarioId: result.recordset[0].ComentarioId },
    });
  } catch (error: any) {
    console.error("Error al agregar comentario:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// Función auxiliar para verificar si el usuario puede realizar acciones sobre la tarea
function verificarPuedeRealizarAccion(userId: number, tarea: any): boolean {
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
