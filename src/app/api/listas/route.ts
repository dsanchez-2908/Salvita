import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { ApiResponse, CreateListaRequest } from '@/types';

// GET - Obtener listas
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

    if (id) {
      // Obtener una lista específica con sus valores
      const lista = await query(
        'SELECT * FROM TD_LISTAS WHERE Id = @id',
        { id: parseInt(id) }
      );

      if (lista.length === 0) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Lista no encontrada' },
          { status: 404 }
        );
      }

      // Obtener valores de la lista
      const valores = await query(
        `SELECT * FROM TD_VALORES_LISTA 
         WHERE ListaId = @listaId 
         ORDER BY Orden, Valor`,
        { listaId: parseInt(id) }
      );

      return NextResponse.json<ApiResponse>({
        success: true,
        data: { ...lista[0], Valores: valores },
      });
    }

    // Obtener todas las listas
    const listas = await query(
      `SELECT l.*, COUNT(v.Id) as CantidadValores
       FROM TD_LISTAS l
       LEFT JOIN TD_VALORES_LISTA v ON l.Id = v.ListaId AND v.Estado = 'Activo'
       GROUP BY l.Id, l.Nombre, l.Descripcion, l.Estado, l.FechaCreacion, l.FechaModificacion, l.UsuarioCreacion, l.UsuarioModificacion
       ORDER BY l.Nombre`
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: listas,
    });
  } catch (error: any) {
    console.error('Error obteniendo listas:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error en el servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear lista
export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const body: CreateListaRequest = await request.json();
    const { Nombre, Descripcion, Valores } = body;

    if (!Nombre) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Nombre es requerido' },
        { status: 400 }
      );
    }

    // Verificar si la lista ya existe
    const existente = await query(
      'SELECT Id FROM TD_LISTAS WHERE Nombre = @nombre',
      { nombre: Nombre }
    );

    if (existente.length > 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'La lista ya existe' },
        { status: 400 }
      );
    }

    // Insertar lista
    const result = await execute(
      `INSERT INTO TD_LISTAS (Nombre, Descripcion, UsuarioCreacion)
       OUTPUT INSERTED.Id
       VALUES (@nombre, @descripcion, @usuarioCreacion)`,
      {
        nombre: Nombre,
        descripcion: Descripcion || null,
        usuarioCreacion: user.usuario,
      }
    );

    const nuevaListaId = result.recordset[0].Id;

    // Insertar valores
    if (Valores && Valores.length > 0) {
      for (let i = 0; i < Valores.length; i++) {
        await execute(
          `INSERT INTO TD_VALORES_LISTA (ListaId, Valor, Orden, UsuarioCreacion)
           VALUES (@listaId, @valor, @orden, @usuarioCreacion)`,
          {
            listaId: nuevaListaId,
            valor: Valores[i].Valor,
            orden: Valores[i].Orden !== undefined ? Valores[i].Orden : i,
            usuarioCreacion: user.usuario,
          }
        );
      }
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { Id: nuevaListaId },
      message: 'Lista creada exitosamente',
    });
  } catch (error: any) {
    console.error('Error creando lista:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error en el servidor' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar lista
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
        { success: false, error: 'ID de lista requerido' },
        { status: 400 }
      );
    }

    const body: any = await request.json();
    const { Nombre, Descripcion, Estado, Valores } = body;

    // Actualizar lista
    let updateQuery = 'UPDATE TD_LISTAS SET FechaModificacion = GETDATE(), UsuarioModificacion = @usuarioModificacion';
    const params: any = {
      id: parseInt(id),
      usuarioModificacion: user.usuario,
    };

    if (Nombre) {
      updateQuery += ', Nombre = @nombre';
      params.nombre = Nombre;
    }
    if (Descripcion !== undefined) {
      updateQuery += ', Descripcion = @descripcion';
      params.descripcion = Descripcion;
    }
    if (Estado) {
      updateQuery += ', Estado = @estado';
      params.estado = Estado;
    }

    updateQuery += ' WHERE Id = @id';
    await execute(updateQuery, params);

    // Actualizar valores si se proporcionan
    if (Valores) {
      // Eliminar valores existentes
      await execute(
        'DELETE FROM TD_VALORES_LISTA WHERE ListaId = @listaId',
        { listaId: parseInt(id) }
      );

      // Insertar nuevos valores
      for (let i = 0; i < Valores.length; i++) {
        await execute(
          `INSERT INTO TD_VALORES_LISTA (ListaId, Valor, Orden, UsuarioCreacion)
           VALUES (@listaId, @valor, @orden, @usuarioCreacion)`,
          {
            listaId: parseInt(id),
            valor: Valores[i].Valor,
            orden: Valores[i].Orden !== undefined ? Valores[i].Orden : i,
            usuarioCreacion: user.usuario,
          }
        );
      }
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Lista actualizada exitosamente',
    });
  } catch (error: any) {
    console.error('Error actualizando lista:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error en el servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar lista
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
        { success: false, error: 'ID de lista requerido' },
        { status: 400 }
      );
    }

    // Verificar si la lista está siendo usada en campos
    const usada = await query(
      'SELECT COUNT(*) as Cuenta FROM TD_CAMPOS WHERE ListaId = @listaId',
      { listaId: parseInt(id) }
    );

    if (usada[0].Cuenta > 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'La lista está siendo usada en módulos' },
        { status: 400 }
      );
    }

    await execute('DELETE FROM TD_LISTAS WHERE Id = @id', {
      id: parseInt(id),
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Lista eliminada exitosamente',
    });
  } catch (error: any) {
    console.error('Error eliminando lista:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error en el servidor' },
      { status: 500 }
    );
  }
}
