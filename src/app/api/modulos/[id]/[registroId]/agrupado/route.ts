import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { ApiResponse } from '@/types';

// GET - Obtener registros agrupados de todos los módulos secundarios para un registro específico
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

    // Verificar que el módulo existe y es principal
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

    if (modulo[0].Tipo !== 'Principal') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Este endpoint solo funciona con módulos principales' },
        { status: 400 }
      );
    }

    // Obtener todos los módulos secundarios de este módulo principal
    const modulosSecundarios = await query(
      `SELECT Id, Nombre, NombreTabla, Icono
       FROM TD_MODULOS 
       WHERE ModuloPrincipalId = @moduloId AND Estado = 'Activo'
       ORDER BY Orden`,
      { moduloId }
    );

    if (modulosSecundarios.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: true,
        data: [],
        message: 'No hay módulos secundarios configurados',
      });
    }

    // Para cada módulo secundario, obtener sus registros relacionados con el registro principal
    const registrosAgrupados: any[] = [];

    for (const moduloSec of modulosSecundarios) {
      try {
        // Obtener campos del módulo secundario con información de listas
        const campos = await query(
          `SELECT c.Nombre, c.NombreColumna, c.TipoDato, c.VisibleEnGrilla, c.Orden, c.ListaId, l.Nombre as ListaNombre
           FROM TD_CAMPOS c
           LEFT JOIN TD_LISTAS l ON c.ListaId = l.Id
           WHERE c.ModuloId = @moduloId
           ORDER BY c.Orden`,
          { moduloId: moduloSec.Id }
        );

        // Construir lista de campos a seleccionar usando NombreColumna con alias Nombre
        const camposVisibles = campos
          .filter((c: any) => c.VisibleEnGrilla);

        // Para campos tipo lista, hacer JOIN con la tabla de valores de lista
        const selectParts = ['mt.Id', 'mt.FechaCreacion'];
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

        // Obtener registros del módulo secundario filtrados por el registro principal
        // El campo de relación usa el patrón: NombreTabla_Id (con guión bajo)
        const campoRelacion = `${modulo[0].NombreTabla}_Id`;
        
        const registros = await query(
          `SELECT ${selectFields}
           FROM ${moduloSec.NombreTabla} mt
           ${joinClause}
           WHERE mt.[${campoRelacion}] = @registroId
           ORDER BY mt.FechaCreacion DESC`
        , { registroId });

        // Agregar metadata del módulo a cada registro
        registros.forEach((registro: any) => {
          registrosAgrupados.push({
            ...registro,
            _ModuloId: moduloSec.Id,
            _ModuloNombre: moduloSec.Nombre,
            _ModuloIcono: moduloSec.Icono,
            _Campos: campos,
          });
        });
      } catch (error) {
        console.error(`Error obteniendo registros de ${moduloSec.Nombre}:`, error);
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
    console.error('Error obteniendo registros agrupados:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error en el servidor' },
      { status: 500 }
    );
  }
}
