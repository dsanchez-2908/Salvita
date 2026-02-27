import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

// GET - Obtener todas las bandejas
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
    const soloActivas = searchParams.get("soloActivas");

    // Si piden solo bandejas activas (para asignación de tareas)
    if (soloActivas === "true") {
      const result = await query(
        `SELECT 
           Id as BandejaId,
           Nombre as NombreBandeja,
           Descripcion as DescripcionBandeja,
           Estado as EstadoBandeja
         FROM TD_BANDEJAS
         WHERE Estado = 'Activa'
         ORDER BY Nombre`,
        {}
      );

      return NextResponse.json<ApiResponse>({
        success: true,
        data: result,
      });
    }

    // Si piden una bandeja específica
    if (id) {
      const bandeja = await query(
        `SELECT * FROM TD_BANDEJAS WHERE Id = @id`,
        { id: parseInt(id) }
      );

      if (bandeja.length === 0) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: "Bandeja no encontrada" },
          { status: 404 }
        );
      }

      // Obtener usuarios asociados
      const usuarios = await query(
        `SELECT u.Id, u.Nombre, u.Usuario 
         FROM TR_BANDEJA_USUARIO bu
         INNER JOIN TD_USUARIOS u ON bu.UsuarioId = u.Id
         WHERE bu.BandejaId = @bandejaId AND u.Estado = 'Activo'
         ORDER BY u.Nombre`,
        { bandejaId: parseInt(id) }
      );

      // Obtener roles asociados
      const roles = await query(
        `SELECT r.Id, r.Nombre 
         FROM TR_BANDEJA_ROL br
         INNER JOIN TD_ROLES r ON br.RolId = r.Id
         WHERE br.BandejaId = @bandejaId AND r.Estado = 'Activo'
         ORDER BY r.Nombre`,
        { bandejaId: parseInt(id) }
      );

      return NextResponse.json<ApiResponse>({
        success: true,
        data: {
          ...bandeja[0],
          Usuarios: usuarios,
          Roles: roles,
        },
      });
    }

    // Listar todas las bandejas
    const bandejas = await query(
      `SELECT 
        b.*,
        (SELECT COUNT(*) FROM TR_BANDEJA_USUARIO bu WHERE bu.BandejaId = b.Id) AS CantidadUsuarios,
        (SELECT COUNT(*) FROM TR_BANDEJA_ROL br WHERE br.BandejaId = b.Id) AS CantidadRoles
       FROM TD_BANDEJAS b
       ORDER BY b.Nombre`
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: bandejas,
    });
  } catch (error) {
    console.error("Error en GET /api/bandejas:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error al obtener bandejas" },
      { status: 500 }
    );
  }
}

// POST - Crear una nueva bandeja
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
    const { Nombre, Descripcion, Estado, Usuarios, Roles } = body;

    // Validar campos requeridos
    if (!Nombre || Nombre.trim() === "") {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "El nombre es requerido" },
        { status: 400 }
      );
    }

    // Verificar si ya existe una bandeja con ese nombre
    const existente = await query(
      `SELECT Id FROM TD_BANDEJAS WHERE Nombre = @nombre`,
      { nombre: Nombre }
    );

    if (existente.length > 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Ya existe una bandeja con ese nombre" },
        { status: 400 }
      );
    }

    // Crear la bandeja
    const resultado = await query(
      `INSERT INTO TD_BANDEJAS (Nombre, Descripcion, Estado, UsuarioCreacion)
       OUTPUT INSERTED.Id
       VALUES (@nombre, @descripcion, @estado, @usuario)`,
      {
        nombre: Nombre,
        descripcion: Descripcion || null,
        estado: Estado || "Activa",
        usuario: user.usuario,
      }
    );

    const bandejaId = resultado[0].Id;

    // Asociar usuarios si hay
    if (Usuarios && Array.isArray(Usuarios) && Usuarios.length > 0) {
      for (const usuarioId of Usuarios) {
        await query(
          `INSERT INTO TR_BANDEJA_USUARIO (BandejaId, UsuarioId, UsuarioAsignacion)
           VALUES (@bandejaId, @usuarioId, @usuario)`,
          {
            bandejaId,
            usuarioId,
            usuario: user.usuario,
          }
        );
      }
    }

    // Asociar roles si hay
    if (Roles && Array.isArray(Roles) && Roles.length > 0) {
      for (const rolId of Roles) {
        await query(
          `INSERT INTO TR_BANDEJA_ROL (BandejaId, RolId, UsuarioAsignacion)
           VALUES (@bandejaId, @rolId, @usuario)`,
          {
            bandejaId,
            rolId,
            usuario: user.usuario,
          }
        );
      }
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { Id: bandejaId },
      message: "Bandeja creada exitosamente",
    });
  } catch (error) {
    console.error("Error en POST /api/bandejas:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error al crear la bandeja" },
      { status: 500 }
    );
  }
}

// PUT - Actualizar una bandeja existente
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
    const { Id, Nombre, Descripcion, Estado, Usuarios, Roles } = body;

    if (!Id) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "ID es requerido" },
        { status: 400 }
      );
    }

    // Verificar si existe
    const existente = await query(
      `SELECT Id FROM TD_BANDEJAS WHERE Id = @id`,
      { id: Id }
    );

    if (existente.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Bandeja no encontrada" },
        { status: 404 }
      );
    }

    // Verificar nombre duplicado (excepto la misma bandeja)
    const nombreDuplicado = await query(
      `SELECT Id FROM TD_BANDEJAS WHERE Nombre = @nombre AND Id != @id`,
      { nombre: Nombre, id: Id }
    );

    if (nombreDuplicado.length > 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Ya existe otra bandeja con ese nombre" },
        { status: 400 }
      );
    }

    // Actualizar bandeja
    await query(
      `UPDATE TD_BANDEJAS 
       SET Nombre = @nombre,
           Descripcion = @descripcion,
           Estado = @estado,
           FechaModificacion = GETDATE(),
           UsuarioModificacion = @usuario
       WHERE Id = @id`,
      {
        id: Id,
        nombre: Nombre,
        descripcion: Descripcion || null,
        estado: Estado || "Activa",
        usuario: user.usuario,
      }
    );

    // Actualizar usuarios asociados
    // Eliminar todos los usuarios actuales
    await query(
      `DELETE FROM TR_BANDEJA_USUARIO WHERE BandejaId = @bandejaId`,
      { bandejaId: Id }
    );

    // Agregar los nuevos usuarios
    if (Usuarios && Array.isArray(Usuarios) && Usuarios.length > 0) {
      for (const usuarioId of Usuarios) {
        await query(
          `INSERT INTO TR_BANDEJA_USUARIO (BandejaId, UsuarioId, UsuarioAsignacion)
           VALUES (@bandejaId, @usuarioId, @usuario)`,
          {
            bandejaId: Id,
            usuarioId,
            usuario: user.usuario,
          }
        );
      }
    }

    // Actualizar roles asociados
    // Eliminar todos los roles actuales
    await query(
      `DELETE FROM TR_BANDEJA_ROL WHERE BandejaId = @bandejaId`,
      { bandejaId: Id }
    );

    // Agregar los nuevos roles
    if (Roles && Array.isArray(Roles) && Roles.length > 0) {
      for (const rolId of Roles) {
        await query(
          `INSERT INTO TR_BANDEJA_ROL (BandejaId, RolId, UsuarioAsignacion)
           VALUES (@bandejaId, @rolId, @usuario)`,
          {
            bandejaId: Id,
            rolId,
            usuario: user.usuario,
          }
        );
      }
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Bandeja actualizada exitosamente",
    });
  } catch (error) {
    console.error("Error en PUT /api/bandejas:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error al actualizar la bandeja" },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar una bandeja
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
      `SELECT COUNT(*) as Total FROM TD_TAREAS WHERE BandejaAsignadaId = @bandejaId`,
      { bandejaId: parseInt(id) }
    );

    if (tareasAsociadas[0].Total > 0) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: "No se puede eliminar la bandeja porque tiene tareas asociadas",
        },
        { status: 400 }
      );
    }

    // Eliminar la bandeja (las relaciones se eliminan en cascada)
    await query(`DELETE FROM TD_BANDEJAS WHERE Id = @id`, {
      id: parseInt(id),
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Bandeja eliminada exitosamente",
    });
  } catch (error) {
    console.error("Error en DELETE /api/bandejas:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Error al eliminar la bandeja" },
      { status: 500 }
    );
  }
}
