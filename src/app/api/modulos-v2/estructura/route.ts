import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { ApiResponse } from '@/types';

// GET - Obtener módulos con estructura jerárquica para configuración de roles
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Obtener todos los módulos activos
    const modulos = await query(
      `SELECT 
        Id,
        Nombre,
        NombreTabla,
        Icono,
        Estado,
        Orden
       FROM TD_MODULOS
       WHERE Estado = 'Activo'
       ORDER BY Orden, Nombre`
    );

    // Obtener relaciones entre módulos (quién es hijo de quién)
    const relaciones = await query(
      `SELECT DISTINCT
        ModuloPadreId,
        ModuloHijoId,
        Orden
       FROM TR_MODULO_RELACION
       ORDER BY ModuloPadreId, Orden`
    );

    // Construir mapa de "hijos por padre"
    const hijosPorPadre: Record<number, number[]> = {};
    relaciones.forEach((rel: any) => {
      if (!hijosPorPadre[rel.ModuloPadreId]) {
        hijosPorPadre[rel.ModuloPadreId] = [];
      }
      hijosPorPadre[rel.ModuloPadreId].push(rel.ModuloHijoId);
    });

    // Identificar módulos principales (los que aparecen como padres O los que no son hijos de nadie)
    const todosLosHijos = new Set(relaciones.map((r: any) => r.ModuloHijoId));
    const modulosPrincipales = modulos.filter((m: any) => !todosLosHijos.has(m.Id));

    // Construir estructura jerárquica
    const estructura = modulosPrincipales.map((modulo: any) => {
      const modulosHijos = hijosPorPadre[modulo.Id] || [];
      const hijos = modulosHijos
        .map((hijoId: number) => modulos.find((m: any) => m.Id === hijoId))
        .filter(Boolean);

      return {
        ...modulo,
        Tipo: 'Principal',
        TieneHijos: hijos.length > 0,
        ModulosHijos: hijos.map((hijo: any) => ({
          ...hijo,
          Tipo: 'Secundario',
          ModuloPadreId: modulo.Id
        }))
      };
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: estructura,
    });
  } catch (error: any) {
    console.error('Error obteniendo estructura de módulos:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: error.message || 'Error al obtener módulos' },
      { status: 500 }
    );
  }
}
