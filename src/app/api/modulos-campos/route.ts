import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { ApiResponse } from '@/types';

// GET - Obtener módulos activos con sus campos (para selectores de listas dinámicas)
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
    const moduloId = searchParams.get('moduloId');

    if (moduloId) {
      // Obtener campos de un módulo específico
      const campos = await query(
        `SELECT Id, Nombre, NombreColumna, TipoDato, Orden
         FROM TD_CAMPOS
         WHERE ModuloId = @moduloId
         ORDER BY Orden, Nombre`,
        { moduloId: parseInt(moduloId) }
      );

      return NextResponse.json<ApiResponse>({
        success: true,
        data: campos,
      });
    }

    // Obtener todos los módulos activos
    const modulos = await query(
      `SELECT Id, Nombre, NombreTabla, Icono, Orden
       FROM TD_MODULOS
       WHERE Estado = 'Activo'
       ORDER BY Nombre`
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: modulos,
    });
  } catch (error: any) {
    console.error('Error obteniendo módulos y campos:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error en el servidor' },
      { status: 500 }
    );
  }
}
