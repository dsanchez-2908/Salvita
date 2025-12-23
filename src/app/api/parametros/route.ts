import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { ApiResponse } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parametro = searchParams.get('parametro');

    // Parámetros públicos que no requieren autenticación (para el login)
    const parametrosPublicos = ['Nombre Proyecto', 'Descripcion Login', 'Logo Sistema'];

    // Si se solicita un parámetro específico y es público, permitir sin autenticación
    const esParametroPublico = parametro && parametrosPublicos.includes(parametro);

    if (!esParametroPublico) {
      // Para otros parámetros o listado completo, requerir autenticación
      const user = getUserFromRequest(request);
      if (!user) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'No autenticado' },
          { status: 401 }
        );
      }
    }

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

    // Listar todos los parámetros requiere autenticación
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
// POST - Crear parámetro
export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { Parametro, Valor } = body;

    if (!Parametro || Valor === undefined) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Parámetro y Valor son requeridos' },
        { status: 400 }
      );
    }

    // Verificar si ya existe
    const existente = await query(
      'SELECT Id FROM TD_PARAMETROS WHERE Parametro = @parametro',
      { parametro: Parametro }
    );

    if (existente.length > 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'El parámetro ya existe' },
        { status: 400 }
      );
    }

    await query(
      'INSERT INTO TD_PARAMETROS (Parametro, Valor, FechaCreacion) VALUES (@parametro, @valor, GETDATE())',
      { parametro: Parametro, valor: Valor }
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Parámetro creado exitosamente',
    });
  } catch (error: any) {
    console.error('Error creando parámetro:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error en el servidor' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar parámetro
export async function PUT(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'ID requerido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { Valor } = body;

    if (Valor === undefined) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Valor es requerido' },
        { status: 400 }
      );
    }

    await query(
      'UPDATE TD_PARAMETROS SET Valor = @valor, FechaModificacion = GETDATE() WHERE Id = @id',
      { id: parseInt(id), valor: Valor }
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Parámetro actualizado exitosamente',
    });
  } catch (error: any) {
    console.error('Error actualizando parámetro:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error en el servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar parámetro
export async function DELETE(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'ID requerido' },
        { status: 400 }
      );
    }

    await query('DELETE FROM TD_PARAMETROS WHERE Id = @id', { id: parseInt(id) });

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Parámetro eliminado exitosamente',
    });
  } catch (error: any) {
    console.error('Error eliminando parámetro:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error en el servidor' },
      { status: 500 }
    );
  }
}