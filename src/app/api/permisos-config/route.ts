import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { ApiResponse } from '@/types';

// GET - Obtener permisos del menú de configuración del usuario actual
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Obtener los roles del usuario
    const roles = await query(
      `SELECT r.Id, r.Nombre
       FROM TD_ROLES r
       INNER JOIN TR_USUARIO_ROL ur ON r.Id = ur.RolId
       WHERE ur.UsuarioId = @usuarioId AND r.Estado = 'Activo'`,
      { usuarioId: user.userId }
    );

    if (roles.length === 0) {
      // Si no tiene roles, retornar todo deshabilitado
      return NextResponse.json<ApiResponse>({
        success: true,
        data: {
          HabilitarMenuConfig: false,
          PermisosRoles: false,
          PermisosUsuarios: false,
          PermisosListas: false,
          PermisosModulos: false,
          PermisosParametros: false,
          PermisosDashboard: false,
          PermisosParametrosAV: false,
          PermisosReportes: false,
        },
      });
    }

    // Obtener los permisos de configuración para los roles del usuario
    const roleIds = roles.map((r: any) => r.Id);
    const permisos = await query(
      `SELECT 
        MAX(CAST(HabilitarMenuConfig AS INT)) as HabilitarMenuConfig,
        MAX(CAST(PermisosRoles AS INT)) as PermisosRoles,
        MAX(CAST(PermisosUsuarios AS INT)) as PermisosUsuarios,
        MAX(CAST(PermisosListas AS INT)) as PermisosListas,
        MAX(CAST(PermisosModulos AS INT)) as PermisosModulos,
        MAX(CAST(PermisosParametros AS INT)) as PermisosParametros,
        MAX(CAST(PermisosDashboard AS INT)) as PermisosDashboard,
        MAX(CAST(PermisosParametrosAV AS INT)) as PermisosParametrosAV,
        MAX(CAST(ISNULL(PermisosReportes, 0) AS INT)) as PermisosReportes
       FROM TR_ROL_CONFIG_PERMISO
       WHERE RolId IN (${roleIds.join(',')})`,
      {}
    );

    // Si no hay permisos configurados, retornar todo deshabilitado
    if (permisos.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: true,
        data: {
          HabilitarMenuConfig: false,
          PermisosRoles: false,
          PermisosUsuarios: false,
          PermisosListas: false,
          PermisosModulos: false,
          PermisosParametros: false,
          PermisosDashboard: false,
          PermisosParametrosAV: false,
          PermisosReportes: false,
        },
      });
    }

    // Convertir a booleanos
    const permisosData = permisos[0];
    const result = {
      HabilitarMenuConfig: permisosData.HabilitarMenuConfig === 1,
      PermisosRoles: permisosData.PermisosRoles === 1,
      PermisosUsuarios: permisosData.PermisosUsuarios === 1,
      PermisosListas: permisosData.PermisosListas === 1,
      PermisosModulos: permisosData.PermisosModulos === 1,
      PermisosParametros: permisosData.PermisosParametros === 1,
      PermisosDashboard: permisosData.PermisosDashboard === 1,
      PermisosReportes: permisosData.PermisosReportes === 1,
      PermisosParametrosAV: permisosData.PermisosParametrosAV === 1,
    };

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error obteniendo permisos de configuración:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error en el servidor' },
      { status: 500 }
    );
  }
}
