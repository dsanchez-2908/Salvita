import { NextRequest, NextResponse } from 'next/server';
import { query, getConnection } from '@/lib/db';
import sql from 'mssql';
import { getUserFromRequest, registrarTraza, verificarPermiso } from '@/lib/auth';
import { ApiResponse } from '@/types';
import { documentManager } from '@/lib/document-manager';

// GET - Obtener datos del módulo
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const moduloId = parseInt(params.id);

    // Obtener información del módulo
    const modulos = await query(
      'SELECT * FROM TD_MODULOS WHERE Id = @moduloId',
      { moduloId }
    );

    if (modulos.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Módulo no encontrado' },
        { status: 404 }
      );
    }

    const modulo = modulos[0];

    // Extraer contexto padre si se proporciona
    const { searchParams } = new URL(request.url);
    const parentModuloIdStr = searchParams.get('parentModuloId');
    const parentModuloId = parentModuloIdStr ? parseInt(parentModuloIdStr) : null;

    // Verificar permisos considerando el contexto padre-hijo
    const tienePermiso = await verificarPermiso(user.userId, moduloId, 'ver', parentModuloId);
    if (!tienePermiso) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No tiene permisos para ver este módulo en este contexto' },
        { status: 403 }
      );
    }

    // Obtener campos
    const campos = await query(
      `SELECT c.*, l.Nombre as ListaNombre
       FROM TD_CAMPOS c
       LEFT JOIN TD_LISTAS l ON c.ListaId = l.Id
       WHERE c.ModuloId = @moduloId
       ORDER BY c.Orden, c.Nombre`,
      { moduloId }
    );

    // Verificar si se está solicitando registros de un padre específico
    const parentId = searchParams.get('parentId');

    let registros;

    if (parentId && parentModuloId) {
      // Si se especifica un padre, obtener solo los registros relacionados
      // usando la tabla TR_MODULO_REGISTRO_RELACION
      registros = await query(
        `SELECT mt.*
         FROM [${modulo.NombreTabla}] mt
         INNER JOIN TR_MODULO_REGISTRO_RELACION r 
           ON r.ModuloHijoId = @moduloId 
           AND r.RegistroHijoId = mt.Id
         WHERE r.ModuloPadreId = @parentModuloId
           AND r.RegistroPadreId = @parentId
         ORDER BY mt.FechaCreacion DESC`,
        { 
          moduloId, 
          parentModuloId: parentModuloId,
          parentId: parseInt(parentId) 
        }
      );
    } else {
      // Si no se especifica padre, obtener todos los registros del módulo
      registros = await query(
        `SELECT * FROM [${modulo.NombreTabla}] ORDER BY Id DESC`
      );
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        modulo,
        campos,
        registros,
      },
    });
  } catch (error: any) {
    console.error('Error obteniendo datos del módulo:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: error.message || 'Error al obtener datos' },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo registro
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const moduloId = parseInt(params.id);
    const body = await request.json();

    // Obtener información del módulo
    const modulos = await query(
      'SELECT * FROM TD_MODULOS WHERE Id = @moduloId',
      { moduloId }
    );

    if (modulos.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Módulo no encontrado' },
        { status: 404 }
      );
    }

    const modulo = modulos[0];

    // Obtener campos
    const campos = await query(
      'SELECT * FROM TD_CAMPOS WHERE ModuloId = @moduloId',
      { moduloId }
    );

    // Detectar relaciones padre-hijo en el body
    // Los campos que terminan en _Id y coinciden con nombres de tabla de módulos
    let relacionPadre: { moduloPadreId: number; registroPadreId: number } | null = null;

    for (const key of Object.keys(body)) {
      if (key.endsWith('_Id')) {
        const nombreTablaPadre = key.replace('_Id', '');
        // Verificar si existe un módulo con ese nombre de tabla
        const moduloPadre = await query(
          'SELECT Id FROM TD_MODULOS WHERE NombreTabla = @nombreTabla',
          { nombreTabla: nombreTablaPadre }
        );
        
        if (moduloPadre.length > 0 && body[key]) {
          relacionPadre = {
            moduloPadreId: moduloPadre[0].Id,
            registroPadreId: parseInt(body[key])
          };
          // Remover el FK del body para no insertarlo en la tabla
          delete body[key];
          break;
        }
      }
    }

    // Verificar permisos considerando el contexto padre-hijo
    const tienePermiso = await verificarPermiso(
      user.userId, 
      moduloId, 
      'agregar', 
      relacionPadre?.moduloPadreId ?? null
    );
    if (!tienePermiso) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No tiene permisos para agregar registros en este módulo' },
        { status: 403 }
      );
    }

    // Construir query de inserción (sin FKs, ahora van a TR_MODULO_REGISTRO_RELACION)
    // Excluir campos tipo IDInterno (no se pueden insertar, apuntan a la columna Id que es IDENTITY)
    const camposInsertables = campos.filter((c: any) => c.TipoDato !== 'IDInterno');
    const camposNombres = camposInsertables.map((c: any) => `[${c.NombreColumna}]`).join(', ');
    const camposParams = camposInsertables.map((c: any) => `@${c.NombreColumna}`).join(', ');

    const insertQuery = `
      INSERT INTO [${modulo.NombreTabla}] 
      (${camposNombres}, UsuarioCreacion)
      OUTPUT INSERTED.Id
      VALUES (${camposParams}, @usuarioCreacion)
    `;

    const pool = await getConnection();
    const request_db = pool.request();

    // Agregar parámetros de campos configurados (excluir IDInterno)
    camposInsertables.forEach((campo: any) => {
      const valor = body[campo.Nombre];
      
      switch (campo.TipoDato) {
        case 'Numero':
        case 'Lista':
          request_db.input(campo.NombreColumna, sql.Int, valor ? parseInt(valor) : null);
          break;
        case 'Decimal':
          request_db.input(campo.NombreColumna, sql.Decimal(18, 2), valor ? parseFloat(valor) : null);
          break;
        case 'Fecha':
          request_db.input(campo.NombreColumna, sql.Date, valor || null);
          break;
        case 'FechaHora':
          request_db.input(campo.NombreColumna, sql.DateTime, valor || null);
          break;
        case 'Archivo':
          request_db.input(campo.NombreColumna, sql.NVarChar, valor || null);
          break;
        default:
          request_db.input(campo.NombreColumna, sql.VarChar, valor || null);
      }
    });

    request_db.input('usuarioCreacion', sql.VarChar, user.usuario);

    const result = await request_db.query(insertQuery);
    const nuevoId = result.recordset[0].Id;

    // Si hay una relación padre-hijo, crear el vínculo en TR_MODULO_REGISTRO_RELACION
    if (relacionPadre) {
      await query(
        `INSERT INTO TR_MODULO_REGISTRO_RELACION 
         (ModuloPadreId, RegistroPadreId, ModuloHijoId, RegistroHijoId, UsuarioCreacion)
         VALUES (@moduloPadreId, @registroPadreId, @moduloHijoId, @registroHijoId, @usuario)`,
        {
          moduloPadreId: relacionPadre.moduloPadreId,
          registroPadreId: relacionPadre.registroPadreId,
          moduloHijoId: moduloId,
          registroHijoId: nuevoId,
          usuario: user.usuario
        }
      );
    }

    // Actualizar metadatos de documentos
    const camposArchivo = campos.filter((c: any) => c.TipoDato === 'Archivo');
    for (const campo of camposArchivo) {
      const documentId = body[campo.Nombre];
      if (documentId) {
        try {
          const metadatos = {
            moduloId,
            moduloNombre: modulo.Nombre,
            registroId: nuevoId
          };
          
          // Agregar todos los campos al metadata
          campos.forEach((c: any) => {
            const valor = body[c.Nombre];
            if (valor !== undefined && valor !== null && valor !== "") {
              (metadatos as any)[c.Nombre] = valor;
            }
          });

          await documentManager.updateDocumentMetadata(documentId, metadatos);
        } catch (metaError) {
          console.error('Error actualizando metadatos del documento:', metaError);
          // No fallar la operación si falla la actualización de metadatos
        }
      }
    }

    // Registrar traza con detalle de campos
    const camposData = campos.map((c: any) => {
      const val = body[c.Nombre];
      return val !== undefined && val !== null && val !== "" ? `${c.Nombre}: ${val}` : null;
    }).filter(Boolean).join(", ");

    await registrarTraza(
      user.userId,
      'Agregar',
      `Módulo: ${modulo.Nombre}`,
      `Registro creado (ID: ${nuevoId}). ${camposData || 'Sin datos'}`
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { Id: nuevoId },
      message: 'Registro creado exitosamente',
    });
  } catch (error: any) {
    console.error('Error creando registro:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: error.message || 'Error al crear registro' },
      { status: 500 }
    );
  }
}
