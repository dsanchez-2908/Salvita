import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { ApiResponse } from '@/types';

// GET - Obtener datos de un widget de tareas
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const tipoVisualizacion = searchParams.get('tipoVisualizacion');
    const categoria = searchParams.get('categoria');

    console.log(`📊 dashboard-task-data: Usuario=${user.usuario}, Tipo=${tipoVisualizacion}, Categoria=${categoria}`);

    if (!tipoVisualizacion || !categoria) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Faltan parámetros requeridos' },
        { status: 400 }
      );
    }

    let data: any = {};

    // PendientesPropios + BandejaPersonal
    // Muestra solo tareas PENDIENTES asignadas directamente al usuario en SU bandeja personal
    if (tipoVisualizacion === 'PendientesPropios' && categoria === 'BandejaPersonal') {
      const result = await query(
        `SELECT 
          COUNT(*) as TotalPendientes,
          SUM(CASE WHEN FechaVencimiento < GETDATE() THEN 1 ELSE 0 END) as TotalVencidas
         FROM TD_TAREAS t
         WHERE t.Estado = 'Pendiente'
         AND t.TipoAsignacion = 'Usuario' 
         AND t.UsuarioAsignadoId = @userId`,
        { userId: user.userId }
      );

      data = result[0];
    }

    // PendientesPropios + BandejasGrupal
    // Muestra cada bandeja grupal del usuario con total pendientes y tomadas por el usuario
    else if (tipoVisualizacion === 'PendientesPropios' && categoria === 'BandejasGrupal') {
      const result = await query(
        `SELECT 
          b.Id as BandejaId,
          b.Nombre as BandejaNombre,
          COUNT(CASE WHEN t.Estado = 'Pendiente' THEN 1 END) as TotalPendientes,
          COUNT(CASE WHEN t.Estado = 'Tomada' AND t.UsuarioTomadaPorId = @userId THEN 1 END) as TotalTomadasPorMi,
          SUM(CASE WHEN t.FechaVencimiento < GETDATE() AND t.Estado = 'Pendiente' THEN 1 ELSE 0 END) as TotalVencidas
         FROM TD_BANDEJAS b
         INNER JOIN TD_TAREAS t ON b.Id = t.BandejaAsignadaId
         WHERE b.Estado = 'Activa'
         AND t.TipoAsignacion = 'Bandeja'
         AND EXISTS (
           SELECT 1 FROM VW_BANDEJAS_POR_USUARIO vb 
           WHERE vb.BandejaId = b.Id 
           AND vb.UsuarioId = @userId
         )
         GROUP BY b.Id, b.Nombre
         HAVING COUNT(CASE WHEN t.Estado IN ('Pendiente', 'Tomada') THEN 1 END) > 0
         ORDER BY b.Nombre`,
        { userId: user.userId }
      );

      data = result;
    }

    // PendientesTotales + BandejaPersonal
    // Lista todos los usuarios con tareas pendientes (directas o en bandejas)
    else if (tipoVisualizacion === 'PendientesTotales' && categoria === 'BandejaPersonal') {
      const result = await query(
        `SELECT 
          u.Id as UsuarioId,
          u.Usuario,
          u.Nombre as NombreCompleto,
          COUNT(*) as TotalPendientes,
          SUM(CASE WHEN t.FechaVencimiento < GETDATE() AND t.Estado NOT IN ('Completada', 'Rechazada') THEN 1 ELSE 0 END) as TotalVencidas
         FROM TD_USUARIOS u
         INNER JOIN TD_TAREAS t ON (
           (t.TipoAsignacion = 'Usuario' AND t.UsuarioAsignadoId = u.Id)
           OR
           (t.TipoAsignacion = 'Bandeja' AND EXISTS (
             SELECT 1 FROM VW_BANDEJAS_POR_USUARIO vb 
             WHERE vb.BandejaId = t.BandejaAsignadaId 
             AND vb.UsuarioId = u.Id
           ))
         )
         WHERE t.Estado IN ('Pendiente', 'Tomada')
         GROUP BY u.Id, u.Usuario, u.Nombre
         HAVING COUNT(*) > 0
         ORDER BY COUNT(*) DESC`,
        {}
      );

      data = result;
    }

    // PendientesTotales + BandejasGrupal
    // Lista todas las bandejas con sus tareas pendientes y tomadas
    else if (tipoVisualizacion === 'PendientesTotales' && categoria === 'BandejasGrupal') {
      const result = await query(
        `SELECT 
          b.Id as BandejaId,
          b.Nombre as BandejaNombre,
          COUNT(*) as TotalPendientes,
          SUM(CASE WHEN t.Estado = 'Tomada' THEN 1 ELSE 0 END) as TotalTomadas,
          SUM(CASE WHEN t.FechaVencimiento < GETDATE() AND t.Estado NOT IN ('Completada', 'Rechazada') THEN 1 ELSE 0 END) as TotalVencidas
         FROM TD_BANDEJAS b
         INNER JOIN TD_TAREAS t ON b.Id = t.BandejaAsignadaId
         WHERE b.Estado = 'Activa'
         AND t.Estado IN ('Pendiente', 'Tomada')
         GROUP BY b.Id, b.Nombre
         HAVING COUNT(*) > 0
         ORDER BY COUNT(*) DESC`,
        {}
      );

      data = result;
    }

    else {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Combinación de parámetros no válida' },
        { status: 400 }
      );
    }

    console.log(`✅ dashboard-task-data: Datos obtenidos:`, data);

    return NextResponse.json<ApiResponse>({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('❌ Error obteniendo datos de tareas:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error en el servidor' },
      { status: 500 }
    );
  }
}
