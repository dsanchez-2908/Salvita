import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const result = await query<{ Parametro: string; Valor: string }>(
      `SELECT Parametro, Valor 
       FROM TD_PARAMETROS 
       WHERE Parametro IN (
         'URL Token',
         'Usuario Token',
         'Clave Token',
         'URL BASE Agregar Documento',
         'URL BASE Visor',
         'Codigo libreria',
         'Codigo de clase'
       )
       ORDER BY Parametro`
    );

    const params: Record<string, string> = {};
    result.forEach(row => {
      params[row.Parametro] = row.Valor;
    });

    return NextResponse.json({
      success: true,
      params,
      configured: Object.keys(params).length === 7,
    });
  } catch (error: any) {
    console.error('Error obteniendo parámetros:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
