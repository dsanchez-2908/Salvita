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
        `SELECT 
           p.*,
           m.Nombre as ModuloNombre,
           mp.Nombre as ModuloPadreNombre
         FROM TR_ROL_MODULO_PERMISO p
         INNER JOIN TD_MODULOS m ON p.ModuloId = m.Id
         LEFT JOIN TD_MODULOS mp ON p.ModuloPadreId = mp.Id
         WHERE p.RolId = @rolId`,
        { rolId: parseInt(id) }
      );

      // Obtener permisos de tareas
      const permisosTareas = await query(
        `SELECT * FROM TR_ROL_TAREAS_PERMISO WHERE RolId = @rolId`,
        { rolId: parseInt(id) }
      );

      return NextResponse.json<ApiResponse>({
        success: true,
        data: { 
          ...rol[0], 
          Permisos: permisos,
          PermisosTareas: permisosTareas.length > 0 ? permisosTareas[0] : null
        },
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
    const { Nombre, Descripcion, Permisos, AccesoTrazas, PermisosTareas } = body;

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
      `INSERT INTO TD_ROLES (Nombre, Descripcion, AccesoTrazas, UsuarioCreacion)
       OUTPUT INSERTED.Id
       VALUES (@nombre, @descripcion, @accesoTrazas, @usuarioCreacion)`,
      {
        nombre: Nombre,
        descripcion: Descripcion || null,
        accesoTrazas: AccesoTrazas ? 1 : 0,
        usuarioCreacion: user.usuario,
      }
    );

    const nuevoRolId = result.recordset[0].Id;

    // Asignar permisos
    if (Permisos && Permisos.length > 0) {
      for (const permiso of Permisos) {
        await execute(
          `INSERT INTO TR_ROL_MODULO_PERMISO 
           (RolId, ModuloPadreId, ModuloId, PermisoAgregar, PermisoModificar, PermisoEliminar, PermisoVer, PermisoVerAgrupado, PermisoVerRelacionado, UsuarioAsignacion)
           VALUES (@rolId, @moduloPadreId, @moduloId, @agregar, @modificar, @eliminar, @ver, @verAgrupado, @verRelacionado, @usuarioAsignacion)`,
          {
            rolId: nuevoRolId,
            moduloPadreId: permiso.ModuloPadreId || null,
            moduloId: permiso.ModuloId,
            agregar: permiso.PermisoAgregar ? 1 : 0,
            modificar: permiso.PermisoModificar ? 1 : 0,
            eliminar: permiso.PermisoEliminar ? 1 : 0,
            ver: permiso.PermisoVer ? 1 : 0,
            verAgrupado: permiso.PermisoVerAgrupado ? 1 : 0,
            verRelacionado: permiso.PermisoVerRelacionado ? 1 : 0,
            usuarioAsignacion: user.usuario,
          }
        );
      }
    }

    // Asignar permisos de tareas
    if (PermisosTareas) {
      await execute(
        `INSERT INTO TR_ROL_TAREAS_PERMISO 
         (RolId, HabilitarTareas, PuedeCrearTareas, PuedeAdministracionTareas, AdministracionBandejas, PuedeConsultarTareas, PuedeVerMonitorTareas, UsuarioCreacion)
         VALUES (@rolId, @habilitar, @crear, @admin, @bandejas, @consultar, @monitor, @usuario)`,
        {
          rolId: nuevoRolId,
          habilitar: PermisosTareas.HabilitarTareas ? 1 : 0,
          crear: PermisosTareas.PuedeCrearTareas ? 1 : 0,
          admin: PermisosTareas.PuedeAdministracionTareas ? 1 : 0,
          bandejas: PermisosTareas.AdministracionBandejas ? 1 : 0,
          consultar: PermisosTareas.PuedeConsultarTareas ? 1 : 0,
          monitor: PermisosTareas.PuedeVerMonitorTareas ? 1 : 0,
          usuario: user.usuario,
        }
      );
    } else {
      // Si no se proporcionan permisos de tareas, crear con todo deshabilitado
      await execute(
        `INSERT INTO TR_ROL_TAREAS_PERMISO 
         (RolId, HabilitarTareas, PuedeCrearTareas, PuedeAdministracionTareas, AdministracionBandejas, PuedeConsultarTareas, PuedeVerMonitorTareas, UsuarioCreacion)
         VALUES (@rolId, 0, 0, 0, 0, 0, 0, @usuario)`,
        {
          rolId: nuevoRolId,
          usuario: user.usuario,
        }
      );
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
    const { Nombre, Descripcion, Estado, Permisos, AccesoTrazas, PermisosTareas } = body;

    // Construir lista de cambios para traza
    const cambios: string[] = [];
    if (Nombre) cambios.push(`Nombre: ${Nombre}`);
    if (Descripcion !== undefined) cambios.push('Descripción');
    if (Estado) cambios.push(`Estado: ${Estado}`);
    if (Permisos) cambios.push('Permisos');
    if (AccesoTrazas !== undefined) cambios.push(`AccesoTrazas: ${AccesoTrazas ? 'Sí' : 'No'}`);

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
    if (AccesoTrazas !== undefined) {
      updateQuery += ', AccesoTrazas = @accesoTrazas';
      params.accesoTrazas = AccesoTrazas ? 1 : 0;
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
           (RolId, ModuloPadreId, ModuloId, PermisoAgregar, PermisoModificar, PermisoEliminar, PermisoVer, PermisoVerAgrupado, PermisoVerRelacionado, UsuarioAsignacion)
           VALUES (@rolId, @moduloPadreId, @moduloId, @agregar, @modificar, @eliminar, @ver, @verAgrupado, @verRelacionado, @usuarioAsignacion)`,
          {
            rolId: parseInt(id),
            moduloPadreId: permiso.ModuloPadreId || null,
            moduloId: permiso.ModuloId,
            agregar: permiso.PermisoAgregar ? 1 : 0,
            modificar: permiso.PermisoModificar ? 1 : 0,
            eliminar: permiso.PermisoEliminar ? 1 : 0,
            ver: permiso.PermisoVer ? 1 : 0,
            verAgrupado: permiso.PermisoVerAgrupado ? 1 : 0,
            verRelacionado: permiso.PermisoVerRelacionado ? 1 : 0,
            usuarioAsignacion: user.usuario,
          }
        );
      }
    }

    // Actualizar permisos de tareas
    if (PermisosTareas !== undefined) {
      // Verificar si ya existen permisos de tareas para este rol
      const existentes = await query(
        'SELECT Id FROM TR_ROL_TAREAS_PERMISO WHERE RolId = @rolId',
        { rolId: parseInt(id) }
      );

      if (existentes.length > 0) {
        // Actualizar permisos existentes
        await execute(
          `UPDATE TR_ROL_TAREAS_PERMISO 
           SET HabilitarTareas = @habilitar,
               PuedeCrearTareas = @crear,
               PuedeAdministracionTareas = @admin,
               AdministracionBandejas = @bandejas,
               PuedeConsultarTareas = @consultar,
               PuedeVerMonitorTareas = @monitor
           WHERE RolId = @rolId`,
          {
            rolId: parseInt(id),
            habilitar: PermisosTareas.HabilitarTareas ? 1 : 0,
            crear: PermisosTareas.PuedeCrearTareas ? 1 : 0,
            admin: PermisosTareas.PuedeAdministracionTareas ? 1 : 0,
            bandejas: PermisosTareas.AdministracionBandejas ? 1 : 0,
            consultar: PermisosTareas.PuedeConsultarTareas ? 1 : 0,
            monitor: PermisosTareas.PuedeVerMonitorTareas ? 1 : 0,
          }
        );
      } else {
        // Insertar nuevos permisos
        await execute(
          `INSERT INTO TR_ROL_TAREAS_PERMISO 
           (RolId, HabilitarTareas, PuedeCrearTareas, PuedeAdministracionTareas, AdministracionBandejas, PuedeConsultarTareas, PuedeVerMonitorTareas, UsuarioCreacion)
           VALUES (@rolId, @habilitar, @crear, @admin, @bandejas, @consultar, @monitor, @usuario)`,
          {
            rolId: parseInt(id),
            habilitar: PermisosTareas.HabilitarTareas ? 1 : 0,
            crear: PermisosTareas.PuedeCrearTareas ? 1 : 0,
            admin: PermisosTareas.PuedeAdministracionTareas ? 1 : 0,
            bandejas: PermisosTareas.AdministracionBandejas ? 1 : 0,
            consultar: PermisosTareas.PuedeConsultarTareas ? 1 : 0,
            monitor: PermisosTareas.PuedeVerMonitorTareas ? 1 : 0,
            usuario: user.usuario,
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
