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
      `SELECT Nombre, TipoDato, ListaId
       FROM TD_CAMPOS
       WHERE ModuloId = @moduloId AND (Visible = 1 OR VisibleEnGrilla = 1)
       ORDER BY Orden`,
      { moduloId: cfg.ModuloId }
    );

    let data: any = {};

    if (cfg.TipoVisualizacion === 'Agrupamiento') {
      // Obtener datos agrupados
      const tableName = cfg.ModuloTabla;
      const campoAgrupamiento = cfg.CampoAgrupamiento;

      if (!tableName || !campoAgrupamiento) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Configuración de agrupamiento inválida' },
          { status: 400 }
        );
      }

      // Verificar si es un campo de lista
      const campo = campos.find((c: any) => c.Nombre === campoAgrupamiento);
      
      if (campo && campo.ListaId) {
        // Si es una lista, hacer JOIN con la tabla de valores
        const agrupados = await query(
          `SELECT 
            lv.Valor as ${campoAgrupamiento},
            COUNT(*) as Total
           FROM ${tableName} t
           LEFT JOIN TD_VALORES_LISTA lv ON t.${campoAgrupamiento} = lv.Id
           WHERE t.Estado = 'Activo'
           GROUP BY lv.Valor
           ORDER BY Total DESC`
        );
        data = { agrupados };
      } else {
        // Si no es una lista, agrupar directamente
        const agrupados = await query(
          `SELECT 
            ${campoAgrupamiento},
            COUNT(*) as Total
           FROM ${tableName}
           WHERE Estado = 'Activo'
           GROUP BY ${campoAgrupamiento}
           ORDER BY Total DESC`
        );
        data = { agrupados };
      }
    } else if (cfg.TipoVisualizacion === 'DetalleFiltrado') {
      // Obtener datos filtrados
      const tableName = cfg.ModuloTabla;
      const campoFiltro = cfg.CampoFiltro;
      const valorFiltro = cfg.ValorFiltro;

      if (!tableName || !campoFiltro || !valorFiltro) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Configuración de filtro inválida' },
          { status: 400 }
        );
      }

      // Obtener campos visibles en grilla
      const camposGrilla = campos.filter((c: any) => c.Nombre !== 'Estado');
      
      // Construir SELECT con JOINs para campos de tipo Lista
      const selects: string[] = ['t.Id', 't.FechaCreacion'];
      const joins: string[] = [];
      let joinCounter = 0;

      camposGrilla.forEach((campo: any) => {
        if (campo.TipoDato === 'Lista' && campo.ListaId) {
          const alias = `lv${joinCounter++}`;
          joins.push(`LEFT JOIN TD_VALORES_LISTA ${alias} ON t.${campo.Nombre} = ${alias}.Id AND ${alias}.ListaId = ${campo.ListaId}`);
          selects.push(`${alias}.Valor as ${campo.Nombre}`);
        } else {
          selects.push(`t.${campo.Nombre}`);
        }
      });

      const selectClause = selects.join(', ');
      const joinClause = joins.join(' ');

      const registros = await query(
        `SELECT TOP 10 ${selectClause}
         FROM ${tableName} t
         ${joinClause}
         WHERE t.${campoFiltro} = @valorFiltro AND t.Estado = 'Activo'
         ORDER BY t.FechaCreacion DESC`,
        { valorFiltro }
      );

      // Obtener el nombre del valor del filtro si es una lista
      const campoFiltroInfo = campos.find((c: any) => c.Nombre === campoFiltro);
      let nombreValorFiltro = valorFiltro;
      
      if (campoFiltroInfo && campoFiltroInfo.TipoDato === 'Lista' && campoFiltroInfo.ListaId) {
        const valorFiltroResult = await query(
          `SELECT Valor FROM TD_VALORES_LISTA WHERE Id = @valorFiltro`,
          { valorFiltro }
        );
        if (valorFiltroResult.length > 0) {
          nombreValorFiltro = valorFiltroResult[0].Valor;
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
