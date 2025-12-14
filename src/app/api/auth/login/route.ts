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

    // Buscar usuario
    const usuarios = await query<Usuario>(
      `SELECT u.*, r.Nombre as RolNombre
       FROM TD_USUARIOS u
       LEFT JOIN TR_USUARIO_ROL ur ON u.Id = ur.UsuarioId
       LEFT JOIN TD_ROLES r ON ur.RolId = r.Id
       WHERE u.Usuario = @usuario AND u.Estado = 'Activo'`,
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
