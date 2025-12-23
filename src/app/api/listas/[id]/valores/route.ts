import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { getUserFromRequest, registrarTraza } from "@/lib/auth";
import { ApiResponse } from "@/types";

// GET - Obtener valores de una lista
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "No autenticado" },
        { status: 401 }
      );
    }

    const listaId = parseInt(params.id);

    // Obtener valores de la lista
    const valores = await query(
      `SELECT * FROM TD_VALORES_LISTA 
       WHERE ListaId = @listaId AND Estado = 'Activo'
       ORDER BY Orden, Valor`,
      { listaId }
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: valores,
    });
  } catch (error: any) {
    console.error("Error obteniendo valores de lista:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error en el servidor" },
      { status: 500 }
    );
  }
}

// POST - Crear valor de lista
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "No autenticado" },
        { status: 401 }
      );
    }

    const listaId = parseInt(params.id);
    const body = await request.json();
    const { Valor, Orden } = body;

    if (!Valor) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Valor es requerido" },
        { status: 400 }
      );
    }

    // Obtener nombre de la lista para la traza
    const lista = await query(
      "SELECT Nombre FROM TD_LISTAS WHERE Id = @listaId",
      { listaId }
    );

    if (lista.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Lista no encontrada" },
        { status: 404 }
      );
    }

    const nombreLista = lista[0].Nombre;

    // Insertar valor
    const result = await execute(
      `INSERT INTO TD_VALORES_LISTA (ListaId, Valor, Orden, UsuarioCreacion)
       OUTPUT INSERTED.Id
       VALUES (@listaId, @valor, @orden, @usuarioCreacion)`,
      {
        listaId,
        valor: Valor,
        orden: Orden || 0,
        usuarioCreacion: user.usuario,
      }
    );

    const nuevoValorId = result.recordset[0].Id;

    // Registrar traza
    await registrarTraza(
      user.userId,
      "Agregar",
      `Lista: ${nombreLista}`,
      `Valor agregado: ${Valor}`
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { Id: nuevoValorId },
      message: "Valor agregado exitosamente",
    });
  } catch (error: any) {
    console.error("Error agregando valor de lista:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error en el servidor" },
      { status: 500 }
    );
  }
}

// PUT - Actualizar valor de lista
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "No autenticado" },
        { status: 401 }
      );
    }

    const listaId = parseInt(params.id);
    const { searchParams } = new URL(request.url);
    const valorId = searchParams.get("valorId");

    if (!valorId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "ID de valor requerido" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { Valor, Orden, Estado } = body;

    // Obtener nombre de la lista para la traza
    const lista = await query(
      "SELECT Nombre FROM TD_LISTAS WHERE Id = @listaId",
      { listaId }
    );

    if (lista.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Lista no encontrada" },
        { status: 404 }
      );
    }

    const nombreLista = lista[0].Nombre;

    // Actualizar valor
    let updateQuery =
      "UPDATE TD_VALORES_LISTA SET FechaModificacion = GETDATE(), UsuarioModificacion = @usuarioModificacion";
    const updateParams: any = {
      valorId: parseInt(valorId),
      usuarioModificacion: user.usuario,
    };

    if (Valor !== undefined) {
      updateQuery += ", Valor = @valor";
      updateParams.valor = Valor;
    }
    if (Orden !== undefined) {
      updateQuery += ", Orden = @orden";
      updateParams.orden = Orden;
    }
    if (Estado !== undefined) {
      updateQuery += ", Estado = @estado";
      updateParams.estado = Estado;
    }

    updateQuery += " WHERE Id = @valorId";
    await execute(updateQuery, updateParams);

    // Registrar traza
    await registrarTraza(
      user.userId,
      "Modificar",
      `Lista: ${nombreLista}`,
      `Valor modificado (ID: ${valorId}): ${Valor || "actualización"}`
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Valor actualizado exitosamente",
    });
  } catch (error: any) {
    console.error("Error actualizando valor de lista:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error en el servidor" },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar valor de lista
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "No autenticado" },
        { status: 401 }
      );
    }

    const listaId = parseInt(params.id);
    const { searchParams } = new URL(request.url);
    const valorId = searchParams.get("valorId");

    if (!valorId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "ID de valor requerido" },
        { status: 400 }
      );
    }

    // Obtener nombre de la lista y el valor antes de eliminar
    const lista = await query(
      "SELECT Nombre FROM TD_LISTAS WHERE Id = @listaId",
      { listaId }
    );

    if (lista.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Lista no encontrada" },
        { status: 404 }
      );
    }

    const nombreLista = lista[0].Nombre;

    const valor = await query(
      "SELECT Valor FROM TD_VALORES_LISTA WHERE Id = @valorId",
      { valorId: parseInt(valorId) }
    );

    if (valor.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Valor no encontrado" },
        { status: 404 }
      );
    }

    const nombreValor = valor[0].Valor;

    // Eliminar valor
    await execute("DELETE FROM TD_VALORES_LISTA WHERE Id = @valorId", {
      valorId: parseInt(valorId),
    });

    // Registrar traza
    await registrarTraza(
      user.userId,
      "Eliminar",
      `Lista: ${nombreLista}`,
      `Valor eliminado: ${nombreValor}`
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Valor eliminado exitosamente",
    });
  } catch (error: any) {
    console.error("Error eliminando valor de lista:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error en el servidor" },
      { status: 500 }
    );
  }
}
