import { NextRequest, NextResponse } from 'next/server';
import { query, getConnection } from '@/lib/db';
import sql from 'mssql';
import { getUserFromRequest } from '@/lib/auth';
import { ApiResponse } from '@/types';

interface AdvancedFilter {
  moduloId: number;
  moduloNombre: string;
  campo: string;
  operador: "igual" | "contiene" | "noContiene" | "mayor" | "menor" | "mayorIgual" | "menorIgual" | "entre";
  valor: any;
  valorHasta?: any;
}

// POST - Buscar con filtros avanzados (incluyendo módulos hijos)
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
    const { filters, searchTerm } = await request.json();

    // Obtener información del módulo padre
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

    // Obtener campos del módulo padre
    const campos = await query(
      `SELECT c.*, l.Nombre as ListaNombre
       FROM TD_CAMPOS c
       LEFT JOIN TD_LISTAS l ON c.ListaId = l.Id
       WHERE c.ModuloId = @moduloId
       ORDER BY c.Orden, c.Nombre`,
      { moduloId }
    );

    // Agrupar filtros por módulo
    const filtrosPorModulo: Record<number, AdvancedFilter[]> = {};
    const modulosEnFiltros = new Set<number>();
    
    (filters as AdvancedFilter[]).forEach(filter => {
      if (!filter.campo || !filter.valor) return;
      
      if (!filtrosPorModulo[filter.moduloId]) {
        filtrosPorModulo[filter.moduloId] = [];
      }
      filtrosPorModulo[filter.moduloId].push(filter);
      modulosEnFiltros.add(filter.moduloId);
    });

    // Obtener información de módulos hijos involucrados en los filtros
    const modulosHijos: any[] = [];
    for (const moduloHijoId of modulosEnFiltros) {
      if (moduloHijoId === moduloId) continue; // Saltar el módulo padre
      
      const moduloHijo = await query(
        'SELECT * FROM TD_MODULOS WHERE Id = @id',
        { id: moduloHijoId }
      );
      
      if (moduloHijo.length > 0) {
        const camposHijo = await query(
          `SELECT c.*, l.Nombre as ListaNombre
           FROM TD_CAMPOS c
           LEFT JOIN TD_LISTAS l ON c.ListaId = l.Id
           WHERE c.ModuloId = @moduloId
           ORDER BY c.Orden, c.Nombre`,
          { moduloId: moduloHijoId }
        );
        
        modulosHijos.push({
          ...moduloHijo[0],
          Campos: camposHijo
        });
      }
    }

    // Construir query SQL dinámico
    let selectClause = `mt.*`;
    let fromClause = `[${modulo.NombreTabla}] mt`;
    let whereClause = '1=1';
    const parametros: Record<string, any> = {};
    let paramIndex = 0;

    // Agregar JOINs para módulos hijos
    for (const moduloHijo of modulosHijos) {
      const alias = `mh${moduloHijo.Id}`;
      
      // JOIN a través de TR_MODULO_REGISTRO_RELACION
      fromClause += `
        INNER JOIN TR_MODULO_REGISTRO_RELACION r${moduloHijo.Id} 
          ON r${moduloHijo.Id}.ModuloPadreId = @moduloId${paramIndex}
          AND r${moduloHijo.Id}.RegistroPadreId = mt.Id
          AND r${moduloHijo.Id}.ModuloHijoId = @moduloHijo${moduloHijo.Id}
        INNER JOIN [${moduloHijo.NombreTabla}] ${alias} 
          ON ${alias}.Id = r${moduloHijo.Id}.RegistroHijoId
      `;
      
      parametros[`moduloId${paramIndex}`] = moduloId;
      parametros[`moduloHijo${moduloHijo.Id}`] = moduloHijo.Id;
      paramIndex++;
    }

    // Agregar condiciones WHERE para cada filtro
    for (const [moduloIdStr, filtersForModule] of Object.entries(filtrosPorModulo)) {
      const targetModuloId = parseInt(moduloIdStr);
      const alias = targetModuloId === moduloId ? 'mt' : `mh${targetModuloId}`;
      
      // Obtener campos del módulo correspondiente
      const camposDelModulo = targetModuloId === moduloId 
        ? campos 
        : modulosHijos.find(m => m.Id === targetModuloId)?.Campos || [];

      for (const filter of filtersForModule) {
        const campo = camposDelModulo.find((c: any) => c.Nombre === filter.campo);
        if (!campo) continue;

        // Para IDInterno, usar directamente la columna Id
        const columnName = campo.TipoDato === 'IDInterno' ? 'Id' : (campo.NombreColumna || filter.campo);
        const paramName = `param${paramIndex}`;
        
        switch (filter.operador) {
          case "igual":
            if (campo.TipoDato === "Lista") {
              whereClause += ` AND ${alias}.[${columnName}] = @${paramName}`;
              parametros[paramName] = parseInt(filter.valor);
            } else if (campo.TipoDato === "IDInterno" || campo.TipoDato === "Numero") {
              // Para IDInterno y Numero, tratar como entero
              whereClause += ` AND ${alias}.[${columnName}] = @${paramName}`;
              parametros[paramName] = parseInt(filter.valor);
            } else {
              whereClause += ` AND ${alias}.[${columnName}] = @${paramName}`;
              parametros[paramName] = filter.valor;
            }
            break;
            
          case "contiene":
            whereClause += ` AND ${alias}.[${columnName}] LIKE @${paramName}`;
            parametros[paramName] = `%${filter.valor}%`;
            break;
            
          case "noContiene":
            whereClause += ` AND ${alias}.[${columnName}] NOT LIKE @${paramName}`;
            parametros[paramName] = `%${filter.valor}%`;
            break;
            
          case "mayor":
            whereClause += ` AND ${alias}.[${columnName}] > @${paramName}`;
            parametros[paramName] = campo.TipoDato === "IDInterno" || campo.TipoDato === "Numero" ? parseInt(filter.valor) : filter.valor;
            break;
            
          case "menor":
            whereClause += ` AND ${alias}.[${columnName}] < @${paramName}`;
            parametros[paramName] = campo.TipoDato === "IDInterno" || campo.TipoDato === "Numero" ? parseInt(filter.valor) : filter.valor;
            break;
            
          case "mayorIgual":
            whereClause += ` AND ${alias}.[${columnName}] >= @${paramName}`;
            parametros[paramName] = campo.TipoDato === "IDInterno" || campo.TipoDato === "Numero" ? parseInt(filter.valor) : filter.valor;
            break;
            
          case "menorIgual":
            whereClause += ` AND ${alias}.[${columnName}] <= @${paramName}`;
            parametros[paramName] = campo.TipoDato === "IDInterno" || campo.TipoDato === "Numero" ? parseInt(filter.valor) : filter.valor;
            break;
            
          case "entre":
            if (filter.valor && filter.valorHasta) {
              whereClause += ` AND ${alias}.[${columnName}] BETWEEN @${paramName}From AND @${paramName}To`;
              parametros[`${paramName}From`] = campo.TipoDato === "IDInterno" || campo.TipoDato === "Numero" 
                ? parseInt(filter.valor) 
                : filter.valor;
              parametros[`${paramName}To`] = campo.TipoDato === "IDInterno" || campo.TipoDato === "Numero" 
                ? parseInt(filter.valorHasta) 
                : filter.valorHasta;
            }
            break;
        }
        
        paramIndex++;
      }
    }

    // Agregar búsqueda simple si se proporciona
    if (searchTerm && searchTerm.trim()) {
      const searchConditions: string[] = [];
      
      campos.forEach((campo: any) => {
        if (campo.VisibleEnGrilla && campo.TipoDato !== 'Archivo') {
          const columnName = campo.NombreColumna || campo.Nombre;
          searchConditions.push(`CAST(mt.[${columnName}] AS NVARCHAR(MAX)) LIKE @searchTerm`);
        }
      });
      
      if (searchConditions.length > 0) {
        whereClause += ` AND (${searchConditions.join(' OR ')})`;
        parametros['searchTerm'] = `%${searchTerm.trim()}%`;
      }
    }

    // Construir y ejecutar query final
    const finalQuery = `
      SELECT DISTINCT ${selectClause}
      FROM ${fromClause}
      WHERE ${whereClause}
      ORDER BY mt.Id DESC
    `;

    console.log('Query generado:', finalQuery);
    console.log('Parámetros:', parametros);

    const registros = await query(finalQuery, parametros);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        registros,
        campos,
        modulo,
      },
    });
  } catch (error: any) {
    console.error('Error en búsqueda avanzada:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: error.message || 'Error en búsqueda avanzada' },
      { status: 500 }
    );
  }
}
