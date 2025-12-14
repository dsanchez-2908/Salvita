import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { ApiResponse } from '@/types';

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
    const parametro = searchParams.get('parametro');

    if (parametro) {
      const result = await query(
        'SELECT * FROM TD_PARAMETROS WHERE Parametro = @parametro',
        { parametro }
      );

      if (result.length === 0) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Parámetro no encontrado' },
          { status: 404 }
        );
      }

      return NextResponse.json<ApiResponse>({
        success: true,
        data: result[0],
      });
    }

    const parametros = await query('SELECT * FROM TD_PARAMETROS ORDER BY Parametro');

    return NextResponse.json<ApiResponse>({
      success: true,
      data: parametros,
    });
  } catch (error: any) {
    console.error('Error obteniendo parámetros:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error en el servidor' },
      { status: 500 }
    );
  }
}
