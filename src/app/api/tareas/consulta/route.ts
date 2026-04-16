import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// GET /api/tareas/consulta - Consulta avanzada de tareas con filtros para supervisores
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "No autorizado" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    
    // Obtener parámetros de búsqueda
    const tareaId = searchParams.get("tareaId");
    const plantillaId = searchParams.get("plantillaId");
    const estado = searchParams.get("estado");
    const fechaAltaDesde = searchParams.get("fechaAltaDesde");
    const fechaAltaHasta = searchParams.get("fechaAltaHasta");
    const fechaFinalizacionDesde = searchParams.get("fechaFinalizacionDesde");
    const fechaFinalizacionHasta = searchParams.get("fechaFinalizacionHasta");
    const vencida = searchParams.get("vencida"); // "SI" | "NO"
    const usuarioCreacionId = searchParams.get("usuarioCreacionId");
    const usuarioFinalizacionId = searchParams.get("usuarioFinalizacionId");

    // Construir la consulta SQL dinámica
    let whereClauses: string[] = [];
    let params: any = {};

    if (tareaId) {
      whereClauses.push("t.Id = @tareaId");
      params.tareaId = parseInt(tareaId);
    }

    if (plantillaId) {
      whereClauses.push("t.PlantillaTareaId = @plantillaId");
      params.plantillaId = parseInt(plantillaId);
    }

    if (estado) {
      whereClauses.push("t.Estado = @estado");
      params.estado = estado;
    }

    if (fechaAltaDesde) {
      whereClauses.push("CAST(t.FechaCreacion AS DATE) >= @fechaAltaDesde");
      params.fechaAltaDesde = fechaAltaDesde;
    }

    if (fechaAltaHasta) {
      whereClauses.push("CAST(t.FechaCreacion AS DATE) <= @fechaAltaHasta");
      params.fechaAltaHasta = fechaAltaHasta;
    }

    if (fechaFinalizacionDesde) {
      whereClauses.push("CAST(COALESCE(t.FechaCompletado, t.FechaRechazo) AS DATE) >= @fechaFinalizacionDesde");
      params.fechaFinalizacionDesde = fechaFinalizacionDesde;
    }

    if (fechaFinalizacionHasta) {
      whereClauses.push("CAST(COALESCE(t.FechaCompletado, t.FechaRechazo) AS DATE) <= @fechaFinalizacionHasta");
      params.fechaFinalizacionHasta = fechaFinalizacionHasta;
    }

    if (usuarioCreacionId) {
      whereClauses.push("t.CreadoPor = @usuarioCreacionId");
      params.usuarioCreacionId = parseInt(usuarioCreacionId);
    }

    if (usuarioFinalizacionId) {
      // Buscar en historial quién finalizó la tarea
      whereClauses.push(`EXISTS (
        SELECT 1 FROM TD_TAREA_HISTORIAL h
        WHERE h.TareaId = t.Id 
        AND h.Accion = 'Finalizar' 
        AND h.UsuarioId = @usuarioFinalizacionId
      )`);
      params.usuarioFinalizacionId = parseInt(usuarioFinalizacionId);
    }

    // Filtro de vencidas (calculado en SQL)
    if (vencida === "SI") {
      whereClauses.push(`(
        (t.Estado NOT IN ('Completada', 'Rechazada') AND t.FechaVencimiento IS NOT NULL AND t.FechaVencimiento < GETDATE())
        OR
        (t.Estado IN ('Completada', 'Rechazada') AND t.FechaVencimiento IS NOT NULL AND COALESCE(t.FechaCompletado, t.FechaRechazo) > t.FechaVencimiento)
      )`);
    } else if (vencida === "NO") {
      whereClauses.push(`(
        (t.FechaVencimiento IS NULL)
        OR
        (t.Estado NOT IN ('Completada', 'Rechazada') AND t.FechaVencimiento >= GETDATE())
        OR
        (t.Estado IN ('Completada', 'Rechazada') AND COALESCE(t.FechaCompletado, t.FechaRechazo) <= t.FechaVencimiento)
      )`);
    }

    const whereClause = whereClauses.length > 0 
      ? "WHERE " + whereClauses.join(" AND ")
      : "";

    const sql = `
      SELECT 
        t.Id as TareaId,
        t.Estado,
        t.TipoAsignacion,
        t.PlantillaTareaId,
        pt.Nombre as PlantillaNombre,
        t.FechaCreacion,
        t.FechaVencimiento,
        COALESCE(t.FechaCompletado, t.FechaRechazo) as FechaFinalizacion,
        t.FechaCompletado,
        t.FechaRechazo,
        t.UsuarioCreacion,
        t.CreadoPor as UsuarioCreacionId,
        uCreacion.Nombre as UsuarioCreacionNombre,
        -- Usuario que finalizó (obtenido del historial)
        (SELECT TOP 1 h.UsuarioId 
         FROM TD_TAREA_HISTORIAL h 
         WHERE h.TareaId = t.Id AND h.Accion = 'Finalizar'
         ORDER BY h.FechaHora DESC) as UsuarioFinalizacionId,
        (SELECT TOP 1 h.Usuario 
         FROM TD_TAREA_HISTORIAL h 
         WHERE h.TareaId = t.Id AND h.Accion = 'Finalizar'
         ORDER BY h.FechaHora DESC) as UsuarioFinalizacionNombre,
        -- Asignación actual
        CASE 
          WHEN t.TipoAsignacion = 'Usuario' THEN uAsignado.Nombre
          WHEN t.TipoAsignacion = 'Bandeja' THEN b.Nombre
          ELSE NULL
        END as AsignacionActual,
        -- Cantidad de registros
        (SELECT COUNT(*) FROM TR_TAREA_REGISTRO WHERE TareaId = t.Id) as TotalRegistros,
        -- Indicador de vencida
        CASE 
          WHEN t.Estado NOT IN ('Completada', 'Rechazada') AND t.FechaVencimiento IS NOT NULL AND t.FechaVencimiento < GETDATE() THEN 1
          WHEN t.Estado IN ('Completada', 'Rechazada') AND t.FechaVencimiento IS NOT NULL AND COALESCE(t.FechaCompletado, t.FechaRechazo) > t.FechaVencimiento THEN 1
          ELSE 0
        END as EsVencida
      FROM TD_TAREAS t
      INNER JOIN TD_PLANTILLA_TAREAS pt ON t.PlantillaTareaId = pt.Id
      LEFT JOIN TD_USUARIOS uCreacion ON t.CreadoPor = uCreacion.Id
      LEFT JOIN TD_USUARIOS uAsignado ON t.UsuarioAsignadoId = uAsignado.Id
      LEFT JOIN TD_BANDEJAS b ON t.BandejaAsignadaId = b.Id
      ${whereClause}
      ORDER BY t.FechaCreacion DESC
    `;

    const tareas = await query(sql, params);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: tareas,
    });
  } catch (error: any) {
    console.error("Error en GET /api/tareas/consulta:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: error.message || "Error al consultar tareas" },
      { status: 500 }
    );
  }
}
