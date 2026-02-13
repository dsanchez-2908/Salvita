import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { ApiResponse } from '@/types';

// GET - Obtener datos para el dashboard
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
    const configId = searchParams.get('configId');

    if (!configId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'ID de configuración requerido' },
        { status: 400 }
      );
    }

    // Obtener configuración
    const config = await query(
      `SELECT dc.*, m.Nombre as ModuloNombre, m.NombreTabla as ModuloTabla
       FROM TD_DASHBOARD_CONFIG dc
       INNER JOIN TD_MODULOS m ON dc.ModuloId = m.Id
       WHERE dc.Id = @configId`,
      { configId: parseInt(configId) }
    );

    if (config.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Configuración no encontrada' },
        { status: 404 }
      );
    }

    const cfg = config[0];

    // Obtener campos del módulo
    const campos = await query(
      `SELECT Nombre, NombreColumna, TipoDato, ListaId, Visible, VisibleEnGrilla
       FROM TD_CAMPOS
       WHERE ModuloId = @moduloId AND (Visible = 1 OR VisibleEnGrilla = 1)
       ORDER BY Orden`,
      { moduloId: cfg.ModuloId }
    );

    // Función helper para convertir valor de filtro si es una lista
    const resolverValorFiltro = async (campoNombre: string, valorFiltro: string) => {
      const campo = campos.find((c: any) => c.Nombre === campoNombre);
      if (campo && campo.TipoDato === 'Lista' && campo.ListaId) {
        // Buscar el ID del valor en la lista
        const resultado = await query(
          `SELECT Id FROM TD_VALORES_LISTA WHERE ListaId = @listaId AND Valor = @valor`,
          { listaId: campo.ListaId, valor: valorFiltro }
        );
        if (resultado.length > 0) {
          return resultado[0].Id.toString();
        }
        return null; // No se encontró el valor
      }
      return valorFiltro; // No es lista, retornar el valor tal cual
    };

    // Función helper para construir cláusula WHERE con operador
    const construirFiltroWhere = async (campoFiltro: string, operador: string, valorFiltro: string) => {
      const valorResuelto = await resolverValorFiltro(campoFiltro, valorFiltro);
      
      if (valorResuelto === null) {
        return { clause: '', params: {} }; // Valor no encontrado, no aplicar filtro
      }

      const campo = campos.find((c: any) => c.Nombre === campoFiltro);
      const nombreColumnaFisica = campo?.NombreColumna || campoFiltro;
      const esNumero = campo && (campo.TipoDato === 'Numero' || campo.TipoDato === 'Lista') || !isNaN(Number(valorResuelto));
      
      let whereClause = '';
      const params: any = {};

      if (operador === 'LIKE') {
        whereClause = `t.[${nombreColumnaFisica}] LIKE @valorFiltro`;
        params.valorFiltro = `%${valorResuelto}%`;
      } else {
        whereClause = `t.[${nombreColumnaFisica}] ${operador} @valorFiltro`;
        params.valorFiltro = esNumero ? parseInt(valorResuelto) : valorResuelto;
      }

      return { clause: whereClause, params };
    };

    let data: any = {};

    if (cfg.TipoVisualizacion === 'Totalizado') {
      // Nuevo tipo: Mostrar total de registros con filtro opcional
      const tableName = cfg.ModuloTabla;

      if (!tableName) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Configuración inválida' },
          { status: 400 }
        );
      }

      let whereClause = "1=1";
      let queryParams: any = {};

      // Aplicar filtro si está activo
      if (cfg.FiltroActivo && cfg.CampoFiltro && cfg.ValorFiltro) {
        const filtro = await construirFiltroWhere(cfg.CampoFiltro, cfg.FiltroOperador || '=', cfg.ValorFiltro);
        if (filtro.clause) {
          whereClause += ` AND ${filtro.clause}`;
          queryParams = { ...queryParams, ...filtro.params };
        }
      }

      const resultado = await query(
        `SELECT COUNT(*) as Total FROM ${tableName} t WHERE ${whereClause}`,
        queryParams
      );

      data = { 
        total: resultado[0]?.Total || 0,
        filtroAplicado: cfg.FiltroActivo && cfg.CampoFiltro ? `${cfg.CampoFiltro} ${cfg.FiltroOperador || '='} ${cfg.ValorFiltro}` : null
      };
    } else if (cfg.TipoVisualizacion === 'Agrupamiento') {
      // Obtener datos agrupados con filtro opcional
      const tableName = cfg.ModuloTabla;
      const campoAgrupamiento = cfg.CampoAgrupamiento;

      if (!tableName || !campoAgrupamiento) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Configuración de agrupamiento inválida' },
          { status: 400 }
        );
      }

      // Construir WHERE clause
      let whereClause = "1=1";
      let queryParams: any = {};

      // Aplicar filtro opcional
      if (cfg.FiltroActivo && cfg.CampoFiltro && cfg.ValorFiltro) {
        const filtro = await construirFiltroWhere(cfg.CampoFiltro, cfg.FiltroOperador || '=', cfg.ValorFiltro);
        if (filtro.clause) {
          whereClause += ` AND ${filtro.clause}`;
          queryParams = { ...queryParams, ...filtro.params };
        }
      }

      // Verificar si es un campo de lista
      const campo = campos.find((c: any) => c.Nombre === campoAgrupamiento);
      const nombreColumnaFisica = campo?.NombreColumna || campoAgrupamiento;
      
      if (campo && campo.ListaId) {
        // Si es una lista, hacer JOIN con la tabla de valores
        const agrupados = await query(
          `SELECT 
            lv.Valor as ${campoAgrupamiento},
            COUNT(*) as Total
           FROM ${tableName} t
           LEFT JOIN TD_VALORES_LISTA lv ON t.[${nombreColumnaFisica}] = lv.Id
           WHERE ${whereClause}
           GROUP BY lv.Valor
           ORDER BY Total DESC`,
          queryParams
        );
        data = { agrupados };
      } else {
        // Si no es una lista, agrupar directamente
        const agrupados = await query(
          `SELECT 
            [${nombreColumnaFisica}] as ${campoAgrupamiento},
            COUNT(*) as Total
           FROM ${tableName} t
           WHERE ${whereClause}
           GROUP BY [${nombreColumnaFisica}]
           ORDER BY Total DESC`,
          queryParams
        );
        data = { agrupados };
      }
    } else if (cfg.TipoVisualizacion === 'DetalleFiltrado') {
      // Obtener datos filtrados con operador condicional y filtro opcional
      const tableName = cfg.ModuloTabla;

      if (!tableName) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Configuración inválida' },
          { status: 400 }
        );
      }

      // Construir WHERE clause
      let whereClause = "1=1";
      let queryParams: any = {};

      // Aplicar filtro si está activo
      if (cfg.FiltroActivo && cfg.CampoFiltro && cfg.ValorFiltro) {
        const filtro = await construirFiltroWhere(cfg.CampoFiltro, cfg.FiltroOperador || '=', cfg.ValorFiltro);
        if (filtro.clause) {
          whereClause += ` AND ${filtro.clause}`;
          queryParams = { ...queryParams, ...filtro.params };
        }
      }

      // Obtener campos visibles en grilla
      const camposGrilla = campos.filter((c: any) => c.VisibleEnGrilla === 1 || c.VisibleEnGrilla === true);
      
      // Construir SELECT con JOINs para campos de tipo Lista
      const selects: string[] = ['t.Id', 't.FechaCreacion'];
      const joins: string[] = [];
      let joinCounter = 0;

      camposGrilla.forEach((campo: any) => {
        if (campo.TipoDato === 'Lista' && campo.ListaId) {
          const alias = `lv${joinCounter++}`;
          joins.push(`LEFT JOIN TD_VALORES_LISTA ${alias} ON t.[${campo.NombreColumna}] = ${alias}.Id AND ${alias}.ListaId = ${campo.ListaId}`);
          selects.push(`${alias}.Valor as [${campo.Nombre}]`);
        } else {
          selects.push(`t.[${campo.NombreColumna}] as [${campo.Nombre}]`);
        }
      });

      const selectClause = selects.join(', ');
      const joinClause = joins.join(' ');

      const registros = await query(
        `SELECT TOP 10 ${selectClause}
         FROM ${tableName} t
         ${joinClause}
         WHERE ${whereClause}
         ORDER BY t.FechaCreacion DESC`,
        queryParams
      );

      // Obtener el nombre del valor del filtro si es una lista y está activo
      let nombreValorFiltro = null;
      if (cfg.FiltroActivo && cfg.CampoFiltro && cfg.ValorFiltro) {
        const campoFiltroInfo = campos.find((c: any) => c.Nombre === cfg.CampoFiltro);
        nombreValorFiltro = cfg.ValorFiltro;
        
        if (campoFiltroInfo && campoFiltroInfo.TipoDato === 'Lista' && campoFiltroInfo.ListaId) {
          const valorFiltroResult = await query(
            `SELECT Valor FROM TD_VALORES_LISTA WHERE ListaId = @listaId AND Valor = @valor`,
            { listaId: campoFiltroInfo.ListaId, valor: cfg.ValorFiltro }
          );
          if (valorFiltroResult.length > 0) {
            nombreValorFiltro = valorFiltroResult[0].Valor;
          }
        }
      }

      data = { registros, campos: camposGrilla, nombreValorFiltro };
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        config: cfg,
        ...data,
      },
    });
  } catch (error: any) {
    console.error('Error obteniendo datos del dashboard:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error en el servidor: ' + error.message },
      { status: 500 }
    );
  }
}
