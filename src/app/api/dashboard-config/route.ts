import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { getUserFromRequest, registrarTraza } from '@/lib/auth';
import { ApiResponse } from '@/types';

// GET - Obtener configuración del dashboard
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
    const rolId = searchParams.get('rolId');

    if (rolId) {
      // Obtener configuración de un rol específico
      const config = await query(
        `SELECT 
          dc.*,
          m.Nombre as ModuloNombre,
          m.Tipo as ModuloTipo
         FROM TD_DASHBOARD_CONFIG dc
         INNER JOIN TD_MODULOS m ON dc.ModuloId = m.Id
         WHERE dc.RolId = @rolId
         ORDER BY dc.Orden`,
        { rolId: parseInt(rolId) }
      );

      return NextResponse.json<ApiResponse>({
        success: true,
        data: config,
      });
    } else {
      // Obtener configuración de los roles del usuario actual
      const config = await query(
        `SELECT DISTINCT
          dc.*,
          m.Nombre as ModuloNombre,
          m.Tipo as ModuloTipo
         FROM TD_DASHBOARD_CONFIG dc
         INNER JOIN TD_MODULOS m ON dc.ModuloId = m.Id
         INNER JOIN TR_USUARIO_ROL ur ON dc.RolId = ur.RolId
         WHERE ur.UsuarioId = @userId
         ORDER BY dc.Orden`,
        { userId: user.userId }
      );

      return NextResponse.json<ApiResponse>({
        success: true,
        data: config,
      });
    }
  } catch (error: any) {
    console.error('Error obteniendo configuración del dashboard:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error en el servidor' },
      { status: 500 }
    );
  }
}

// POST - Guardar configuración del dashboard
export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Verificar si es administrador
    const isAdmin = user.roles.includes('Administrador');
    if (!isAdmin) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No tiene permisos para configurar dashboards' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { RolId, Configuraciones } = body;

    if (!RolId || !Configuraciones || !Array.isArray(Configuraciones)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Datos inválidos' },
        { status: 400 }
      );
    }

    // Eliminar configuración anterior del rol
    await execute(
      'DELETE FROM TD_DASHBOARD_CONFIG WHERE RolId = @rolId',
      { rolId: RolId }
    );

    // Insertar nuevas configuraciones
    for (let i = 0; i < Configuraciones.length; i++) {
      const config = Configuraciones[i];
      
      await execute(
        `INSERT INTO TD_DASHBOARD_CONFIG 
         (RolId, ModuloId, TipoVisualizacion, CampoAgrupamiento, CampoFiltro, ValorFiltro, Orden, UsuarioCreacion)
         VALUES (@rolId, @moduloId, @tipoVisualizacion, @campoAgrupamiento, @campoFiltro, @valorFiltro, @orden, @usuarioCreacion)`,
        {
          rolId: RolId,
          moduloId: config.ModuloId,
          tipoVisualizacion: config.TipoVisualizacion,
          campoAgrupamiento: config.CampoAgrupamiento || null,
          campoFiltro: config.CampoFiltro || null,
          valorFiltro: config.ValorFiltro || null,
          orden: i,
          usuarioCreacion: user.usuario,
        }
      );
    }

    // Registrar traza
    await registrarTraza(
      user.userId,
      'Modificar',
      'Dashboard',
      `Configuración de dashboard actualizada para rol ID: ${RolId}. ${Configuraciones.length} widgets configurados`
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Configuración guardada exitosamente',
    });
  } catch (error: any) {
    console.error('Error guardando configuración del dashboard:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error en el servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar configuración del dashboard de un rol
export async function DELETE(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Verificar si es administrador
    const isAdmin = user.roles.includes('Administrador');
    if (!isAdmin) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No tiene permisos para eliminar configuración de dashboards' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const rolId = searchParams.get('rolId');

    if (!rolId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'ID de rol requerido' },
        { status: 400 }
      );
    }

    await execute(
      'DELETE FROM TD_DASHBOARD_CONFIG WHERE RolId = @rolId',
      { rolId: parseInt(rolId) }
    );

    // Registrar traza
    await registrarTraza(
      user.userId,
      'Eliminar',
      'Dashboard',
      `Configuración de dashboard eliminada para rol ID: ${rolId}`
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Configuración eliminada exitosamente',
    });
  } catch (error: any) {
    console.error('Error eliminando configuración del dashboard:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error en el servidor' },
      { status: 500 }
    );
  }
}
