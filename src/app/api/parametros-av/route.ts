import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { ApiResponse } from '@/types';

// GET - Obtener parámetros del asistente virtual
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
    const id = searchParams.get('id');
    const moduloId = searchParams.get('moduloId');

    if (id) {
      // Obtener una configuración específica por ID
      const result = await query(
        `SELECT p.*, m.Nombre as ModuloNombre, m.Icono as ModuloIcono
         FROM TD_PARAMETROS_AV p
         INNER JOIN TD_MODULOS m ON p.ModuloId = m.Id
         WHERE p.Id = @id`,
        { id: parseInt(id) }
      );

      if (result.length === 0) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Configuración no encontrada' },
          { status: 404 }
        );
      }

      return NextResponse.json<ApiResponse>({
        success: true,
        data: result[0],
      });
    }

    if (moduloId) {
      // Obtener configuración por módulo específico
      const result = await query(
        `SELECT p.*, m.Nombre as ModuloNombre, m.Icono as ModuloIcono
         FROM TD_PARAMETROS_AV p
         INNER JOIN TD_MODULOS m ON p.ModuloId = m.Id
         WHERE p.ModuloId = @moduloId`,
        { moduloId: parseInt(moduloId) }
      );

      if (result.length === 0) {
        return NextResponse.json<ApiResponse>({
          success: true,
          data: null, // No hay configuración para este módulo
        });
      }

      return NextResponse.json<ApiResponse>({
        success: true,
        data: result[0],
      });
    }

    // Listar todas las configuraciones con información del módulo
    const parametros = await query(
      `SELECT 
        p.*,
        m.Nombre as ModuloNombre,
        m.Icono as ModuloIcono,
        m.MostrarEnMenu
       FROM TD_PARAMETROS_AV p
       INNER JOIN TD_MODULOS m ON p.ModuloId = m.Id
       ORDER BY m.Orden, m.Nombre`
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: parametros,
    });
  } catch (error: any) {
    console.error('Error obteniendo parámetros AV:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error en el servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear parámetro del asistente virtual
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
    const { ModuloId, Prompt, Temperatura, MaxTokens, Modelo, Estado } = body;

    if (!ModuloId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'ModuloId es requerido' },
        { status: 400 }
      );
    }

    // Verificar si ya existe configuración para este módulo
    const existente = await query(
      'SELECT Id FROM TD_PARAMETROS_AV WHERE ModuloId = @moduloId',
      { moduloId: ModuloId }
    );

    if (existente.length > 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Ya existe una configuración para este módulo' },
        { status: 400 }
      );
    }

    await query(
      `INSERT INTO TD_PARAMETROS_AV 
       (ModuloId, Prompt, Temperatura, MaxTokens, Modelo, Estado, FechaCreacion, UsuarioCreacion)
       VALUES 
       (@moduloId, @prompt, @temperatura, @maxTokens, @modelo, @estado, GETDATE(), @usuario)`,
      {
        moduloId: ModuloId,
        prompt: Prompt || null,
        temperatura: Temperatura || null,
        maxTokens: MaxTokens || null,
        modelo: Modelo || null,
        estado: Estado || 'Activo',
        usuario: user.usuario,
      }
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Configuración del Asistente Virtual creada exitosamente',
    });
  } catch (error: any) {
    console.error('Error creando parámetros AV:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error en el servidor' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar parámetro del asistente virtual
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
    const { Prompt, Temperatura, MaxTokens, Modelo, Estado } = body;

    await query(
      `UPDATE TD_PARAMETROS_AV 
       SET Prompt = @prompt,
           Temperatura = @temperatura,
           MaxTokens = @maxTokens,
           Modelo = @modelo,
           Estado = @estado,
           FechaModificacion = GETDATE(),
           UsuarioModificacion = @usuario
       WHERE Id = @id`,
      {
        id: parseInt(id),
        prompt: Prompt || null,
        temperatura: Temperatura || null,
        maxTokens: MaxTokens || null,
        modelo: Modelo || null,
        estado: Estado || 'Activo',
        usuario: user.usuario,
      }
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Configuración del Asistente Virtual actualizada exitosamente',
    });
  } catch (error: any) {
    console.error('Error actualizando parámetros AV:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error en el servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar parámetro del asistente virtual
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

    await query('DELETE FROM TD_PARAMETROS_AV WHERE Id = @id', { id: parseInt(id) });

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Configuración del Asistente Virtual eliminada exitosamente',
    });
  } catch (error: any) {
    console.error('Error eliminando parámetros AV:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error en el servidor' },
      { status: 500 }
    );
  }
}
