import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

// PUT /api/tareas/[id]/registro/[registroId] - Actualizar estado y observaciones de un registro
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; registroId: string } }
) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "No autorizado" },
        { status: 401 }
      );
    }

    const tareaId = parseInt(params.id);
    const tareaRegistroId = parseInt(params.registroId);
    const body = await request.json();
    const { estado, observaciones } = body;

    // Validar estado
    if (!['Pendiente', 'Finalizada', 'Rechazada'].includes(estado)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Estado inválido" },
        { status: 400 }
      );
    }

    // Actualizar el registro
    await query(
      `UPDATE TR_TAREA_REGISTRO 
       SET Estado = @estado, 
           Observaciones = @observaciones,
           FechaFinalizacion = CASE WHEN @estado = 'Finalizada' THEN GETDATE() ELSE FechaFinalizacion END
       WHERE Id = @tareaRegistroId AND TareaId = @tareaId`,
      {
        estado,
        observaciones: observaciones || null,
        tareaRegistroId,
        tareaId,
      }
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Registro actualizado exitosamente",
    });
  } catch (error: any) {
    console.error("Error en PUT /api/tareas/[id]/registro/[registroId]:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: error.message || "Error al actualizar registro" },
      { status: 500 }
    );
  }
}
