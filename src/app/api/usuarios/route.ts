import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { getUserFromRequest, hashPassword } from '@/lib/auth';
import { ApiResponse, Usuario, CreateUsuarioRequest, UpdateUsuarioRequest } from '@/types';

// GET - Obtener todos los usuarios o uno específico
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

    if (id) {
      // Obtener un usuario específico con sus roles
      const usuarios = await query<any>(
        `SELECT u.*, r.Id as RolId, r.Nombre as RolNombre
         FROM TD_USUARIOS u
         LEFT JOIN TR_USUARIO_ROL ur ON u.Id = ur.UsuarioId
         LEFT JOIN TD_ROLES r ON ur.RolId = r.Id
         WHERE u.Id = @id`,
        { id: parseInt(id) }
      );

      if (usuarios.length === 0) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Usuario no encontrado' },
          { status: 404 }
        );
      }

      const usuario = {
        ...usuarios[0],
        Roles: usuarios
          .filter((u: any) => u.RolId)
          .map((u: any) => ({ Id: u.RolId, Nombre: u.RolNombre })),
      };

      // Eliminar campos de rol individuales
      delete usuario.RolId;
      delete usuario.RolNombre;
      delete usuario.Clave;

      return NextResponse.json<ApiResponse>({
        success: true,
        data: usuario,
      });
    }

    // Obtener todos los usuarios
    const usuarios = await query<any>(
      `SELECT u.Id, u.Nombre, u.Usuario, u.Estado, u.FechaAlta, u.FechaModificacion,
              STRING_AGG(r.Nombre, ', ') as Roles
       FROM TD_USUARIOS u
       LEFT JOIN TR_USUARIO_ROL ur ON u.Id = ur.UsuarioId
       LEFT JOIN TD_ROLES r ON ur.RolId = r.Id
       GROUP BY u.Id, u.Nombre, u.Usuario, u.Estado, u.FechaAlta, u.FechaModificacion
       ORDER BY u.Id DESC`
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: usuarios,
    });
  } catch (error: any) {
    console.error('Error obteniendo usuarios:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error en el servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear usuario
export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const body: CreateUsuarioRequest = await request.json();
    const { Nombre, Usuario: usuarioNombre, Clave, Roles } = body;

    if (!Nombre || !usuarioNombre || !Clave) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Nombre, usuario y clave son requeridos' },
        { status: 400 }
      );
    }

    // Verificar si el usuario ya existe
    const existente = await query(
      'SELECT Id FROM TD_USUARIOS WHERE Usuario = @usuario',
      { usuario: usuarioNombre }
    );

    if (existente.length > 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'El usuario ya existe' },
        { status: 400 }
      );
    }

    // Hashear contraseña
    const hashedPassword = await hashPassword(Clave);

    // Insertar usuario
    const result = await execute(
      `INSERT INTO TD_USUARIOS (Nombre, Usuario, Clave, UsuarioCreacion)
       OUTPUT INSERTED.Id
       VALUES (@nombre, @usuario, @clave, @usuarioCreacion)`,
      {
        nombre: Nombre,
        usuario: usuarioNombre,
        clave: hashedPassword,
        usuarioCreacion: user.usuario,
      }
    );

    const nuevoUsuarioId = result.recordset[0].Id;

    // Asignar roles
    if (Roles && Roles.length > 0) {
      for (const rolId of Roles) {
        await execute(
          `INSERT INTO TR_USUARIO_ROL (UsuarioId, RolId, UsuarioAsignacion)
           VALUES (@usuarioId, @rolId, @usuarioAsignacion)`,
          {
            usuarioId: nuevoUsuarioId,
            rolId: rolId,
            usuarioAsignacion: user.usuario,
          }
        );
      }
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { Id: nuevoUsuarioId },
      message: 'Usuario creado exitosamente',
    });
  } catch (error: any) {
    console.error('Error creando usuario:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error en el servidor' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar usuario
export async function PUT(request: NextRequest) {
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
        { success: false, error: 'ID de usuario requerido' },
        { status: 400 }
      );
    }

    const body: UpdateUsuarioRequest = await request.json();
    const { Nombre, Usuario: usuarioNombre, Estado, Roles } = body;

    // Actualizar datos básicos del usuario
    let updateQuery = 'UPDATE TD_USUARIOS SET FechaModificacion = GETDATE(), UsuarioModificacion = @usuarioModificacion';
    const params: any = {
      id: parseInt(id),
      usuarioModificacion: user.usuario,
    };

    if (Nombre) {
      updateQuery += ', Nombre = @nombre';
      params.nombre = Nombre;
    }
    if (usuarioNombre) {
      updateQuery += ', Usuario = @usuario';
      params.usuario = usuarioNombre;
    }
    if (Estado) {
      updateQuery += ', Estado = @estado';
      params.estado = Estado;
    }

    updateQuery += ' WHERE Id = @id';

    await execute(updateQuery, params);

    // Actualizar roles si se proporcionan
    if (Roles) {
      // Eliminar roles existentes
      await execute(
        'DELETE FROM TR_USUARIO_ROL WHERE UsuarioId = @usuarioId',
        { usuarioId: parseInt(id) }
      );

      // Asignar nuevos roles
      for (const rolId of Roles) {
        await execute(
          `INSERT INTO TR_USUARIO_ROL (UsuarioId, RolId, UsuarioAsignacion)
           VALUES (@usuarioId, @rolId, @usuarioAsignacion)`,
          {
            usuarioId: parseInt(id),
            rolId: rolId,
            usuarioAsignacion: user.usuario,
          }
        );
      }
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Usuario actualizado exitosamente',
    });
  } catch (error: any) {
    console.error('Error actualizando usuario:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error en el servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar usuario
export async function DELETE(request: NextRequest) {
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
        { success: false, error: 'ID de usuario requerido' },
        { status: 400 }
      );
    }

    // No permitir eliminar al usuario actual
    if (parseInt(id) === user.userId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No puedes eliminar tu propio usuario' },
        { status: 400 }
      );
    }

    await execute('DELETE FROM TD_USUARIOS WHERE Id = @id', {
      id: parseInt(id),
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Usuario eliminado exitosamente',
    });
  } catch (error: any) {
    console.error('Error eliminando usuario:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error en el servidor' },
      { status: 500 }
    );
  }
}
