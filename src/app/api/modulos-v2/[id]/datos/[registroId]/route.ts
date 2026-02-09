import { NextRequest, NextResponse } from 'next/server';
import { query, getConnection } from '@/lib/db';
import sql from 'mssql';
import { getUserFromRequest, registrarTraza, verificarPermiso } from '@/lib/auth';
import { ApiResponse } from '@/types';

// PUT - Actualizar registro
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; registroId: string } }
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
    const registroId = parseInt(params.registroId);
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

    // Determinar contexto padre consultando TR_MODULO_REGISTRO_RELACION
    const relacion = await query(
      `SELECT ModuloPadreId FROM TR_MODULO_REGISTRO_RELACION 
       WHERE ModuloHijoId = @moduloId AND RegistroHijoId = @registroId`,
      { moduloId, registroId }
    );
    const moduloPadreId = relacion.length > 0 ? relacion[0].ModuloPadreId : null;

    // Verificar permisos considerando el contexto
    const tienePermiso = await verificarPermiso(user.userId, moduloId, 'modificar', moduloPadreId);
    if (!tienePermiso) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No tiene permisos para modificar registros en este módulo' },
        { status: 403 }
      );
    }

    // Obtener campos
    const campos = await query(
      'SELECT * FROM TD_CAMPOS WHERE ModuloId = @moduloId',
      { moduloId }
    );

    // Remover campos FK del body si existen (las relaciones no se actualizan)
    Object.keys(body).forEach(key => {
      if (key.endsWith('_Id') && !campos.find((c: any) => c.Nombre === key || c.NombreColumna === key)) {
        delete body[key];
      }
    });

    // Construir query de actualización (sin FKs)
    const setClauses = campos.map((c: any) => `[${c.NombreColumna}] = @${c.NombreColumna}`).join(', ');

    const updateQuery = `
      UPDATE [${modulo.NombreTabla}] 
      SET ${setClauses}, 
          FechaModificacion = GETDATE(),
          UsuarioModificacion = @usuarioModificacion
      WHERE Id = @registroId
    `;

    const pool = await getConnection();
    const request_db = pool.request();

    // Agregar parámetros de campos configurados
    campos.forEach((campo: any) => {
      const valor = body[campo.Nombre];
      
      switch (campo.TipoDato) {
        case 'Numero':
        case 'Lista':
          request_db.input(campo.NombreColumna, sql.Int, valor ? parseInt(valor) : null);
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

    request_db.input('usuarioModificacion', sql.VarChar, user.usuario);
    request_db.input('registroId', sql.Int, registroId);

    await request_db.query(updateQuery);

    // Registrar traza con detalle de campos modificados
    const cambios = campos.map((c: any) => {
      const val = body[c.Nombre];
      return val !== undefined ? `${c.Nombre}: ${val}` : null;
    }).filter(Boolean).join(", ");

    await registrarTraza(
      user.userId,
      'Modificar',
      `Módulo: ${modulo.Nombre}`,
      `Registro modificado (ID: ${registroId}). Cambios: ${cambios || 'Sin cambios'}`
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Registro actualizado exitosamente',
    });
  } catch (error: any) {
    console.error('Error actualizando registro:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: error.message || 'Error al actualizar registro' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar registro
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; registroId: string } }
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
    const registroId = parseInt(params.registroId);

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

    // Determinar contexto padre consultando TR_MODULO_REGISTRO_RELACION
    const relacion = await query(
      `SELECT ModuloPadreId FROM TR_MODULO_REGISTRO_RELACION 
       WHERE ModuloHijoId = @moduloId AND RegistroHijoId = @registroId`,
      { moduloId, registroId }
    );
    const moduloPadreId = relacion.length > 0 ? relacion[0].ModuloPadreId : null;

    // Verificar permisos considerando el contexto
    const tienePermiso = await verificarPermiso(user.userId, moduloId, 'eliminar', moduloPadreId);
    if (!tienePermiso) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No tiene permisos para eliminar registros en este módulo' },
        { status: 403 }
      );
    }

    // Primero, eliminar las relaciones en TR_MODULO_REGISTRO_RELACION
    await query(
      `DELETE FROM TR_MODULO_REGISTRO_RELACION 
       WHERE (ModuloHijoId = @moduloId AND RegistroHijoId = @registroId)
          OR (ModuloPadreId = @moduloId AND RegistroPadreId = @registroId)`,
      { moduloId, registroId }
    );

    const deleteQuery = `DELETE FROM [${modulo.NombreTabla}] WHERE Id = @registroId`;

    const pool = await getConnection();
    const request_db = pool.request();
    request_db.input('registroId', sql.Int, registroId);

    await request_db.query(deleteQuery);

    // Registrar traza
    await registrarTraza(
      user.userId,
      'Eliminar',
      `Módulo: ${modulo.Nombre}`,
      `Registro eliminado (ID: ${registroId})`
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Registro eliminado exitosamente',
    });
  } catch (error: any) {
    console.error('Error eliminando registro:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: error.message || 'Error al eliminar registro' },
      { status: 500 }
    );
  }
}
