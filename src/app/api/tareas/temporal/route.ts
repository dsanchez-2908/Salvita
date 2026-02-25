import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

// GET - Obtener registros temporales del usuario
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "No autorizado" },
        { status: 401 }
      );
    }

    // Obtener registros temporales del usuario
    const registros = await query(
      `SELECT 
        tr.Id,
        tr.ModuloId,
        tr.RegistroId,
        tr.FechaAgregado,
        m.Nombre as ModuloNombre,
        m.NombreTabla as ModuloNombreTabla,
        'Registro #' + CAST(tr.RegistroId AS VARCHAR) as RegistroDescripcion
       FROM TR_TAREA_TEMPORAL_REGISTROS tr
       INNER JOIN TD_MODULOS m ON tr.ModuloId = m.Id
       WHERE tr.UsuarioId = @usuarioId
       ORDER BY tr.FechaAgregado DESC`,
      { usuarioId: user.userId }
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: registros,
    });
  } catch (error) {
    console.error("Error en GET /api/tareas/temporal:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error al obtener registros temporales" },
      { status: 500 }
    );
  }
}

// POST - Agregar registros a la tabla temporal
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
    const { ModuloId, RegistroIds } = body;

    if (!ModuloId || !RegistroIds || !Array.isArray(RegistroIds)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Datos inválidos" },
        { status: 400 }
      );
    }

    // Verificar si ya hay registros de otro módulo
    const registrosExistentes = await query(
      `SELECT DISTINCT ModuloId 
       FROM TR_TAREA_TEMPORAL_REGISTROS 
       WHERE UsuarioId = @usuarioId`,
      { usuarioId: user.userId }
    );

    if (registrosExistentes.length > 0 && registrosExistentes[0].ModuloId !== ModuloId) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "Solo puedes agregar registros del mismo módulo. Limpia la selección actual primero.",
        },
        { status: 400 }
      );
    }

    // Agregar registros (ignorar duplicados)
    let agregados = 0;
    for (const registroId of RegistroIds) {
      try {
        await query(
          `INSERT INTO TR_TAREA_TEMPORAL_REGISTROS (UsuarioId, ModuloId, RegistroId)
           VALUES (@usuarioId, @moduloId, @registroId)`,
          {
            usuarioId: user.userId,
            moduloId: ModuloId,
            registroId,
          }
        );
        agregados++;
      } catch (err: any) {
        // Ignorar errores de clave duplicada (constraint UNIQUE)
        if (!err.message.includes("UQ_Usuario_Modulo_Registro")) {
          throw err;
        }
      }
    }

    // Obtener cantidad total
    const total = await query(
      `SELECT COUNT(*) as Total 
       FROM TR_TAREA_TEMPORAL_REGISTROS 
       WHERE UsuarioId = @usuarioId`,
      { usuarioId: user.userId }
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      message: `${agregados} registro(s) agregado(s)`,
      data: { cantidad: total[0].Total },
    });
  } catch (error) {
    console.error("Error en POST /api/tareas/temporal:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error al agregar registros" },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar registros de la tabla temporal
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
    const limpiar = searchParams.get("limpiar") === "true";

    if (limpiar) {
      // Eliminar todos los registros temporales del usuario
      await query(
        `DELETE FROM TR_TAREA_TEMPORAL_REGISTROS WHERE UsuarioId = @usuarioId`,
        { usuarioId: user.userId }
      );

      return NextResponse.json<ApiResponse>({
        success: true,
        message: "Selección limpiada exitosamente",
      });
    }

    if (id) {
      // Eliminar un registro específico
      await query(
        `DELETE FROM TR_TAREA_TEMPORAL_REGISTROS 
         WHERE Id = @id AND UsuarioId = @usuarioId`,
        {
          id: parseInt(id),
          usuarioId: user.userId,
        }
      );

      return NextResponse.json<ApiResponse>({
        success: true,
        message: "Registro eliminado de la selección",
      });
    }

    return NextResponse.json<ApiResponse>(
      { success: false, error: "Parámetros inválidos" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error en DELETE /api/tareas/temporal:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error al eliminar registros" },
      { status: 500 }
    );
  }
}
