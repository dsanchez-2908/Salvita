import { NextRequest, NextResponse } from 'next/server';
import { query, getConnection } from '@/lib/db';
import sql from 'mssql';
import { getUserFromRequest } from '@/lib/auth';
import { ApiResponse } from '@/types';

// GET - Buscar registros disponibles para asociar
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
    const { searchParams } = new URL(request.url);
    const busqueda = searchParams.get('busqueda') || '';
    const registroPadreId = searchParams.get('registroPadreId');
    const moduloPadreId = searchParams.get('moduloPadreId');

    // Obtener módulo
    const modulos = await query(
      'SELECT * FROM TD_MODULOS WHERE Id = @id',
      { id: moduloId }
    );

    if (modulos.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Módulo no encontrado' },
        { status: 404 }
      );
    }

    const modulo = modulos[0];

    // Obtener campos visibles en grilla
    const campos = await query(
      `SELECT * FROM TD_CAMPOS 
       WHERE ModuloId = @moduloId AND VisibleEnGrilla = 1
       ORDER BY Orden`,
      { moduloId }
    );

    // Construir la consulta para buscar registros
    let whereConditions: string[] = [];
    const pool = await getConnection();
    const request_db = pool.request();

    // Si hay búsqueda, buscar en todos los campos de texto
    if (busqueda) {
      const searchConditions = campos
        .filter((c: any) => c.TipoDato === 'Texto' || c.TipoDato === 'Descripcion')
        .map((c: any) => `CAST([${c.NombreColumna}] AS NVARCHAR(MAX)) LIKE @busqueda`);
      
      if (searchConditions.length > 0) {
        whereConditions.push(`(${searchConditions.join(' OR ')})`);
        request_db.input('busqueda', sql.NVarChar, `%${busqueda}%`);
      }
    }

    // Excluir registros ya asociados
    if (registroPadreId && moduloPadreId) {
      whereConditions.push(`Id NOT IN (
        SELECT RegistroHijoId 
        FROM TR_MODULO_REGISTRO_RELACION
        WHERE ModuloPadreId = @moduloPadreId
          AND RegistroPadreId = @registroPadreId
          AND ModuloHijoId = @moduloId
      )`);
      request_db.input('moduloPadreId', sql.Int, parseInt(moduloPadreId));
      request_db.input('registroPadreId', sql.Int, parseInt(registroPadreId));
      request_db.input('moduloId', sql.Int, moduloId);
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Ejecutar consulta con límite
    const queryStr = `
      SELECT TOP 50 * 
      FROM [${modulo.NombreTabla}]
      ${whereClause}
      ORDER BY Id DESC
    `;

    const registros = await request_db.query(queryStr);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        modulo,
        campos,
        registros: registros.recordset
      }
    });

  } catch (error: any) {
    console.error('Error buscando registros disponibles:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: error.message || 'Error al buscar registros' },
      { status: 500 }
    );
  }
}
