import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { ApiResponse } from '@/types';

// GET - Obtener registros agrupados de todos los módulos secundarios
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
      `SELECT Id, Nombre, NombreTabla, Icono, Color
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

    // Para cada módulo secundario, obtener sus registros con FechaCreacion
    const registrosAgrupados: any[] = [];

    for (const moduloSec of modulosSecundarios) {
      try {
        // Obtener campos del módulo secundario
        const campos = await query(
          `SELECT Nombre, TipoDato, VisibleEnGrilla, Orden
           FROM TD_MODULOS_CAMPOS
           WHERE ModuloId = @moduloId AND Estado = 'Activo'
           ORDER BY Orden`,
          { moduloId: moduloSec.Id }
        );

        // Construir lista de campos a seleccionar (primeros 5 campos visibles + FechaCreacion)
        const camposVisibles = campos
          .filter((c: any) => c.VisibleEnGrilla)
          .slice(0, 5)
          .map((c: any) => c.Nombre);

        const selectFields = ['Id', 'FechaCreacion', ...camposVisibles].join(', ');

        // Obtener registros del módulo secundario
        const registros = await query(
          `SELECT TOP 100 ${selectFields}
           FROM ${moduloSec.NombreTabla}
           WHERE Estado = 'Activo'
           ORDER BY FechaCreacion DESC`
        );

        // Agregar metadata del módulo a cada registro
        registros.forEach((registro: any) => {
          registrosAgrupados.push({
            ...registro,
            _ModuloId: moduloSec.Id,
            _ModuloNombre: moduloSec.Nombre,
            _ModuloIcono: moduloSec.Icono,
            _ModuloColor: moduloSec.Color,
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
