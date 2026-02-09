import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest, verificarPermiso } from '@/lib/auth';
import { ApiResponse } from '@/types';

// GET - Obtener registros agrupados de todos los módulos secundarios para un registro específico (V2)
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

    // Verificar que el módulo existe
    const modulo = await query(
      'SELECT * FROM TD_MODULOS WHERE Id = @id',
      { id: moduloId }
    );

    if (modulo.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Módulo no encontrado' },
        { status: 404 }
      );
    }

    // Verificar permiso de verAgrupado para este módulo (sin contexto padre, es el principal)
    const tienePermiso = await verificarPermiso(user.userId, moduloId, 'verAgrupado', null);
    if (!tienePermiso) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No tiene permisos para ver la vista agrupada de este módulo' },
        { status: 403 }
      );
    }

    // Obtener todos los módulos relacionados (hijos) usando TR_MODULO_RELACION
    const modulosRelacionados = await query(
      `SELECT 
        m.Id, 
        m.Nombre, 
        m.NombreTabla, 
        m.Icono,
        r.Orden
       FROM TR_MODULO_RELACION r
       INNER JOIN TD_MODULOS m ON r.ModuloHijoId = m.Id
       WHERE r.ModuloPadreId = @moduloId 
         AND m.Estado = 'Activo'
       ORDER BY r.Orden, m.Nombre`,
      { moduloId }
    );

    if (modulosRelacionados.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: true,
        data: [],
        message: 'No hay módulos relacionados configurados',
      });
    }

    // Para cada módulo relacionado, obtener sus registros relacionados con el registro principal
    const registrosAgrupados: any[] = [];

    for (const moduloRel of modulosRelacionados) {
      try {
        // Obtener campos del módulo relacionado con información de listas
        const campos = await query(
          `SELECT c.Nombre, c.NombreColumna, c.TipoDato, c.VisibleEnGrilla, c.Orden, c.ListaId, l.Nombre as ListaNombre
           FROM TD_CAMPOS c
           LEFT JOIN TD_LISTAS l ON c.ListaId = l.Id
           WHERE c.ModuloId = @moduloId
           ORDER BY c.Orden`,
          { moduloId: moduloRel.Id }
        );

        // Construir lista de campos a seleccionar usando NombreColumna con alias Nombre
        const camposVisibles = campos.filter((c: any) => c.VisibleEnGrilla);

        // Para campos tipo lista, hacer JOIN con la tabla de valores de lista
        const selectParts = ['mt.Id', 'mt.FechaCreacion', 'mt.UsuarioCreacion'];
        const joins: string[] = [];
        
        camposVisibles.forEach((campo: any, index: number) => {
          if (campo.TipoDato === 'Lista' && campo.ListaId) {
            const alias = `lv${index}`;
            joins.push(`LEFT JOIN TD_VALORES_LISTA ${alias} ON ${alias}.ListaId = ${campo.ListaId} AND mt.[${campo.NombreColumna}] = ${alias}.Id`);
            selectParts.push(`${alias}.Valor AS [${campo.Nombre}]`);
          } else {
            selectParts.push(`mt.[${campo.NombreColumna}] AS [${campo.Nombre}]`);
          }
        });

        const selectFields = selectParts.join(', ');
        const joinClause = joins.join(' ');

        // Obtener registros del módulo relacionado filtrados por el registro principal
        // Usando la tabla TR_MODULO_REGISTRO_RELACION
        const sqlQuery = `SELECT ${selectFields}
           FROM ${moduloRel.NombreTabla} mt
           INNER JOIN TR_MODULO_REGISTRO_RELACION r
             ON r.ModuloHijoId = @moduloRelId
             AND r.RegistroHijoId = mt.Id
           ${joinClause}
           WHERE r.ModuloPadreId = @moduloPadreId
             AND r.RegistroPadreId = @registroId
           ORDER BY mt.FechaCreacion DESC`;
        
        const registros = await query(sqlQuery, { 
          moduloRelId: moduloRel.Id,
          moduloPadreId: moduloId,
          registroId 
        });

        // Agregar metadata del módulo a cada registro
        registros.forEach((registro: any) => {
          registrosAgrupados.push({
            ...registro,
            _ModuloId: moduloRel.Id,
            _ModuloNombre: moduloRel.Nombre,
            _ModuloIcono: moduloRel.Icono,
            _Campos: campos,
          });
        });
      } catch (error) {
        console.error(`Error obteniendo registros de ${moduloRel.Nombre}:`, error);
        // Continuar con el siguiente módulo si hay un error
      }
    }

    // Ordenar todos los registros por FechaCreacion descendente
    registrosAgrupados.sort((a, b) => {
      const fechaA = new Date(a.FechaCreacion).getTime();
      const fechaB = new Date(b.FechaCreacion).getTime();
      return fechaB - fechaA;
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: registrosAgrupados,
    });
  } catch (error: any) {
    console.error('Error obteniendo registros agrupados V2:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error en el servidor' },
      { status: 500 }
    );
  }
}
