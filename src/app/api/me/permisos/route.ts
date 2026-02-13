import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { ApiResponse } from '@/types';

// GET - Obtener permisos efectivos del usuario actual
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Verificar si es administrador (tiene todos los permisos)
    const adminCheck = await query(
      `SELECT COUNT(*) as EsAdmin
       FROM TD_USUARIOS u
       INNER JOIN TR_USUARIO_ROL ur ON u.Id = ur.UsuarioId
       INNER JOIN TD_ROLES r ON ur.RolId = r.Id
       WHERE u.Id = @userId 
         AND r.Nombre = 'Administrador' 
         AND r.Estado = 'Activo'`,
      { userId: user.userId }
    );

    const esAdmin = adminCheck[0]?.EsAdmin > 0;

    // Obtener permisos del usuario
    const permisos = await query(
      `SELECT DISTINCT
        rp.ModuloPadreId,
        rp.ModuloId,
        m.Nombre as ModuloNombre,
        mp.Nombre as ModuloPadreNombre,
        MAX(CAST(rp.PermisoVer as int)) as PermisoVer,
        MAX(CAST(rp.PermisoVerAgrupado as int)) as PermisoVerAgrupado,
        MAX(CAST(rp.PermisoVerRelacionado as int)) as PermisoVerRelacionado,
        MAX(CAST(rp.PermisoAgregar as int)) as PermisoAgregar,
        MAX(CAST(rp.PermisoModificar as int)) as PermisoModificar,
        MAX(CAST(rp.PermisoEliminar as int)) as PermisoEliminar
      FROM TD_USUARIOS u
      INNER JOIN TR_USUARIO_ROL ur ON u.Id = ur.UsuarioId
      INNER JOIN TD_ROLES r ON ur.RolId = r.Id AND r.Estado = 'Activo'
      INNER JOIN TR_ROL_MODULO_PERMISO rp ON r.Id = rp.RolId
      INNER JOIN TD_MODULOS m ON rp.ModuloId = m.Id
      LEFT JOIN TD_MODULOS mp ON rp.ModuloPadreId = mp.Id
      WHERE u.Id = @userId
      GROUP BY rp.ModuloPadreId, rp.ModuloId, m.Nombre, mp.Nombre`,
      { userId: user.userId }
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        esAdmin,
        permisos: permisos.map(p => ({
          moduloPadreId: p.ModuloPadreId,
          moduloId: p.ModuloId,
          moduloNombre: p.ModuloNombre,
          moduloPadreNombre: p.ModuloPadreNombre,
          permisoVer: p.PermisoVer === 1,
          permisoVerAgrupado: p.PermisoVerAgrupado === 1,
          permisoVerRelacionado: p.PermisoVerRelacionado === 1,
          permisoAgregar: p.PermisoAgregar === 1,
          permisoModificar: p.PermisoModificar === 1,
          permisoEliminar: p.PermisoEliminar === 1,
        }))
      },
    });
  } catch (error: any) {
    console.error('Error obteniendo permisos del usuario:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: error.message || 'Error al obtener permisos' },
      { status: 500 }
    );
  }
}
