import { NextRequest, NextResponse } from 'next/server';
import { query, getConnection } from '@/lib/db';
import sql from 'mssql';
import { getUserFromRequest, registrarTraza } from '@/lib/auth';
import { ApiResponse } from '@/types';

// GET - Obtener registros asociados de un módulo específico
export async function GET(
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
    const { searchParams } = new URL(request.url);
    const moduloAsociadoId = searchParams.get('moduloAsociadoId');

    if (!moduloAsociadoId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'moduloAsociadoId es requerido' },
        { status: 400 }
      );
    }

    // Obtener información del módulo asociado
    const moduloAsociado = await query(
      'SELECT * FROM TD_MODULOS WHERE Id = @id',
      { id: parseInt(moduloAsociadoId) }
    );

    if (moduloAsociado.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Módulo asociado no encontrado' },
        { status: 404 }
      );
    }

    const modulo = moduloAsociado[0];

    // Obtener campos visibles en grilla del módulo asociado
    const campos = await query(
      `SELECT * FROM TD_CAMPOS 
       WHERE ModuloId = @moduloId AND VisibleEnGrilla = 1
       ORDER BY Orden`,
      { moduloId: parseInt(moduloAsociadoId) }
    );

    // Obtener registros asociados desde TR_MODULO_REGISTRO_RELACION
    const registrosAsociados = await query(
      `SELECT 
        r.Id as RelacionId,
        r.RegistroHijoId,
        r.FechaCreacion as FechaAsociacion,
        r.UsuarioCreacion as UsuarioAsociacion
      FROM TR_MODULO_REGISTRO_RELACION r
      WHERE r.ModuloPadreId = @moduloId
        AND r.RegistroPadreId = @registroId
        AND r.ModuloHijoId = @moduloAsociadoId`,
      { 
        moduloId,
        registroId,
        moduloAsociadoId: parseInt(moduloAsociadoId)
      }
    );

    if (registrosAsociados.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: true,
        data: {
          modulo,
          campos,
          registros: []
        }
      });
    }

    // Obtener datos completos de los registros asociados
    const registroIds = registrosAsociados.map((r: any) => r.RegistroHijoId);
    const placeholders = registroIds.map((_: any, i: number) => `@id${i}`).join(',');
    
    const pool = await getConnection();
    const request_db = pool.request();
    registroIds.forEach((id: number, i: number) => {
      request_db.input(`id${i}`, sql.Int, id);
    });

    const datosRegistros = await request_db.query(
      `SELECT * FROM [${modulo.NombreTabla}] WHERE Id IN (${placeholders})`
    );

    // Combinar datos de relación con datos del registro
    const registrosCompletos = datosRegistros.recordset.map((registro: any) => {
      const relacion = registrosAsociados.find((r: any) => r.RegistroHijoId === registro.Id);
      return {
        ...registro,
        RelacionId: relacion.RelacionId,
        FechaAsociacion: relacion.FechaAsociacion,
        UsuarioAsociacion: relacion.UsuarioAsociacion
      };
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        modulo,
        campos,
        registros: registrosCompletos
      }
    });

  } catch (error: any) {
    console.error('Error obteniendo registros asociados:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: error.message || 'Error al obtener registros asociados' },
      { status: 500 }
    );
  }
}

// POST - Asociar un registro existente
export async function POST(
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
    const { moduloAsociadoId, registroAsociadoId } = body;

    if (!moduloAsociadoId || !registroAsociadoId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'moduloAsociadoId y registroAsociadoId son requeridos' },
        { status: 400 }
      );
    }

    // Verificar que no exista ya la asociación
    const existente = await query(
      `SELECT Id FROM TR_MODULO_REGISTRO_RELACION
       WHERE ModuloPadreId = @moduloPadreId
         AND RegistroPadreId = @registroPadreId
         AND ModuloHijoId = @moduloHijoId
         AND RegistroHijoId = @registroHijoId`,
      {
        moduloPadreId: moduloId,
        registroPadreId: registroId,
        moduloHijoId: moduloAsociadoId,
        registroHijoId: registroAsociadoId
      }
    );

    if (existente.length > 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'El registro ya está asociado' },
        { status: 400 }
      );
    }

    // Crear la asociación
    await query(
      `INSERT INTO TR_MODULO_REGISTRO_RELACION 
       (ModuloPadreId, RegistroPadreId, ModuloHijoId, RegistroHijoId, UsuarioCreacion)
       VALUES (@moduloPadreId, @registroPadreId, @moduloHijoId, @registroHijoId, @usuario)`,
      {
        moduloPadreId: moduloId,
        registroPadreId: registroId,
        moduloHijoId: moduloAsociadoId,
        registroHijoId: registroAsociadoId,
        usuario: user.usuario
      }
    );

    // Obtener nombres para la traza
    const moduloPadre = await query('SELECT Nombre FROM TD_MODULOS WHERE Id = @id', { id: moduloId });
    const moduloAsociado = await query('SELECT Nombre FROM TD_MODULOS WHERE Id = @id', { id: moduloAsociadoId });

    await registrarTraza(
      user.userId,
      'Asociar',
      `Módulo: ${moduloPadre[0]?.Nombre || 'Módulo'}`,
      `Registro #${registroId} asociado con registro #${registroAsociadoId} de ${moduloAsociado[0]?.Nombre || 'módulo'}`
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Registro asociado exitosamente'
    });

  } catch (error: any) {
    console.error('Error asociando registro:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: error.message || 'Error al asociar registro' },
      { status: 500 }
    );
  }
}

// DELETE - Desasociar un registro
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

    const { searchParams } = new URL(request.url);
    const relacionId = searchParams.get('relacionId');

    if (!relacionId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'relacionId es requerido' },
        { status: 400 }
      );
    }

    // Obtener info de la relación antes de eliminar para la traza
    const relacion = await query(
      `SELECT r.*, mp.Nombre as ModuloPadreNombre, mh.Nombre as ModuloHijoNombre
       FROM TR_MODULO_REGISTRO_RELACION r
       INNER JOIN TD_MODULOS mp ON r.ModuloPadreId = mp.Id
       INNER JOIN TD_MODULOS mh ON r.ModuloHijoId = mh.Id
       WHERE r.Id = @id`,
      { id: parseInt(relacionId) }
    );

    if (relacion.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Relación no encontrada' },
        { status: 404 }
      );
    }

    // Eliminar la asociación
    await query(
      'DELETE FROM TR_MODULO_REGISTRO_RELACION WHERE Id = @id',
      { id: parseInt(relacionId) }
    );

    await registrarTraza(
      user.userId,
      'Desasociar',
      `Módulo: ${relacion[0].ModuloPadreNombre}`,
      `Registro #${relacion[0].RegistroPadreId} desasociado de registro #${relacion[0].RegistroHijoId} de ${relacion[0].ModuloHijoNombre}`
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Registro desasociado exitosamente'
    });

  } catch (error: any) {
    console.error('Error desasociando registro:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: error.message || 'Error al desasociar registro' },
      { status: 500 }
    );
  }
}
