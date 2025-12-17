import { NextRequest, NextResponse } from 'next/server';
import { query, execute, sql } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { sanitizeTableName, sanitizeColumnName } from '@/lib/utils';
import { ApiResponse, CreateModuloRequest } from '@/types';

// GET - Obtener módulos
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
    const tipo = searchParams.get('tipo');

    if (id) {
      // Obtener un módulo específico con sus campos
      const modulo = await query(
        'SELECT * FROM TD_MODULOS WHERE Id = @id',
        { id: parseInt(id) }
      );

      if (modulo.length === 0) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Módulo no encontrado' },
          { status: 404 }
        );
      }

      // Obtener campos del módulo
      const campos = await query(
        `SELECT c.*, l.Nombre as ListaNombre
         FROM TD_CAMPOS c
         LEFT JOIN TD_LISTAS l ON c.ListaId = l.Id
         WHERE c.ModuloId = @moduloId
         ORDER BY c.Orden, c.Nombre`,
        { moduloId: parseInt(id) }
      );

      // Si es principal, obtener módulos secundarios con sus campos
      let modulosSecundarios = [];
      if (modulo[0].Tipo === 'Principal') {
        const modulosSec = await query(
          'SELECT * FROM TD_MODULOS WHERE ModuloPrincipalId = @moduloId ORDER BY Orden, Nombre',
          { moduloId: parseInt(id) }
        );

        // Para cada módulo secundario, cargar sus campos
        for (const modSec of modulosSec) {
          const camposSec = await query(
            `SELECT c.*, l.Nombre AS ListaNombre
             FROM TD_CAMPOS c
             LEFT JOIN TD_LISTAS l ON c.ListaId = l.Id
             WHERE c.ModuloId = @moduloSecId
             ORDER BY c.Orden, c.Nombre`,
            { moduloSecId: modSec.Id }
          );
          modulosSecundarios.push({
            ...modSec,
            Campos: camposSec,
          });
        }
      }

      return NextResponse.json<ApiResponse>({
        success: true,
        data: {
          ...modulo[0],
          Campos: campos,
          ModulosSecundarios: modulosSecundarios,
        },
      });
    }

    // Obtener módulos filtrados por tipo si se especifica
    let queryText = 'SELECT * FROM TD_MODULOS';
    const params: any = {};

    if (tipo) {
      queryText += ' WHERE Tipo = @tipo';
      params.tipo = tipo;
    }

    queryText += ' ORDER BY Orden, Nombre';

    const modulos = await query(queryText, params);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: modulos,
    });
  } catch (error: any) {
    console.error('Error obteniendo módulos:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error en el servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear módulo
export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const body: CreateModuloRequest = await request.json();
    const { Nombre, Tipo, ModuloPrincipalId, Icono, Orden, Campos } = body;

    if (!Nombre || !Tipo) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Nombre y tipo son requeridos' },
        { status: 400 }
      );
    }

    if (Tipo === 'Secundario' && !ModuloPrincipalId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Los módulos secundarios requieren un módulo principal' },
        { status: 400 }
      );
    }

    // Verificar si el módulo ya existe
    const existente = await query(
      'SELECT Id FROM TD_MODULOS WHERE Nombre = @nombre',
      { nombre: Nombre }
    );

    if (existente.length > 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'El módulo ya existe' },
        { status: 400 }
      );
    }

    // Generar nombre de tabla
    const nombreTabla = `TD_MODULO_${sanitizeTableName(Nombre)}`;

    // Insertar módulo
    const result = await execute(
      `INSERT INTO TD_MODULOS (Nombre, NombreTabla, Tipo, ModuloPrincipalId, Icono, Orden, UsuarioCreacion)
       OUTPUT INSERTED.Id
       VALUES (@nombre, @nombreTabla, @tipo, @moduloPrincipalId, @icono, @orden, @usuarioCreacion)`,
      {
        nombre: Nombre,
        nombreTabla: nombreTabla,
        tipo: Tipo,
        moduloPrincipalId: ModuloPrincipalId || null,
        icono: Icono || null,
        orden: Orden || 0,
        usuarioCreacion: user.usuario,
      }
    );

    const nuevoModuloId = result.recordset[0].Id;

    // Crear tabla en la base de datos
    let createTableQuery = `CREATE TABLE [dbo].[${nombreTabla}] (
      [Id] INT IDENTITY(1,1) PRIMARY KEY,`;

    // Si es secundario, agregar FK al módulo principal
    if (Tipo === 'Secundario' && ModuloPrincipalId) {
      const moduloPrincipal = await query<any>(
        'SELECT NombreTabla FROM TD_MODULOS WHERE Id = @id',
        { id: ModuloPrincipalId }
      );
      createTableQuery += `
      [${sanitizeColumnName(moduloPrincipal[0].NombreTabla)}_Id] INT NOT NULL,`;
    }

    // Agregar campos definidos
    if (Campos && Campos.length > 0) {
      for (const campo of Campos) {
        const nombreColumna = sanitizeColumnName(campo.Nombre);
        let tipoDatoSQL = '';

        switch (campo.TipoDato) {
          case 'Texto':
            tipoDatoSQL = `VARCHAR(${campo.Largo || 255})`;
            break;
          case 'Descripcion':
            tipoDatoSQL = 'VARCHAR(MAX)';
            break;
          case 'Numero':
            tipoDatoSQL = 'INT';
            break;
          case 'Fecha':
            tipoDatoSQL = 'DATE';
            break;
          case 'FechaHora':
            tipoDatoSQL = 'DATETIME';
            break;
          case 'Lista':
            tipoDatoSQL = 'INT'; // FK a valores de lista
            break;
          case 'Archivo':
            tipoDatoSQL = 'VARCHAR(100)'; // ID del documento
            break;
        }

        createTableQuery += `
      [${nombreColumna}] ${tipoDatoSQL}${campo.Obligatorio ? ' NOT NULL' : ' NULL'},`;

        // Insertar campo en TD_CAMPOS
        await execute(
          `INSERT INTO TD_CAMPOS 
           (ModuloId, Nombre, NombreColumna, TipoDato, Largo, ListaId, Orden, Visible, VisibleEnGrilla, Obligatorio, UsuarioCreacion)
           VALUES (@moduloId, @nombre, @nombreColumna, @tipoDato, @largo, @listaId, @orden, @visible, @visibleEnGrilla, @obligatorio, @usuarioCreacion)`,
          {
            moduloId: nuevoModuloId,
            nombre: campo.Nombre,
            nombreColumna: nombreColumna,
            tipoDato: campo.TipoDato,
            largo: campo.Largo || null,
            listaId: campo.ListaId || null,
            orden: campo.Orden || 0,
            visible: campo.Visible !== false ? 1 : 0,
            visibleEnGrilla: campo.VisibleEnGrilla !== false ? 1 : 0,
            obligatorio: campo.Obligatorio ? 1 : 0,
            usuarioCreacion: user.usuario,
          }
        );
      }
    }

    // Agregar campos de auditoría
    createTableQuery += `
      [Estado] VARCHAR(20) DEFAULT 'Activo',
      [FechaCreacion] DATETIME DEFAULT GETDATE(),
      [FechaModificacion] DATETIME DEFAULT GETDATE(),
      [UsuarioCreacion] VARCHAR(100),
      [UsuarioModificacion] VARCHAR(100)`;

    // Agregar FK si es secundario
    if (Tipo === 'Secundario' && ModuloPrincipalId) {
      const moduloPrincipal = await query<any>(
        'SELECT NombreTabla FROM TD_MODULOS WHERE Id = @id',
        { id: ModuloPrincipalId }
      );
      createTableQuery += `,
      CONSTRAINT FK_${nombreTabla}_Principal FOREIGN KEY ([${sanitizeColumnName(moduloPrincipal[0].NombreTabla)}_Id]) 
      REFERENCES [dbo].[${moduloPrincipal[0].NombreTabla}]([Id]) ON DELETE CASCADE`;
    }

    createTableQuery += `
    );`;

    // Ejecutar creación de tabla
    await execute(createTableQuery);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { Id: nuevoModuloId },
      message: 'Módulo creado exitosamente',
    });
  } catch (error: any) {
    console.error('Error creando módulo:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: error.message || 'Error en el servidor' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar módulo
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
        { success: false, error: 'ID de módulo requerido' },
        { status: 400 }
      );
    }

    const body: CreateModuloRequest = await request.json();
    const { Nombre, Tipo, ModuloPadreId, Icono, Orden, Campos } = body;

    // Validar campos requeridos
    if (!Nombre || !Tipo || !Campos || Campos.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Campos requeridos faltantes' },
        { status: 400 }
      );
    }

    // Obtener módulo actual para obtener NombreTabla
    const moduloActual = await query<any>(
      'SELECT NombreTabla, Nombre FROM TD_MODULOS WHERE Id = @id',
      { id: parseInt(id) }
    );

    if (moduloActual.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Módulo no encontrado' },
        { status: 404 }
      );
    }

    const nombreTablaActual = moduloActual[0].NombreTabla;
    const nombreTabla = `TD_MODULO_${Nombre.toUpperCase().replace(/ /g, '_')}`;

    // Obtener campos actuales
    const camposActuales = await query<any>(
      'SELECT * FROM TD_CAMPOS WHERE ModuloId = @moduloId ORDER BY Orden',
      { moduloId: parseInt(id) }
    );

    // Preparar ALTER TABLE para modificar columnas
    const alterStatements: string[] = [];

    // Comparar campos actuales con nuevos
    const camposActualesMap = new Map(camposActuales.map((c: any) => [c.Nombre, c]));

    // Solo detectar columnas a agregar (NO se eliminan campos para no perder datos)
    for (const campoNuevo of Campos) {
      const nombreColumna = sanitizeColumnName(campoNuevo.Nombre);
      let tipoDato = '';

      switch (campoNuevo.TipoDato) {
        case 'Texto':
          tipoDato = `NVARCHAR(${campoNuevo.Largo || 100})`;
          break;
        case 'Descripcion':
          tipoDato = 'NVARCHAR(MAX)';
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
          tipoDato = 'NVARCHAR(500)';
          break;
      }

      const nullable = campoNuevo.Obligatorio ? 'NOT NULL' : 'NULL';

      if (!camposActualesMap.has(campoNuevo.Nombre)) {
        // Nueva columna - siempre NULL al agregar para no romper datos existentes
        alterStatements.push(
          `ALTER TABLE [${nombreTablaActual}] ADD [${nombreColumna}] ${tipoDato} NULL`
        );
      } else {
        // Campo existente - actualizar propiedades de largo si cambió
        const campoActual = camposActualesMap.get(campoNuevo.Nombre);
        if (campoNuevo.TipoDato === 'Texto' && campoActual.Largo !== campoNuevo.Largo) {
          alterStatements.push(
            `ALTER TABLE [${nombreTablaActual}] ALTER COLUMN [${nombreColumna}] ${tipoDato} ${nullable}`
          );
        }
      }
    }

    // Ejecutar ALTER TABLE statements
    for (const statement of alterStatements) {
      await execute(statement);
    }

    // Si cambió el nombre del módulo, renombrar tabla
    if (nombreTabla !== nombreTablaActual) {
      await execute(`EXEC sp_rename '${nombreTablaActual}', '${nombreTabla.replace('TD_MODULO_', '')}'`);
    }

    // Actualizar registro del módulo
    await execute(
      `UPDATE TD_MODULOS SET 
        Nombre = @nombre, 
        Tipo = @tipo, 
        ModuloPrincipalId = @moduloPrincipalId,
        Icono = @icono,
        Orden = @orden,
        NombreTabla = @nombreTabla
      WHERE Id = @id`,
      {
        id: parseInt(id),
        nombre: Nombre,
        tipo: Tipo,
        moduloPrincipalId: ModuloPadreId || null,
        icono: Icono || 'FileText',
        orden: Orden || 1,
        nombreTabla: nombreTabla
      }
    );

    // Eliminar campos antiguos
    await execute('DELETE FROM TD_CAMPOS WHERE ModuloId = @moduloId', {
      moduloId: parseInt(id)
    });

    // Insertar campos actualizados
    for (let i = 0; i < Campos.length; i++) {
      const campo = Campos[i];
      const nombreColumna = sanitizeColumnName(campo.Nombre);
      
      await execute(
        `INSERT INTO TD_CAMPOS 
         (ModuloId, Nombre, NombreColumna, TipoDato, Largo, ListaId, Orden, Visible, VisibleEnGrilla, Obligatorio, UsuarioCreacion)
         VALUES (@moduloId, @nombre, @nombreColumna, @tipoDato, @largo, @listaId, @orden, @visible, @visibleEnGrilla, @obligatorio, @usuarioCreacion)`,
        {
          moduloId: parseInt(id),
          nombre: campo.Nombre,
          nombreColumna: nombreColumna,
          tipoDato: campo.TipoDato,
          largo: campo.Largo || null,
          listaId: campo.ListaId || null,
          orden: i + 1,
          visible: campo.Visible ? 1 : 0,
          visibleEnGrilla: campo.VisibleEnGrilla ? 1 : 0,
          obligatorio: campo.Obligatorio ? 1 : 0,
          usuarioCreacion: user.usuario,
        }
      );
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { Id: parseInt(id) },
      message: 'Módulo actualizado exitosamente',
    });
  } catch (error: any) {
    console.error('Error actualizando módulo:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: error.message || 'Error en el servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar módulo
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
        { success: false, error: 'ID de módulo requerido' },
        { status: 400 }
      );
    }

    // Obtener módulo
    const modulo = await query<any>(
      'SELECT NombreTabla FROM TD_MODULOS WHERE Id = @id',
      { id: parseInt(id) }
    );

    if (modulo.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Módulo no encontrado' },
        { status: 404 }
      );
    }

    const nombreTabla = modulo[0].NombreTabla;

    // Verificar si la tabla tiene registros
    const registros = await query(
      `SELECT COUNT(*) as Cuenta FROM [${nombreTabla}]`
    );

    if (registros[0].Cuenta > 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'El módulo tiene registros y no puede ser eliminado' },
        { status: 400 }
      );
    }

    // Verificar si tiene módulos secundarios
    const secundarios = await query(
      'SELECT COUNT(*) as Cuenta FROM TD_MODULOS WHERE ModuloPrincipalId = @moduloId',
      { moduloId: parseInt(id) }
    );

    if (secundarios[0].Cuenta > 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'El módulo tiene módulos secundarios asociados' },
        { status: 400 }
      );
    }

    // Eliminar tabla
    await execute(`DROP TABLE [${nombreTabla}]`);

    // Eliminar módulo (los campos se eliminan en cascada)
    await execute('DELETE FROM TD_MODULOS WHERE Id = @id', {
      id: parseInt(id),
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Módulo eliminado exitosamente',
    });
  } catch (error: any) {
    console.error('Error eliminando módulo:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error en el servidor' },
      { status: 500 }
    );
  }
}
