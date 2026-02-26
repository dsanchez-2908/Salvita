import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { obtenerPermisosTareas } from '@/lib/tareas-permissions';
import { ApiResponse } from '@/types';

/**
 * GET - Obtener permisos de tareas del usuario actual
 */
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const permisos = await obtenerPermisosTareas(user.userId);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: permisos,
    });
  } catch (error: any) {
    console.error('Error obteniendo permisos de tareas:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error en el servidor' },
      { status: 500 }
    );
  }
}
