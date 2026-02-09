import { NextRequest, NextResponse } from 'next/server';
import { query, execute, getConnection } from '@/lib/db';
import sql from 'mssql';
import { getUserFromRequest, registrarTraza } from '@/lib/auth';
import { sanitizeTableName, sanitizeColumnName } from '@/lib/utils';
import { ApiResponse, CreateModuloV2Request, ModuloV2 } from '@/types';

// GET - Obtener módulos V2
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
    const soloMenu = searchParams.get('soloMenu'); // Filtrar solo los que se muestran en menú

    if (id) {
      // Obtener un módulo específico con sus campos y relaciones
      const modulos = await query(
        'SELECT * FROM TD_MODULOS WHERE Id = @id',
        { id: parseInt(id) }
      );

      if (modulos.length === 0) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Módulo no encontrado' },
          { status: 404 }
        );
      }

      const modulo = modulos[0];

      // Obtener campos del módulo
      const campos = await query(
        `SELECT c.*, l.Nombre as ListaNombre
         FROM TD_CAMPOS c
         LEFT JOIN TD_LISTAS l ON c.ListaId = l.Id
         WHERE c.ModuloId = @moduloId
         ORDER BY c.Orden, c.Nombre`,
        { moduloId: parseInt(id) }
      );

      // Obtener módulos relacionados (hijos)
      const relacionesQuery = await query(
        `SELECT 
          r.Id,
          r.ModuloPadreId,
          r.ModuloHijoId,
          r.Orden,
          r.FechaCreacion,
          r.UsuarioCreacion,
          m.Nombre AS ModuloHijoNombre,
          m.NombreTabla AS ModuloHijoNombreTabla,
          m.MostrarEnMenu AS ModuloHijoMostrarEnMenu,
          m.Icono AS ModuloHijoIcono,
          m.Estado AS ModuloHijoEstado
        FROM TR_MODULO_RELACION r
        INNER JOIN TD_MODULOS m ON r.ModuloHijoId = m.Id
        WHERE r.ModuloPadreId = @moduloId
        ORDER BY r.Orden, m.Nombre`,
        { moduloId: parseInt(id) }
      );

      // Cargar módulos relacionados con estructura completa
      const modulosRelacionados = [];
      const modulosSecundarios = [];
      
      for (const rel of relacionesQuery) {
        // Verificar si el usuario tiene permiso de ver este módulo hijo en contexto del padre
        const permisoVer = await query(
          `SELECT MAX(CAST(rp.PermisoVer as int)) as TienePermiso
           FROM TR_USUARIO_ROL ur
           INNER JOIN TD_ROLES r ON ur.RolId = r.Id AND r.Estado = 'Activo'
           INNER JOIN TR_ROL_MODULO_PERMISO rp ON r.Id = rp.RolId
           WHERE ur.UsuarioId = @userId
             AND rp.ModuloId = @moduloHijoId
             AND rp.ModuloPadreId = @moduloPadreId`,
          { 
            userId: user.userId, 
            moduloHijoId: rel.ModuloHijoId,
            moduloPadreId: parseInt(id)
          }
        );

        // Si no tiene permiso, saltar este módulo hijo
        if (!permisoVer[0]?.TienePermiso || permisoVer[0].TienePermiso === 0) {
          continue;
        }

        const camposSecundario = await query(
          `SELECT c.*, l.Nombre as ListaNombre
           FROM TD_CAMPOS c
           LEFT JOIN TD_LISTAS l ON c.ListaId = l.Id
           WHERE c.ModuloId = @moduloId
           ORDER BY c.Orden, c.Nombre`,
          { moduloId: rel.ModuloHijoId }
        );

        const moduloHijoCompleto = {
          Id: rel.ModuloHijoId,
          Nombre: rel.ModuloHijoNombre,
          NombreTabla: rel.ModuloHijoNombreTabla,
          MostrarEnMenu: rel.ModuloHijoMostrarEnMenu,
          Icono: rel.ModuloHijoIcono,
          Estado: rel.ModuloHijoEstado,
          Campos: camposSecundario,
        };

        // Estructura para la página de configuración
        modulosRelacionados.push({
          Id: rel.Id,
          ModuloPadreId: rel.ModuloPadreId,
          ModuloHijoId: rel.ModuloHijoId,
          Orden: rel.Orden,
          FechaCreacion: rel.FechaCreacion,
          UsuarioCreacion: rel.UsuarioCreacion,
          ModuloHijo: moduloHijoCompleto,
        });

        // Estructura simplificada para la página de detalle
        modulosSecundarios.push(moduloHijoCompleto);
      }

      return NextResponse.json<ApiResponse>({
        success: true,
        data: {
          ...modulo,
          Campos: campos,
          ModulosRelacionados: modulosRelacionados,
          ModulosSecundarios: modulosSecundarios,
        },
      });
    }

    // Obtener todos los módulos
    let modulos;

    if (soloMenu === 'true') {
      // Filtrar módulos por permisos del usuario
      // Solo devolver módulos principales (ModuloPadreId IS NULL) donde el usuario tiene PermisoVer = 1
      modulos = await query(
        `SELECT DISTINCT m.*
         FROM TD_MODULOS m
         INNER JOIN TR_ROL_MODULO_PERMISO rp ON m.Id = rp.ModuloId
         INNER JOIN TR_USUARIO_ROL ur ON rp.RolId = ur.RolId
         INNER JOIN TD_ROLES r ON ur.RolId = r.Id
         WHERE ur.UsuarioId = @userId
           AND r.Estado = 'Activo'
           AND m.MostrarEnMenu = 1
           AND rp.ModuloPadreId IS NULL
           AND rp.PermisoVer = 1
         ORDER BY m.Orden, m.Nombre`,
        { userId: user.userId }
      );
    } else {
      // Sin filtro de permisos (para administración de módulos)
      modulos = await query(
        'SELECT * FROM TD_MODULOS ORDER BY Orden, Nombre'
      );
    }

    await registrarTraza(
      user.userId,
      'Consultar',
      'Gestión de Módulos',
      `Consulta de módulos${soloMenu === 'true' ? ' (solo menú)' : ''}`
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: modulos,
    });
  } catch (error: any) {
    console.error('Error obteniendo módulos V2:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: error.message || 'Error al obtener módulos' },
      { status: 500 }
    );
  }
}

// POST - Crear módulo V2
export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const body: CreateModuloV2Request = await request.json();
    const { Nombre, MostrarEnMenu, Icono, Orden, Campos, ModulosRelacionados } = body;

    // Validaciones
    if (!Nombre || Campos.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Nombre y al menos un campo son requeridos' },
        { status: 400 }
      );
    }

    // Generar nombre de tabla seguro
    const NombreTabla = sanitizeTableName(`TD_MODULO_${Nombre}`);

    // Verificar que no exista el módulo
    const existingModulo = await query(
      'SELECT Id FROM TD_MODULOS WHERE Nombre = @nombre OR NombreTabla = @nombreTabla',
      { nombre: Nombre, nombreTabla: NombreTabla }
    );

    if (existingModulo.length > 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Ya existe un módulo con ese nombre' },
        { status: 400 }
      );
    }

    // Iniciar transacción
    const pool = await getConnection();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      // 1. Crear registro del módulo
      const resultModulo = await transaction.request()
        .input('nombre', sql.VarChar, Nombre)
        .input('nombreTabla', sql.VarChar, NombreTabla)
        .input('mostrarEnMenu', sql.Bit, MostrarEnMenu)
        .input('icono', sql.VarChar, Icono || 'FileText')
        .input('orden', sql.Int, Orden || 0)
        .input('estado', sql.VarChar, 'Activo')
        .input('usuarioCreacion', sql.VarChar, user.usuario)
        .query(`
          INSERT INTO TD_MODULOS 
          (Nombre, NombreTabla, Tipo, MostrarEnMenu, Icono, Orden, Estado, UsuarioCreacion)
          OUTPUT INSERTED.Id
          VALUES (@nombre, @nombreTabla, 'Principal', @mostrarEnMenu, @icono, @orden, @estado, @usuarioCreacion)
        `);

      const moduloId = resultModulo.recordset[0].Id;

      // 2. Crear tabla dinámica para el módulo
      let createTableSQL = `
        CREATE TABLE [dbo].[${NombreTabla}] (
          [Id] INT IDENTITY(1,1) PRIMARY KEY,
      `;

      // Agregar columnas de campos
      for (const campo of Campos) {
        const nombreColumna = sanitizeColumnName(campo.Nombre);
        let tipoDato = 'VARCHAR(250)';

        switch (campo.TipoDato) {
          case 'Texto':
            tipoDato = `VARCHAR(${campo.Largo || 250})`;
            break;
          case 'Descripcion':
            tipoDato = 'TEXT';
            break;
          case 'Numero':
            tipoDato = 'INT';
            break;
          case 'Fecha':
            tipoDato = 'DATE';
            break;
          case 'FechaHora':
            tipoDato = 'DATETIME';
            break;
          case 'Lista':
            tipoDato = 'INT'; // FK a TD_LISTAS_VALORES
            break;
          case 'Archivo':
            tipoDato = 'VARCHAR(500)'; // Guardará el DocumentoId
            break;
        }

        const obligatorio = campo.Obligatorio ? 'NOT NULL' : 'NULL';
        createTableSQL += `[${nombreColumna}] ${tipoDato} ${obligatorio},\n          `;
      }

      // Columnas de auditoría
      createTableSQL += `
          [FechaCreacion] DATETIME DEFAULT GETDATE(),
          [FechaModificacion] DATETIME DEFAULT GETDATE(),
          [UsuarioCreacion] VARCHAR(100),
          [UsuarioModificacion] VARCHAR(100)
        );
      `;

      await transaction.request().query(createTableSQL);

      // 3. Registrar campos en TD_CAMPOS
      for (const campo of Campos) {
        const nombreColumna = sanitizeColumnName(campo.Nombre);
        
        await transaction.request()
          .input('moduloId', sql.Int, moduloId)
          .input('nombre', sql.VarChar, campo.Nombre)
          .input('nombreColumna', sql.VarChar, nombreColumna)
          .input('tipoDato', sql.VarChar, campo.TipoDato)
          .input('largo', sql.Int, campo.Largo)
          .input('listaId', sql.Int, campo.ListaId)
          .input('orden', sql.Int, campo.Orden || 0)
          .input('visible', sql.Bit, campo.Visible !== false)
          .input('visibleEnGrilla', sql.Bit, campo.VisibleEnGrilla !== false)
          .input('obligatorio', sql.Bit, campo.Obligatorio || false)
          .input('usuarioCreacion', sql.VarChar, user.usuario)
          .query(`
            INSERT INTO TD_CAMPOS 
            (ModuloId, Nombre, NombreColumna, TipoDato, Largo, ListaId, Orden, 
             Visible, VisibleEnGrilla, Obligatorio, UsuarioCreacion)
            VALUES 
            (@moduloId, @nombre, @nombreColumna, @tipoDato, @largo, @listaId, @orden, 
             @visible, @visibleEnGrilla, @obligatorio, @usuarioCreacion)
          `);
      }

      // 4. Crear relaciones con otros módulos
      if (ModulosRelacionados && ModulosRelacionados.length > 0) {
        for (let i = 0; i < ModulosRelacionados.length; i++) {
          await transaction.request()
            .input('moduloPadreId', sql.Int, moduloId)
            .input('moduloHijoId', sql.Int, ModulosRelacionados[i])
            .input('orden', sql.Int, i)
            .input('usuarioCreacion', sql.VarChar, user.usuario)
            .query(`
              INSERT INTO TR_MODULO_RELACION 
              (ModuloPadreId, ModuloHijoId, Orden, UsuarioCreacion)
              VALUES (@moduloPadreId, @moduloHijoId, @orden, @usuarioCreacion)
            `);
        }
      }

      await transaction.commit();

      await registrarTraza(
        user.userId,
        'Agregar',
        'Gestión de Módulos',
        `Módulo creado: "${Nombre}" (ID: ${moduloId}, Tabla: ${NombreTabla}, MostrarEnMenu: ${MostrarEnMenu ? 'Sí' : 'No'}, Módulos relacionados: ${ModulosRelacionados?.length || 0})`
      );

      return NextResponse.json<ApiResponse>({
        success: true,
        data: { Id: moduloId, Nombre, NombreTabla },
        message: 'Módulo creado exitosamente',
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error: any) {
    console.error('Error creando módulo V2:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: error.message || 'Error al crear módulo' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar módulo V2
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
        { success: false, error: 'ID requerido' },
        { status: 400 }
      );
    }

    const body: Partial<CreateModuloV2Request> & { Nombre?: string; Activo?: boolean } = await request.json();
    const { Nombre, MostrarEnMenu, Icono, Orden, Campos, ModulosRelacionados, Activo } = body;

    // Verificar que exista el módulo
    const existingModulo = await query(
      'SELECT * FROM TD_MODULOS WHERE Id = @id',
      { id: parseInt(id) }
    );

    if (existingModulo.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Módulo no encontrado' },
        { status: 404 }
      );
    }

    const pool = await getConnection();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      // 1. Actualizar información básica del módulo
      const updates: string[] = [];
      const request = transaction.request();

      if (Nombre !== undefined) {
        updates.push('Nombre = @nombre');
        request.input('nombre', sql.VarChar, Nombre);
      }
      if (MostrarEnMenu !== undefined) {
        updates.push('MostrarEnMenu = @mostrarEnMenu');
        request.input('mostrarEnMenu', sql.Bit, MostrarEnMenu);
      }
      if (Icono !== undefined) {
        updates.push('Icono = @icono');
        request.input('icono', sql.VarChar, Icono);
      }
      if (Orden !== undefined) {
        updates.push('Orden = @orden');
        request.input('orden', sql.Int, Orden);
      }
      if (Activo !== undefined) {
        updates.push('Estado = @estado');
        request.input('estado', sql.VarChar, Activo ? 'Activo' : 'Inactivo');
      }

      if (updates.length > 0) {
        updates.push('FechaModificacion = GETDATE()');
        updates.push('UsuarioModificacion = @usuarioModificacion');
        request.input('usuarioModificacion', sql.VarChar, user.usuario);
        request.input('id', sql.Int, parseInt(id));

        await request.query(`
          UPDATE TD_MODULOS 
          SET ${updates.join(', ')}
          WHERE Id = @id
        `);
      }

      // 2. Actualizar campos (solo agregar nuevos, no eliminar existentes)
      if (Campos && Campos.length > 0) {
        const NombreTabla = existingModulo[0].NombreTabla;
        
        for (const campo of Campos) {
          const nombreColumna = sanitizeColumnName(campo.Nombre);
          
          // Verificar si el campo ya existe
          const existingCampo = await transaction.request()
            .input('moduloId', sql.Int, parseInt(id))
            .input('nombreColumna', sql.VarChar, nombreColumna)
            .query(`
              SELECT Id FROM TD_CAMPOS 
              WHERE ModuloId = @moduloId AND NombreColumna = @nombreColumna
            `);

          if (existingCampo.recordset.length === 0) {
            // Campo nuevo - agregar a tabla y a TD_CAMPOS
            let tipoDato = 'VARCHAR(250)';
            switch (campo.TipoDato) {
              case 'Texto':
                tipoDato = `VARCHAR(${campo.Largo || 250})`;
                break;
              case 'Descripcion':
                tipoDato = 'TEXT';
                break;
              case 'Numero':
                tipoDato = 'INT';
                break;
              case 'Fecha':
                tipoDato = 'DATE';
                break;
              case 'FechaHora':
                tipoDato = 'DATETIME';
                break;
              case 'Lista':
                tipoDato = 'INT';
                break;
              case 'Archivo':
                tipoDato = 'VARCHAR(500)';
                break;
            }

            const obligatorio = campo.Obligatorio ? 'NOT NULL DEFAULT \'\'' : 'NULL';

            // Agregar columna a la tabla
            await transaction.request().query(`
              ALTER TABLE [dbo].[${NombreTabla}] 
              ADD [${nombreColumna}] ${tipoDato} ${obligatorio}
            `);

            // Registrar en TD_CAMPOS
            await transaction.request()
              .input('moduloId', sql.Int, parseInt(id))
              .input('nombre', sql.VarChar, campo.Nombre)
              .input('nombreColumna', sql.VarChar, nombreColumna)
              .input('tipoDato', sql.VarChar, campo.TipoDato)
              .input('largo', sql.Int, campo.Largo)
              .input('listaId', sql.Int, campo.ListaId)
              .input('orden', sql.Int, campo.Orden || 0)
              .input('visible', sql.Bit, campo.Visible !== false)
              .input('visibleEnGrilla', sql.Bit, campo.VisibleEnGrilla !== false)
              .input('obligatorio', sql.Bit, campo.Obligatorio || false)
              .input('usuarioCreacion', sql.VarChar, user.usuario)
              .query(`
                INSERT INTO TD_CAMPOS 
                (ModuloId, Nombre, NombreColumna, TipoDato, Largo, ListaId, Orden, 
                 Visible, VisibleEnGrilla, Obligatorio, UsuarioCreacion)
                VALUES 
                (@moduloId, @nombre, @nombreColumna, @tipoDato, @largo, @listaId, @orden, 
                 @visible, @visibleEnGrilla, @obligatorio, @usuarioCreacion)
              `);
          }
        }
      }

      // 3. Actualizar relaciones
      if (ModulosRelacionados !== undefined) {
        // Eliminar relaciones existentes
        await transaction.request()
          .input('moduloPadreId', sql.Int, parseInt(id))
          .query('DELETE FROM TR_MODULO_RELACION WHERE ModuloPadreId = @moduloPadreId');

        // Crear nuevas relaciones
        for (let i = 0; i < ModulosRelacionados.length; i++) {
          await transaction.request()
            .input('moduloPadreId', sql.Int, parseInt(id))
            .input('moduloHijoId', sql.Int, ModulosRelacionados[i])
            .input('orden', sql.Int, i)
            .input('usuarioCreacion', sql.VarChar, user.usuario)
            .query(`
              INSERT INTO TR_MODULO_RELACION 
              (ModuloPadreId, ModuloHijoId, Orden, UsuarioCreacion)
              VALUES (@moduloPadreId, @moduloHijoId, @orden, @usuarioCreacion)
            `);
        }
      }

      await transaction.commit();

      await registrarTraza(
        user.userId,
        'Modificar',
        'Gestión de Módulos',
        `Módulo modificado: "${Nombre || existingModulo[0].Nombre}" (ID: ${id}, MostrarEnMenu: ${MostrarEnMenu !== undefined ? (MostrarEnMenu ? 'Sí' : 'No') : 'Sin cambios'}, Módulos relacionados: ${ModulosRelacionados?.length || 'Sin cambios'})`
      );

      return NextResponse.json<ApiResponse>({
        success: true,
        message: 'Módulo actualizado exitosamente',
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error: any) {
    console.error('Error actualizando módulo V2:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: error.message || 'Error al actualizar módulo' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar módulo V2
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
        { success: false, error: 'ID requerido' },
        { status: 400 }
      );
    }

    // Verificar que exista el módulo
    const existingModulo = await query(
      'SELECT * FROM TD_MODULOS WHERE Id = @id',
      { id: parseInt(id) }
    );

    if (existingModulo.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Módulo no encontrado' },
        { status: 404 }
      );
    }

    const modulo = existingModulo[0];

    const pool = await getConnection();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      // 1. Eliminar permisos donde este módulo es usado (como ModuloId o ModuloPadreId)
      await transaction.request()
        .input('id', sql.Int, parseInt(id))
        .query(`
          DELETE FROM TR_ROL_MODULO_PERMISO 
          WHERE ModuloId = @id OR ModuloPadreId = @id
        `);

      // 2. Eliminar relaciones donde este módulo aparece (como padre o hijo)
      await transaction.request()
        .input('id', sql.Int, parseInt(id))
        .query(`
          DELETE FROM TR_MODULO_RELACION 
          WHERE ModuloPadreId = @id OR ModuloHijoId = @id
        `);

      // 3. Eliminar campos del módulo
      await transaction.request()
        .input('id', sql.Int, parseInt(id))
        .query('DELETE FROM TD_CAMPOS WHERE ModuloId = @id');

      // 4. Eliminar tabla dinámica
      await transaction.request().query(`
        DROP TABLE IF EXISTS [dbo].[${modulo.NombreTabla}]
      `);
      
      // 5. Eliminar módulo
      await transaction.request()
        .input('id', sql.Int, parseInt(id))
        .query('DELETE FROM TD_MODULOS WHERE Id = @id');

      await transaction.commit();

      await registrarTraza(
        user.userId,
        'Eliminar',
        'Gestión de Módulos',
        `Módulo eliminado: "${modulo.Nombre}" (ID: ${id}, Tabla: ${modulo.NombreTabla})`
      );

      return NextResponse.json<ApiResponse>({
        success: true,
        message: 'Módulo eliminado exitosamente',
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error: any) {
    console.error('Error eliminando módulo V2:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: error.message || 'Error al eliminar módulo' },
      { status: 500 }
    );
  }
}
