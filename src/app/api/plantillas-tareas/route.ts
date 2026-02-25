import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

// GET - Obtener todas las plantillas de tareas
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "No autorizado" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const soloActivas = searchParams.get("soloActivas") === "true";

    // Si piden una plantilla específica
    if (id) {
      const plantilla = await query(
        `SELECT * FROM TD_PLANTILLA_TAREAS WHERE Id = @id`,
        { id: parseInt(id) }
      );

      if (plantilla.length === 0) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: "Plantilla no encontrada" },
          { status: 404 }
        );
      }

      return NextResponse.json<ApiResponse>({
        success: true,
        data: plantilla[0],
      });
    }

    // Listar plantillas
    let sql = `SELECT * FROM TD_PLANTILLA_TAREAS`;
    
    if (soloActivas) {
      sql += ` WHERE Estado = 'Activo'`;
    }
    
    sql += ` ORDER BY Nombre`;

    const plantillas = await query(sql);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: plantillas,
    });
  } catch (error) {
    console.error("Error en GET /api/plantillas-tareas:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error al obtener plantillas de tareas" },
      { status: 500 }
    );
  }
}

// POST - Crear una nueva plantilla de tarea
export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "No autorizado" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { Nombre, Indicaciones, Estado } = body;

    // Validar campos requeridos
    if (!Nombre || Nombre.trim() === "") {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "El nombre es requerido" },
        { status: 400 }
      );
    }

    // Verificar si ya existe una plantilla con ese nombre
    const existente = await query(
      `SELECT Id FROM TD_PLANTILLA_TAREAS WHERE Nombre = @nombre`,
      { nombre: Nombre }
    );

    if (existente.length > 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Ya existe una plantilla con ese nombre" },
        { status: 400 }
      );
    }

    // Crear la plantilla
    const resultado = await query(
      `INSERT INTO TD_PLANTILLA_TAREAS (Nombre, Indicaciones, Estado, UsuarioCreacion)
       OUTPUT INSERTED.Id
       VALUES (@nombre, @indicaciones, @estado, @usuario)`,
      {
        nombre: Nombre,
        indicaciones: Indicaciones || null,
        estado: Estado || "Activo",
        usuario: user.usuario,
      }
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { Id: resultado[0].Id },
      message: "Plantilla creada exitosamente",
    });
  } catch (error) {
    console.error("Error en POST /api/plantillas-tareas:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error al crear la plantilla" },
      { status: 500 }
    );
  }
}

// PUT - Actualizar una plantilla de tarea
export async function PUT(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "No autorizado" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { Id, Nombre, Indicaciones, Estado } = body;

    if (!Id) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "ID es requerido" },
        { status: 400 }
      );
    }

    // Verificar si existe
    const existente = await query(
      `SELECT Id FROM TD_PLANTILLA_TAREAS WHERE Id = @id`,
      { id: Id }
    );

    if (existente.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Plantilla no encontrada" },
        { status: 404 }
      );
    }

    // Verificar nombre duplicado (excepto la misma plantilla)
    const nombreDuplicado = await query(
      `SELECT Id FROM TD_PLANTILLA_TAREAS WHERE Nombre = @nombre AND Id != @id`,
      { nombre: Nombre, id: Id }
    );

    if (nombreDuplicado.length > 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Ya existe otra plantilla con ese nombre" },
        { status: 400 }
      );
    }

    // Actualizar plantilla
    await query(
      `UPDATE TD_PLANTILLA_TAREAS 
       SET Nombre = @nombre,
           Indicaciones = @indicaciones,
           Estado = @estado,
           FechaModificacion = GETDATE(),
           UsuarioModificacion = @usuario
       WHERE Id = @id`,
      {
        id: Id,
        nombre: Nombre,
        indicaciones: Indicaciones || null,
        estado: Estado || "Activo",
        usuario: user.usuario,
      }
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Plantilla actualizada exitosamente",
    });
  } catch (error) {
    console.error("Error en PUT /api/plantillas-tareas:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error al actualizar la plantilla" },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar una plantilla de tarea
export async function DELETE(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "No autorizado" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "ID es requerido" },
        { status: 400 }
      );
    }

    // Verificar si tiene tareas asociadas
    const tareasAsociadas = await query(
      `SELECT COUNT(*) as Total FROM TD_TAREAS WHERE PlantillaTareaId = @plantillaId`,
      { plantillaId: parseInt(id) }
    );

    if (tareasAsociadas[0].Total > 0) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "No se puede eliminar la plantilla porque tiene tareas asociadas",
        },
        { status: 400 }
      );
    }

    // Eliminar la plantilla
    await query(`DELETE FROM TD_PLANTILLA_TAREAS WHERE Id = @id`, {
      id: parseInt(id),
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Plantilla eliminada exitosamente",
    });
  } catch (error) {
    console.error("Error en DELETE /api/plantillas-tareas:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error al eliminar la plantilla" },
      { status: 500 }
    );
  }
}
