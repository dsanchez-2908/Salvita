import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { getUserFromRequest, registrarTraza } from '@/lib/auth';
import { ApiResponse, CreateRolRequest } from '@/types';

// GET - Obtener roles
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
      // Obtener un rol específico con sus permisos
      const rol = await query(
        'SELECT * FROM TD_ROLES WHERE Id = @id',
        { id: parseInt(id) }
      );

      if (rol.length === 0) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Rol no encontrado' },
          { status: 404 }
        );
      }

      // Obtener permisos del rol
      const permisos = await query(
        `SELECT p.*, m.Nombre as ModuloNombre
         FROM TR_ROL_MODULO_PERMISO p
         INNER JOIN TD_MODULOS m ON p.ModuloId = m.Id
         WHERE p.RolId = @rolId`,
        { rolId: parseInt(id) }
      );

      return NextResponse.json<ApiResponse>({
        success: true,
        data: { ...rol[0], Permisos: permisos },
      });
    }

    // Obtener todos los roles
    const roles = await query(
      'SELECT * FROM TD_ROLES ORDER BY Nombre'
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: roles,
    });
  } catch (error: any) {
    console.error('Error obteniendo roles:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error en el servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear rol
export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const body: CreateRolRequest = await request.json();
    const { Nombre, Descripcion, Permisos } = body;

    if (!Nombre) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Nombre es requerido' },
        { status: 400 }
      );
    }

    // Verificar si el rol ya existe
    const existente = await query(
      'SELECT Id FROM TD_ROLES WHERE Nombre = @nombre',
      { nombre: Nombre }
    );

    if (existente.length > 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'El rol ya existe' },
        { status: 400 }
      );
    }

    // Insertar rol
    const result = await execute(
      `INSERT INTO TD_ROLES (Nombre, Descripcion, UsuarioCreacion)
       OUTPUT INSERTED.Id
       VALUES (@nombre, @descripcion, @usuarioCreacion)`,
      {
        nombre: Nombre,
        descripcion: Descripcion || null,
        usuarioCreacion: user.usuario,
      }
    );

    const nuevoRolId = result.recordset[0].Id;

    // Asignar permisos
    if (Permisos && Permisos.length > 0) {
      for (const permiso of Permisos) {
        await execute(
          `INSERT INTO TR_ROL_MODULO_PERMISO 
           (RolId, ModuloId, PermisoAgregar, PermisoModificar, PermisoEliminar, PermisoVer, PermisoVerAgrupado, UsuarioAsignacion)
           VALUES (@rolId, @moduloId, @agregar, @modificar, @eliminar, @ver, @verAgrupado, @usuarioAsignacion)`,
          {
            rolId: nuevoRolId,
            moduloId: permiso.ModuloId,
            agregar: permiso.PermisoAgregar ? 1 : 0,
            modificar: permiso.PermisoModificar ? 1 : 0,
            eliminar: permiso.PermisoEliminar ? 1 : 0,
            ver: permiso.PermisoVer ? 1 : 0,
            verAgrupado: permiso.PermisoVerAgrupado ? 1 : 0,
            usuarioAsignacion: user.usuario,
          }
        );
      }
    }

    // Registrar traza
    await registrarTraza(
      user.userId,
      'Agregar',
      'Roles',
      `Rol creado: ${Nombre}. Permisos asignados: ${Permisos?.length || 0}`
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { Id: nuevoRolId },
      message: 'Rol creado exitosamente',
    });
  } catch (error: any) {
    console.error('Error creando rol:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error en el servidor' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar rol
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
        { success: false, error: 'ID de rol requerido' },
        { status: 400 }
      );
    }

    const body: any = await request.json();
    const { Nombre, Descripcion, Estado, Permisos } = body;

    // Construir lista de cambios para traza
    const cambios: string[] = [];
    if (Nombre) cambios.push(`Nombre: ${Nombre}`);
    if (Descripcion !== undefined) cambios.push('Descripción');
    if (Estado) cambios.push(`Estado: ${Estado}`);
    if (Permisos) cambios.push('Permisos');

    // Actualizar rol
    let updateQuery = 'UPDATE TD_ROLES SET FechaModificacion = GETDATE(), UsuarioModificacion = @usuarioModificacion';
    const params: any = {
      id: parseInt(id),
      usuarioModificacion: user.usuario,
    };

    if (Nombre) {
      updateQuery += ', Nombre = @nombre';
      params.nombre = Nombre;
    }
    if (Descripcion !== undefined) {
      updateQuery += ', Descripcion = @descripcion';
      params.descripcion = Descripcion;
    }
    if (Estado) {
      updateQuery += ', Estado = @estado';
      params.estado = Estado;
    }

    updateQuery += ' WHERE Id = @id';
    await execute(updateQuery, params);

    // Actualizar permisos si se proporcionan
    if (Permisos) {
      // Eliminar permisos existentes
      await execute(
        'DELETE FROM TR_ROL_MODULO_PERMISO WHERE RolId = @rolId',
        { rolId: parseInt(id) }
      );

      // Asignar nuevos permisos
      for (const permiso of Permisos) {
        await execute(
          `INSERT INTO TR_ROL_MODULO_PERMISO 
           (RolId, ModuloId, PermisoAgregar, PermisoModificar, PermisoEliminar, PermisoVer, PermisoVerAgrupado, UsuarioAsignacion)
           VALUES (@rolId, @moduloId, @agregar, @modificar, @eliminar, @ver, @verAgrupado, @usuarioAsignacion)`,
          {
            rolId: parseInt(id),
            moduloId: permiso.ModuloId,
            agregar: permiso.PermisoAgregar ? 1 : 0,
            modificar: permiso.PermisoModificar ? 1 : 0,
            eliminar: permiso.PermisoEliminar ? 1 : 0,
            ver: permiso.PermisoVer ? 1 : 0,
            verAgrupado: permiso.PermisoVerAgrupado ? 1 : 0,
            usuarioAsignacion: user.usuario,
          }
        );
      }
    }

    // Registrar traza
    await registrarTraza(
      user.userId,
      'Modificar',
      'Roles',
      `Rol modificado (ID: ${id}). Cambios: ${cambios.join(', ')}`
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Rol actualizado exitosamente',
    });
  } catch (error: any) {
    console.error('Error actualizando rol:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error en el servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar rol
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
        { success: false, error: 'ID de rol requerido' },
        { status: 400 }
      );
    }

    // No permitir eliminar el rol Administrador
    const rol = await query(
      'SELECT Nombre FROM TD_ROLES WHERE Id = @id',
      { id: parseInt(id) }
    );

    if (rol[0]?.Nombre === 'Administrador') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No se puede eliminar el rol Administrador' },
        { status: 400 }
      );
    }

    const nombreRol = rol[0]?.Nombre || 'Desconocido';

    await execute('DELETE FROM TD_ROLES WHERE Id = @id', {
      id: parseInt(id),
    });

    // Registrar traza
    await registrarTraza(
      user.userId,
      'Eliminar',
      'Roles',
      `Rol eliminado: ${nombreRol}`
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Rol eliminado exitosamente',
    });
  } catch (error: any) {
    console.error('Error eliminando rol:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error en el servidor' },
      { status: 500 }
    );
  }
}
