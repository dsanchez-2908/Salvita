import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

// GET /api/tareas/[id] - Obtener detalle de una tarea
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

    // Obtener información completa de la tarea
    const tareas = await query(
      `
      SELECT 
        t.*,
        pt.Nombre as PlantillaNombre,
        pt.Indicaciones as Instrucciones,
        uAsignado.Nombre as UsuarioAsignadoNombre,
        b.Nombre as BandejaAsignadaNombre,
        b.Descripcion as BandejaDescripcion,
        uTomo.Nombre as TomoNombre
      FROM TD_TAREAS t
      INNER JOIN TD_PLANTILLA_TAREAS pt ON t.PlantillaTareaId = pt.Id
      LEFT JOIN TD_USUARIOS uAsignado ON t.UsuarioAsignadoId = uAsignado.Id
      LEFT JOIN TD_BANDEJAS b ON t.BandejaAsignadaId = b.Id
      LEFT JOIN TD_USUARIOS uTomo ON t.UsuarioTomadaPorId = uTomo.Id
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

    // Verificar acceso: debe estar asignada al usuario o a una bandeja del usuario
    const tieneAcceso = await verificarAccesoTarea(user.userId, tarea);
    if (!tieneAcceso) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "No tienes acceso a esta tarea" },
        { status: 403 }
      );
    }

    // Obtener registros asociados con información del módulo y sus estados
    const registros = await query(
      `
      SELECT 
        tr.Id as TareaRegistroId,
        tr.RegistroId,
        tr.ModuloId,
        tr.Estado,
        tr.Observaciones as ObservacionesRegistro,
        m.Nombre as ModuloNombre,
        m.NombreTabla as ModuloNombreTabla
      FROM TR_TAREA_REGISTRO tr
      INNER JOIN TD_MODULOS m ON tr.ModuloId = m.Id
      WHERE tr.TareaId = @tareaId
      `,
      { tareaId }
    );

    // Si hay registros, cargar campos del módulo y datos
    let camposModulo: any[] = [];
    let datosRegistros: any[] = [];
    let valoresListas: any[] = [];

    if (registros.length > 0) {
      const moduloId = registros[0].ModuloId;
      const nombreTabla = registros[0].ModuloNombreTabla;
      const registroIds = registros.map((r: any) => r.RegistroId);

      // Cargar campos del módulo (solo visibles en grilla)
      camposModulo = await query(
        `SELECT c.* 
         FROM TD_CAMPOS c
         WHERE c.ModuloId = @moduloId AND c.VisibleEnGrilla = 1
         ORDER BY c.Orden`,
        { moduloId }
      );

      // Cargar datos reales de los registros
      if (registroIds.length > 0) {
        const idsString = registroIds.join(',');
        const sqlDatos = `SELECT * FROM ${nombreTabla} WHERE Id IN (${idsString})`;
        datosRegistros = await query(sqlDatos, {});
      }

      // Cargar valores de listas
      const listasIds = camposModulo
        .filter((c: any) => c.TipoDato === 'Lista' && c.ListaId)
        .map((c: any) => c.ListaId);

      if (listasIds.length > 0) {
        const uniqueListasIds = Array.from(new Set(listasIds));
        const idsListaString = uniqueListasIds.join(',');
        valoresListas = await query(
          `SELECT lv.*, l.Nombre as ListaNombre
           FROM TD_VALORES_LISTA lv
           INNER JOIN TD_LISTAS l ON lv.ListaId = l.Id
           WHERE lv.ListaId IN (${idsListaString})
           ORDER BY lv.ListaId, lv.Orden`,
          {}
        );
      }
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        tarea,
        registros,
        camposModulo,
        datosRegistros,
        valoresListas,
      },
    });
  } catch (error: any) {
    console.error("Error en GET /api/tareas/[id]:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: error.message || "Error al obtener tarea" },
      { status: 500 }
    );
  }
}

async function verificarAccesoTarea(userId: number, tarea: any): Promise<boolean> {
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
