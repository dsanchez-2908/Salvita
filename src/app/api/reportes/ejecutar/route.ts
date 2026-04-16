import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { ApiResponse } from '@/types';

// GET - Ejecutar reporte dinámicamente
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
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'ID del reporte es requerido' },
        { status: 400 }
      );
    }

    // Obtener el reporte
    const reporteData = await query(
      'SELECT * FROM TD_REPORTES WHERE Id = @id AND Estado = @estado',
      { id: parseInt(id), estado: 'Activo' }
    );

    if (reporteData.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Reporte no encontrado o inactivo' },
        { status: 404 }
      );
    }

    const reporte = reporteData[0];

    // Verificar que el usuario tenga acceso a este reporte
    const isAdmin = user.roles?.includes('Administrador');
    
    if (!isAdmin) {
      const acceso = await query(
        `SELECT COUNT(*) as Count 
         FROM TR_ROL_REPORTE rr
         INNER JOIN TR_USUARIO_ROL ur ON rr.RolId = ur.RolId
         WHERE ur.UsuarioId = @usuarioId 
         AND rr.ReporteId = @reporteId`,
        { usuarioId: user.userId, reporteId: parseInt(id) }
      );

      if (acceso[0].Count === 0) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'No tiene permisos para acceder a este reporte' },
          { status: 403 }
        );
      }
    }

    // Ejecutar el reporte según su tipo
    let resultados: any[] = [];

    if (reporte.Tipo === 'Query') {
      if (!reporte.Query) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'El reporte no tiene una query definida' },
          { status: 400 }
        );
      }

      // Ejecutar la query
      try {
        resultados = await query(reporte.Query);
      } catch (queryError: any) {
        console.error('Error ejecutando query del reporte:', queryError);
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Error ejecutando la query del reporte: ' + queryError.message },
          { status: 500 }
        );
      }
    } else if (reporte.Tipo === 'StoreProcedure') {
      // Implementación futura para stored procedures
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Tipo StoreProcedure aún no implementado' },
        { status: 501 }
      );
    } else if (reporte.Tipo === 'API') {
      // Implementación futura para APIs
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Tipo API aún no implementado' },
        { status: 501 }
      );
    }

    // Obtener los nombres de las columnas (del primer resultado si existe)
    let columnas: string[] = [];
    if (resultados.length > 0) {
      columnas = Object.keys(resultados[0]);
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        reporte: {
          Id: reporte.Id,
          Nombre: reporte.Nombre,
          Tipo: reporte.Tipo,
          Descripcion: reporte.Descripcion,
        },
        columnas,
        resultados,
      },
    });
  } catch (error: any) {
    console.error('Error ejecutando reporte:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error en el servidor' },
      { status: 500 }
    );
  }
}
