import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { getUserFromRequest, registrarTraza } from "@/lib/auth";

// POST /api/tareas/[id]/reasignar - Reasignar una tarea
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
    const { tipoAsignacion, usuarioId, bandejaId, observaciones } = body;

    // Validar tipo de asignación
    if (!tipoAsignacion || !["Usuario", "Bandeja"].includes(tipoAsignacion)) {
      return NextResponse.json(
        { success: false, message: "Tipo de asignación inválido" },
        { status: 400 }
      );
    }

    // Validar que se proporcione el ID correspondiente
    if (tipoAsignacion === "Usuario" && !usuarioId) {
      return NextResponse.json(
        { success: false, message: "Debe especificar un usuario" },
        { status: 400 }
      );
    }

    if (tipoAsignacion === "Bandeja" && !bandejaId) {
      return NextResponse.json(
        { success: false, message: "Debe especificar una bandeja" },
        { status: 400 }
      );
    }

    // Obtener información completa de la tarea con nombres de origen
    const tareaResult = await query(
      `SELECT 
        t.Id as TareaId, 
        t.UsuarioCreacion, 
        t.Estado,
        t.TipoAsignacion as TipoAsignacionActual,
        t.UsuarioAsignadoId,
        t.BandejaAsignadaId,
        u.Nombre as UsuarioOrigenNombre,
        b.Nombre as BandejaOrigenNombre
      FROM TD_TAREAS t
      LEFT JOIN TD_USUARIOS u ON t.UsuarioAsignadoId = u.Id
      LEFT JOIN TD_BANDEJAS b ON t.BandejaAsignadaId = b.Id
      WHERE t.Id = @tareaId`,
      { tareaId }
    );

    if (tareaResult.length === 0) {
      return NextResponse.json(
        { success: false, message: "Tarea no encontrada" },
        { status: 404 }
      );
    }

    const tarea = tareaResult[0];

    // Verificar permisos: solo el creador puede reasignar
    // (En un futuro se podría agregar validación de roles de admin)
    // Por ahora permitimos a cualquiera reasignar
    // if (tarea.UsuarioCreacion !== user.nombre) {
    //   return NextResponse.json(
    //     { success: false, message: "No tienes permisos para reasignar esta tarea" },
    //     { status: 403 }
    //   );
    // }

    // Verificar que la tarea no esté finalizada o rechazada
    if (["Completada", "Rechazada"].includes(tarea.Estado)) {
      return NextResponse.json(
        { success: false, message: "No se puede reasignar una tarea completada o rechazada" },
        { status: 400 }
      );
    }

    // Al reasignar, siempre vuelve a "Pendiente" (salvo que ya esté Pendiente)
    const nuevoEstado = "Pendiente";

    // Construir la actualización según el tipo de asignación
    let updateQuery = "";
    let updateParams: any = { tareaId };

    if (tipoAsignacion === "Usuario") {
      // Verificar que el usuario existe
      const usuarioExists = await query(
        `SELECT Id FROM TD_USUARIOS WHERE Id = @usuarioId`,
        { usuarioId }
      );

      if (usuarioExists.length === 0) {
        return NextResponse.json(
          { success: false, message: "Usuario no encontrado o inactivo" },
          { status: 404 }
        );
      }

      updateQuery = `
        UPDATE TD_TAREAS
        SET TipoAsignacion = 'Usuario',
            UsuarioAsignadoId = @usuarioId,
            BandejaAsignadaId = NULL,
            Estado = @nuevoEstado,
            UsuarioTomadaPorId = NULL,
            FechaTomada = NULL,
            Observaciones = @observaciones
        WHERE Id = @tareaId
      `;
      updateParams = { 
        tareaId, 
        usuarioId, 
        nuevoEstado,
        observaciones: observaciones || tarea.Observaciones 
      };
    } else {
      // Verificar que la bandeja existe
      const bandejaExists = await query(
        `SELECT Id FROM TD_BANDEJAS WHERE Id = @bandejaId AND Estado = 'Activa'`,
        { bandejaId }
      );

      if (bandejaExists.length === 0) {
        return NextResponse.json(
          { success: false, message: "Bandeja no encontrada o inactiva" },
          { status: 404 }
        );
      }

      updateQuery = `
        UPDATE TD_TAREAS
        SET TipoAsignacion = 'Bandeja',
            UsuarioAsignadoId = NULL,
            BandejaAsignadaId = @bandejaId,
            Estado = @nuevoEstado,
            UsuarioTomadaPorId = NULL,
            FechaTomada = NULL,
            Observaciones = @observaciones
        WHERE Id = @tareaId
      `;
      updateParams = { 
        tareaId, 
        bandejaId, 
        nuevoEstado,
        observaciones: observaciones || tarea.Observaciones 
      };
    }

    // Ejecutar la actualización
    await execute(updateQuery, updateParams);

    // Obtener nombre del nuevo asignado
    let nombreDestinatario = "";
    if (tipoAsignacion === "Usuario") {
      const usuario = await query(
        `SELECT Nombre FROM TD_USUARIOS WHERE Id = @usuarioId`,
        { usuarioId }
      );
      nombreDestinatario = usuario[0]?.Nombre || "Usuario";
    } else {
      const bandeja = await query(
        `SELECT Nombre FROM TD_BANDEJAS WHERE Id = @bandejaId`,
        { bandejaId }
      );
      nombreDestinatario = bandeja[0]?.Nombre || "Bandeja";
    }

    // Construir detalle del historial con origen y destino
    const origenTipo = tarea.TipoAsignacionActual;
    const origenNombre = origenTipo === 'Usuario' 
      ? (tarea.UsuarioOrigenNombre || 'Usuario desconocido')
      : (tarea.BandejaOrigenNombre || 'Bandeja desconocida');
    
    const detalleHistorial = `Reasignada de ${origenTipo}: ${origenNombre} → a ${tipoAsignacion}: ${nombreDestinatario}`;
    
    await execute(
      `INSERT INTO TD_TAREA_HISTORIAL (TareaId, UsuarioId, Usuario, Accion, Detalle, FechaHora)
       VALUES (@tareaId, @usuarioId, @usuario, 'Reasignar', @detalle, GETDATE())`,
      {
        tareaId,
        usuarioId: user.userId,
        usuario: user.usuario,
        detalle: detalleHistorial,
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
      'Reasignar',
      'Tareas',
      `Tarea reasignada - Plantilla: "${tareaInfo[0]?.PlantillaNombre || 'Desconocida'}" - ${detalleHistorial}`
    );

    return NextResponse.json({
      success: true,
      message: "Tarea reasignada exitosamente",
    });
  } catch (error: any) {
    console.error("Error al reasignar tarea:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}
