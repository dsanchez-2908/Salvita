import { NextRequest, NextResponse } from 'next/server';
import { query, getConnection } from '@/lib/db';
import sql from 'mssql';
import { getUserFromRequest } from '@/lib/auth';
import { ApiResponse } from '@/types';

// GET - Obtener todas las relaciones inversas de un registro
// Es decir, encontrar todos los módulos/registros donde este registro está asociado
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

    // Buscar todas las relaciones donde este registro es el "hijo" (está asociado)
    const relaciones = await query(
      `SELECT 
        r.Id as RelacionId,
        r.ModuloPadreId,
        r.RegistroPadreId,
        r.FechaCreacion,
        r.UsuarioCreacion,
        mp.Nombre as ModuloPadreNombre,
        mp.NombreTabla as ModuloPadreTabla,
        mr.TipoRelacion
      FROM TR_MODULO_REGISTRO_RELACION r
      INNER JOIN TD_MODULOS mp ON r.ModuloPadreId = mp.Id
      INNER JOIN TR_MODULO_RELACION mr ON 
        mr.ModuloPadreId = r.ModuloPadreId AND 
        mr.ModuloHijoId = r.ModuloHijoId AND
        mr.TipoRelacion = 'Asociar'
      WHERE r.ModuloHijoId = @moduloId
        AND r.RegistroHijoId = @registroId
      ORDER BY mp.Nombre, r.FechaCreacion DESC`,
      { moduloId, registroId }
    );

    if (relaciones.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: true,
        data: []
      });
    }

    // Agrupar por módulo padre
    const relacionesAgrupadas = new Map<number, any>();

    for (const rel of relaciones) {
      if (!relacionesAgrupadas.has(rel.ModuloPadreId)) {
        // Obtener campos visibles en grilla del módulo padre
        const campos = await query(
          `SELECT * FROM TD_CAMPOS 
           WHERE ModuloId = @moduloId AND VisibleEnGrilla = 1
           ORDER BY Orden`,
          { moduloId: rel.ModuloPadreId }
        );

        relacionesAgrupadas.set(rel.ModuloPadreId, {
          moduloId: rel.ModuloPadreId,
          moduloNombre: rel.ModuloPadreNombre,
          moduloTabla: rel.ModuloPadreTabla,
          campos,
          registros: []
        });
      }
    }

    // Obtener datos de los registros padres por cada módulo
    const pool = await getConnection();

    const relacionesArray = Array.from(relacionesAgrupadas.entries());
    for (let i = 0; i < relacionesArray.length; i++) {
      const [moduloPadreId, grupo] = relacionesArray[i];
      const registrosDeEsteModulo = relaciones.filter(r => r.ModuloPadreId === moduloPadreId);
      const registroIds = registrosDeEsteModulo.map(r => r.RegistroPadreId);
      
      if (registroIds.length > 0) {
        const placeholders = registroIds.map((_: any, i: number) => `@id${i}`).join(',');
        
        const request_db = pool.request();
        registroIds.forEach((id: number, i: number) => {
          request_db.input(`id${i}`, sql.Int, id);
        });

        const datosRegistros = await request_db.query(
          `SELECT * FROM [${grupo.moduloTabla}] WHERE Id IN (${placeholders})`
        );

        // Combinar datos de relación con datos del registro
        grupo.registros = datosRegistros.recordset.map((registro: any) => {
          const relacion = registrosDeEsteModulo.find(r => r.RegistroPadreId === registro.Id);
          return {
            ...registro,
            RelacionId: relacion.RelacionId,
            FechaAsociacion: relacion.FechaCreacion,
            UsuarioAsociacion: relacion.UsuarioCreacion
          };
        });
      }
    }

    // Convertir Map a Array
    const resultado = Array.from(relacionesAgrupadas.values());

    return NextResponse.json<ApiResponse>({
      success: true,
      data: resultado
    });

  } catch (error: any) {
    console.error('Error obteniendo relaciones inversas:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: error.message || 'Error al obtener relaciones inversas' },
      { status: 500 }
    );
  }
}
