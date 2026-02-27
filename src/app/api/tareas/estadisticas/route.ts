import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// GET /api/tareas/estadisticas - Obtener estadísticas de tareas
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
    const fechaInicio = searchParams.get("fechaInicio");
    const fechaFin = searchParams.get("fechaFin");

    // Construir condición de fechas
    let condicionFechas = "";
    const params: any = {};
    
    if (fechaInicio && fechaFin) {
      condicionFechas = "AND t.FechaCreacion BETWEEN @fechaInicio AND @fechaFin";
      params.fechaInicio = fechaInicio;
      params.fechaFin = fechaFin;
    }

    // 1. Estadísticas generales por estado
    const estadisticasGenerales = await query(
      `SELECT 
        COUNT(*) as Total,
        SUM(CASE WHEN Estado = 'Pendiente' THEN 1 ELSE 0 END) as Pendientes,
        SUM(CASE WHEN Estado = 'Tomada' THEN 1 ELSE 0 END) as Tomadas,
        SUM(CASE WHEN Estado = 'Completada' THEN 1 ELSE 0 END) as Completadas,
        SUM(CASE WHEN Estado = 'Rechazada' THEN 1 ELSE 0 END) as Rechazadas,
        SUM(CASE WHEN FechaVencimiento < GETDATE() AND Estado NOT IN ('Completada', 'Rechazada') THEN 1 ELSE 0 END) as Vencidas
       FROM TD_TAREAS t
       WHERE 1=1 ${condicionFechas}`,
      params
    );

    // 2. Tiempo promedio de resolución (en días)
    const tiempoPromedio = await query(
      `SELECT 
        AVG(DATEDIFF(DAY, FechaCreacion, FechaCompletado)) as PromedioCompletadas,
        AVG(DATEDIFF(DAY, FechaCreacion, FechaTomada)) as PromedioTomada
       FROM TD_TAREAS t
       WHERE FechaCompletado IS NOT NULL ${condicionFechas.replace('t.FechaCreacion', 'FechaCreacion')}`,
      params
    );

    // 3. Tareas por usuario (asignadas directamente)
    const tareasPorUsuario = await query(
      `SELECT 
        u.Id as UsuarioId,
        u.Nombre as UsuarioNombre,
        COUNT(*) as TotalTareas,
        SUM(CASE WHEN t.Estado = 'Pendiente' THEN 1 ELSE 0 END) as Pendientes,
        SUM(CASE WHEN t.Estado = 'Tomada' THEN 1 ELSE 0 END) as Tomadas,
        SUM(CASE WHEN t.Estado = 'Completada' THEN 1 ELSE 0 END) as Completadas,
        SUM(CASE WHEN t.Estado = 'Rechazada' THEN 1 ELSE 0 END) as Rechazadas
       FROM TD_TAREAS t
       INNER JOIN TD_USUARIOS u ON t.UsuarioAsignadoId = u.Id
       WHERE t.TipoAsignacion = 'Usuario' ${condicionFechas}
       GROUP BY u.Id, u.Nombre
       ORDER BY TotalTareas DESC`,
      params
    );

    // 4. Tareas por bandeja
    const tareasPorBandeja = await query(
      `SELECT 
        b.Id as BandejaId,
        b.Nombre as BandejaNombre,
        COUNT(*) as TotalTareas,
        SUM(CASE WHEN t.Estado = 'Pendiente' THEN 1 ELSE 0 END) as Pendientes,
        SUM(CASE WHEN t.Estado = 'Tomada' THEN 1 ELSE 0 END) as Tomadas,
        SUM(CASE WHEN t.Estado = 'Completada' THEN 1 ELSE 0 END) as Completadas,
        SUM(CASE WHEN t.Estado = 'Rechazada' THEN 1 ELSE 0 END) as Rechazadas
       FROM TD_TAREAS t
       INNER JOIN TD_BANDEJAS b ON t.BandejaAsignadaId = b.Id
       WHERE t.TipoAsignacion = 'Bandeja' ${condicionFechas}
       GROUP BY b.Id, b.Nombre
       ORDER BY TotalTareas DESC`,
      params
    );

    // 5. Tareas por plantilla
    const tareasPorPlantilla = await query(
      `SELECT 
        pt.Id as PlantillaId,
        pt.Nombre as PlantillaNombre,
        COUNT(*) as TotalTareas,
        SUM(CASE WHEN t.Estado = 'Completada' THEN 1 ELSE 0 END) as Completadas,
        SUM(CASE WHEN t.Estado = 'Rechazada' THEN 1 ELSE 0 END) as Rechazadas
       FROM TD_TAREAS t
       INNER JOIN TD_PLANTILLA_TAREAS pt ON t.PlantillaTareaId = pt.Id
       WHERE 1=1 ${condicionFechas}
       GROUP BY pt.Id, pt.Nombre
       ORDER BY TotalTareas DESC`,
      params
    );

    // 6. Tareas creadas por día (últimos 30 días o rango seleccionado)
    const tareasPorDia = await query(
      `SELECT 
        CONVERT(DATE, FechaCreacion) as Fecha,
        COUNT(*) as Total
       FROM TD_TAREAS
       WHERE FechaCreacion >= DATEADD(DAY, -30, GETDATE()) ${condicionFechas.replace('t.FechaCreacion', 'FechaCreacion')}
       GROUP BY CONVERT(DATE, FechaCreacion)
       ORDER BY Fecha DESC`,
      params
    );

    // 7. Top usuarios que más completan tareas
    const topUsuariosCompletadores = await query(
      `SELECT TOP 10
        u.Id as UsuarioId,
        u.Nombre as UsuarioNombre,
        COUNT(*) as TareasCompletadas,
        AVG(DATEDIFF(HOUR, t.FechaTomada, t.FechaCompletado)) as PromedioHoras
       FROM TD_TAREAS t
       INNER JOIN TD_USUARIOS u ON t.UsuarioTomadaPorId = u.Id
       WHERE t.Estado = 'Completada' 
         AND t.FechaTomada IS NOT NULL 
         AND t.FechaCompletado IS NOT NULL
         ${condicionFechas}
       GROUP BY u.Id, u.Nombre
       ORDER BY TareasCompletadas DESC`,
      params
    );

    // 8. Eficiencia por tipo de asignación
    const eficienciaTipoAsignacion = await query(
      `SELECT 
        TipoAsignacion,
        COUNT(*) as Total,
        SUM(CASE WHEN Estado = 'Completada' THEN 1 ELSE 0 END) as Completadas,
        CAST(SUM(CASE WHEN Estado = 'Completada' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as DECIMAL(5,2)) as PorcentajeExito
       FROM TD_TAREAS t
       WHERE 1=1 ${condicionFechas}
       GROUP BY TipoAsignacion`,
      params
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        general: estadisticasGenerales[0] || {},
        tiempoPromedio: tiempoPromedio[0] || {},
        tareasPorUsuario: tareasPorUsuario || [],
        tareasPorBandeja: tareasPorBandeja || [],
        tareasPorPlantilla: tareasPorPlantilla || [],
        tareasPorDia: tareasPorDia || [],
        topUsuarios: topUsuariosCompletadores || [],
        eficienciaTipoAsignacion: eficienciaTipoAsignacion || [],
      },
    });
  } catch (error: any) {
    console.error("Error en GET /api/tareas/estadisticas:", error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: error.message || "Error al obtener estadísticas",
      },
      { status: 500 }
    );
  }
}
