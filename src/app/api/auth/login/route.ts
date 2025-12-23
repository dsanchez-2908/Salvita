import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyPassword, generateToken } from '@/lib/auth';
import { LoginRequest, LoginResponse, ApiResponse, Usuario } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json();
    const { usuario, clave } = body;

    if (!usuario || !clave) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Usuario y contraseña son requeridos',
        },
        { status: 400 }
      );
    }

    // Buscar usuario (sin filtrar por estado primero)
    const usuarios = await query<Usuario>(
      `SELECT u.*, r.Nombre as RolNombre
       FROM TD_USUARIOS u
       LEFT JOIN TR_USUARIO_ROL ur ON u.Id = ur.UsuarioId
       LEFT JOIN TD_ROLES r ON ur.RolId = r.Id
       WHERE u.Usuario = @usuario`,
      { usuario }
    );

    if (usuarios.length === 0) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Credenciales inválidas',
        },
        { status: 401 }
      );
    }

    const user = usuarios[0];

    // Verificar si el usuario está inactivo
    if (user.Estado !== 'Activo') {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Usuario inactivo. Contacte al administrador del sistema.',
        },
        { status: 403 }
      );
    }

    // Verificar contraseña
    const isValidPassword = await verifyPassword(clave, user.Clave || '');
    if (!isValidPassword) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: 'Credenciales inválidas',
        },
        { status: 401 }
      );
    }

    // Obtener roles del usuario
    const roles = usuarios
      .map((u: any) => u.RolNombre)
      .filter((r: string) => r);

    // Obtener permisos detallados del usuario
    const permisos = await query(
      `SELECT 
        m.Id as ModuloId,
        m.Nombre as ModuloNombre,
        MAX(CAST(rp.PermisoVer as int)) as PermisoVer,
        MAX(CAST(rp.PermisoVerAgrupado as int)) as PermisoVerAgrupado,
        MAX(CAST(rp.PermisoAgregar as int)) as PermisoAgregar,
        MAX(CAST(rp.PermisoModificar as int)) as PermisoModificar,
        MAX(CAST(rp.PermisoEliminar as int)) as PermisoEliminar
      FROM TD_USUARIOS u
      INNER JOIN TR_USUARIO_ROL ur ON u.Id = ur.UsuarioId
      INNER JOIN TD_ROLES r ON ur.RolId = r.Id AND r.Estado = 'Activo'
      INNER JOIN TR_ROL_MODULO_PERMISO rp ON r.Id = rp.RolId
      INNER JOIN TD_MODULOS m ON rp.ModuloId = m.Id
      WHERE u.Id = @userId
      GROUP BY m.Id, m.Nombre`,
      { userId: user.Id }
    );

    // Generar token
    const token = generateToken({
      userId: user.Id,
      usuario: user.Usuario,
      nombre: user.Nombre,
      roles: roles,
    });

    const response: LoginResponse = {
      token,
      usuario: {
        Id: user.Id,
        Nombre: user.Nombre,
        Usuario: user.Usuario,
        Roles: roles,
        Permisos: permisos,
      },
    };

    return NextResponse.json<ApiResponse<LoginResponse>>({
      success: true,
      data: response,
    });
  } catch (error: any) {
    console.error('Error en login:', error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: 'Error en el servidor',
      },
      { status: 500 }
    );
  }
}
