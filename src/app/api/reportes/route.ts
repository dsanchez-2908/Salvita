import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { getUserFromRequest, registrarTraza } from '@/lib/auth';
import { ApiResponse } from '@/types';

// GET - Obtener reportes
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
    const porRol = searchParams.get('porRol'); // Para obtener reportes según rol del usuario

    if (id) {
      // Obtener un reporte específico
      const reporte = await query(
        'SELECT * FROM TD_REPORTES WHERE Id = @id',
        { id: parseInt(id) }
      );

      if (reporte.length === 0) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Reporte no encontrado' },
          { status: 404 }
        );
      }

      return NextResponse.json<ApiResponse>({
        success: true,
        data: reporte[0],
      });
    }

    if (porRol === 'true') {
      // Si es administrador, mostrar todos los reportes activos
      const isAdmin = user.roles?.includes('Administrador');
      
      if (isAdmin) {
        const reportes = await query(
          `SELECT * FROM TD_REPORTES 
           WHERE Estado = 'Activo'
           ORDER BY Nombre`
        );
        
        return NextResponse.json<ApiResponse>({
          success: true,
          data: reportes,
        });
      }
      
      // Para usuarios no admin, obtener reportes permitidos según sus roles
      const reportes = await query(
        `SELECT DISTINCT r.* 
         FROM TD_REPORTES r
         INNER JOIN TR_ROL_REPORTE rr ON r.Id = rr.ReporteId
         INNER JOIN TR_USUARIO_ROL ur ON rr.RolId = ur.RolId
         WHERE ur.UsuarioId = @usuarioId
         AND r.Estado = 'Activo'
         ORDER BY r.Nombre`,
        { usuarioId: user.userId }
      );

      return NextResponse.json<ApiResponse>({
        success: true,
        data: reportes,
      });
    }

    // Obtener todos los reportes
    const reportes = await query(
      'SELECT * FROM TD_REPORTES ORDER BY Nombre'
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: reportes,
    });
  } catch (error: any) {
    console.error('Error obteniendo reportes:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error en el servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear reporte
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
    const { Nombre, Tipo, Query, StoreProcedure, APIEndpoint, Descripcion } = body;

    if (!Nombre) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Nombre es requerido' },
        { status: 400 }
      );
    }

    if (!Tipo) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Tipo es requerido' },
        { status: 400 }
      );
    }

    // Validar que según el tipo, se proporcione el campo correspondiente
    if (Tipo === 'Query' && !Query) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Query es requerida para tipo Query' },
        { status: 400 }
      );
    }

    if (Tipo === 'StoreProcedure' && !StoreProcedure) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'StoreProcedure es requerido para tipo StoreProcedure' },
        { status: 400 }
      );
    }

    if (Tipo === 'API' && !APIEndpoint) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'APIEndpoint es requerido para tipo API' },
        { status: 400 }
      );
    }

    // Verificar si el reporte ya existe
    const existente = await query(
      'SELECT Id FROM TD_REPORTES WHERE Nombre = @nombre',
      { nombre: Nombre }
    );

    if (existente.length > 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'El reporte ya existe' },
        { status: 400 }
      );
    }

    // Insertar reporte
    const result = await execute(
      `INSERT INTO TD_REPORTES (Nombre, Tipo, Query, StoreProcedure, APIEndpoint, Descripcion, UsuarioCreacion)
       OUTPUT INSERTED.Id
       VALUES (@nombre, @tipo, @query, @storeProcedure, @apiEndpoint, @descripcion, @usuarioCreacion)`,
      {
        nombre: Nombre,
        tipo: Tipo,
        query: Query || null,
        storeProcedure: StoreProcedure || null,
        apiEndpoint: APIEndpoint || null,
        descripcion: Descripcion || null,
        usuarioCreacion: user.usuario,
      }
    );

    const nuevoReporteId = result.recordset[0].Id;

    // Registrar traza
    await registrarTraza(
      user.userId,
      'Crear',
      'Reportes',
      `Reporte creado: ${Nombre} (Tipo: ${Tipo})`
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { Id: nuevoReporteId },
      message: 'Reporte creado exitosamente',
    });
  } catch (error: any) {
    console.error('Error creando reporte:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error en el servidor' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar reporte
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
        { success: false, error: 'ID es requerido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { Nombre, Tipo, Query, StoreProcedure, APIEndpoint, Descripcion, Estado } = body;

    if (!Nombre) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Nombre es requerido' },
        { status: 400 }
      );
    }

    // Validar que según el tipo, se proporcione el campo correspondiente
    if (Tipo === 'Query' && !Query) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Query es requerida para tipo Query' },
        { status: 400 }
      );
    }

    if (Tipo === 'StoreProcedure' && !StoreProcedure) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'StoreProcedure es requerido para tipo StoreProcedure' },
        { status: 400 }
      );
    }

    if (Tipo === 'API' && !APIEndpoint) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'APIEndpoint es requerido para tipo API' },
        { status: 400 }
      );
    }

    // Verificar si existe otro reporte con el mismo nombre
    const existente = await query(
      'SELECT Id FROM TD_REPORTES WHERE Nombre = @nombre AND Id != @id',
      { nombre: Nombre, id: parseInt(id) }
    );

    if (existente.length > 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Ya existe otro reporte con ese nombre' },
        { status: 400 }
      );
    }

    // Actualizar reporte
    await execute(
      `UPDATE TD_REPORTES 
       SET Nombre = @nombre,
           Tipo = @tipo,
           Query = @query,
           StoreProcedure = @storeProcedure,
           APIEndpoint = @apiEndpoint,
           Descripcion = @descripcion,
           Estado = @estado,
           FechaModificacion = GETDATE(),
           UsuarioModificacion = @usuarioModificacion
       WHERE Id = @id`,
      {
        id: parseInt(id),
        nombre: Nombre,
        tipo: Tipo,
        query: Query || null,
        storeProcedure: StoreProcedure || null,
        apiEndpoint: APIEndpoint || null,
        descripcion: Descripcion || null,
        estado: Estado || 'Activo',
        usuarioModificacion: user.usuario,
      }
    );

    // Registrar traza
    await registrarTraza(
      user.userId,
      'Modificar',
      'Reportes',
      `Reporte modificado: ${Nombre} (Tipo: ${Tipo})`
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Reporte actualizado exitosamente',
    });
  } catch (error: any) {
    console.error('Error actualizando reporte:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error en el servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar reporte
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
        { success: false, error: 'ID es requerido' },
        { status: 400 }
      );
    }

    // Obtener información del reporte antes de eliminarlo
    const reporte = await query(
      'SELECT Nombre FROM TD_REPORTES WHERE Id = @id',
      { id: parseInt(id) }
    );

    if (reporte.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Reporte no encontrado' },
        { status: 404 }
      );
    }

    // Eliminar reporte (las relaciones se eliminan por CASCADE)
    await execute(
      'DELETE FROM TD_REPORTES WHERE Id = @id',
      { id: parseInt(id) }
    );

    // Registrar traza
    await registrarTraza(
      user.userId,
      'Eliminar',
      'Reportes',
      `Reporte eliminado: ${reporte[0].Nombre}`
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Reporte eliminado exitosamente',
    });
  } catch (error: any) {
    console.error('Error eliminando reporte:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error en el servidor' },
      { status: 500 }
    );
  }
}
