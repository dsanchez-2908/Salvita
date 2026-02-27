import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

// GET /api/tareas - Obtener tareas (personales o por bandeja)
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "No autorizado" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const bandejaId = searchParams.get("bandejaId");
    const estado = searchParams.get("estado"); // Pendiente, Tomada, Completada, Rechazada
    const tipoAsignacion = searchParams.get("tipoAsignacion"); // Usuario, Bandeja

    let sql = `
      SELECT 
        t.Id as TareaId,
        t.PlantillaTareaId,
        t.TipoAsignacion,
        t.UsuarioAsignadoId,
        t.BandejaAsignadaId,
        t.FechaCreacion,
        t.FechaVencimiento,
        t.Estado,
        t.Observaciones,
        t.UsuarioTomadaPorId as TomoId,
        t.FechaTomada as FechaTomo,
        t.FechaCompletado,
        t.FechaRechazo,
        t.UsuarioCreacion as CreadoPorNombre,
        pt.Nombre as PlantillaNombre,
        pt.Indicaciones as Instrucciones,
        uAsignado.Nombre as UsuarioAsignadoNombre,
        b.Nombre as BandejaAsignadaNombre,
        uTomo.Nombre as TomoNombre,
        (SELECT COUNT(*) FROM TR_TAREA_REGISTRO WHERE TareaId = t.Id) as NumeroRegistros
      FROM TD_TAREAS t
      INNER JOIN TD_PLANTILLA_TAREAS pt ON t.PlantillaTareaId = pt.Id
      LEFT JOIN TD_USUARIOS uAsignado ON t.UsuarioAsignadoId = uAsignado.Id
      LEFT JOIN TD_BANDEJAS b ON t.BandejaAsignadaId = b.Id
      LEFT JOIN TD_USUARIOS uTomo ON t.UsuarioTomadaPorId = uTomo.Id
      WHERE 1=1
    `;

    const params: any = {};

    // Filtrar por bandeja específica
    if (bandejaId) {
      sql += ` AND t.TipoAsignacion = 'Bandeja' AND t.BandejaAsignadaId = @bandejaId`;
      params.bandejaId = parseInt(bandejaId);
    } else if (tipoAsignacion === "Usuario") {
      // Solo tareas asignadas directamente al usuario
      sql += ` AND t.TipoAsignacion = 'Usuario' AND t.UsuarioAsignadoId = @userId`;
      params.userId = user.userId;
    } else {
      // Tareas personales (directas + bandejas accesibles)
      sql += ` AND (
        (t.TipoAsignacion = 'Usuario' AND t.UsuarioAsignadoId = @userId) 
        OR 
        (t.TipoAsignacion = 'Bandeja' AND t.BandejaAsignadaId IN (
          SELECT BandejaId FROM TR_BANDEJA_USUARIO WHERE UsuarioId = @userId
          UNION
          SELECT BandejaId FROM TR_BANDEJA_ROL 
          WHERE RolId IN (SELECT RolId FROM TR_USUARIO_ROL WHERE UsuarioId = @userId)
        ))
      )`;
      params.userId = user.userId;
    }

    // Filtrar por estado
    if (estado) {
      sql += ` AND t.Estado = @estado`;
      params.estado = estado;
    }

    sql += ` ORDER BY t.FechaCreacion DESC`;

    const result = await query(sql, params);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Error en GET /api/tareas:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al obtener tareas" },
      { status: 500 }
    );
  }
}

// POST /api/tareas - Crear nueva tarea desde registros temporales
export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "No autorizado" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      PlantillaId,
      Observaciones,
      FechaVencimiento,
      TipoAsignacion, // "Usuario" o "Bandeja"
      UsuarioAsignadoId,
      BandejaAsignadaId,
      IniciarInmediatamente,
      CrearTareasPorRegistro, // true = una tarea por registro, false = una tarea con todos
    } = body;

    // Validaciones
    if (!PlantillaId) {
      return NextResponse.json(
        { success: false, error: "PlantillaId es obligatorio" },
        { status: 400 }
      );
    }

    if (TipoAsignacion !== "Usuario" && TipoAsignacion !== "Bandeja") {
      return NextResponse.json(
        { success: false, error: "TipoAsignacion debe ser 'Usuario' o 'Bandeja'" },
        { status: 400 }
      );
    }

    if (TipoAsignacion === "Usuario" && !UsuarioAsignadoId) {
      return NextResponse.json(
        { success: false, error: "UsuarioAsignadoId es obligatorio cuando TipoAsignacion es 'Usuario'" },
        { status: 400 }
      );
    }

    if (TipoAsignacion === "Bandeja" && !BandejaAsignadaId) {
      return NextResponse.json(
        { success: false, error: "BandejaAsignadaId es obligatorio cuando TipoAsignacion es 'Bandeja'" },
        { status: 400 }
      );
    }

    // Obtener registros temporales del usuario
    const registrosTemporales = await query(
      `SELECT * FROM TR_TAREA_TEMPORAL_REGISTROS WHERE UsuarioId = @userId`,
      { userId: user.userId }
    );

    // Validar que todos sean del mismo módulo (si hay registros)
    let moduloId: number | null = null;
    if (registrosTemporales.length > 0) {
      moduloId = registrosTemporales[0].ModuloId;
      const todosMismoModulo = registrosTemporales.every(
        (r: any) => r.ModuloId === moduloId
      );

      if (!todosMismoModulo) {
        return NextResponse.json(
          { success: false, error: "Todos los registros deben ser del mismo módulo" },
          { status: 400 }
        );
      }
    }

    // MODO 1: Crear una tarea por cada registro
    if (CrearTareasPorRegistro && registrosTemporales.length > 1) {
      const tareasCreadas = [];

      for (const registro of registrosTemporales) {
        // Crear la tarea
        const insertTareaResult = await execute(
          `
          INSERT INTO TD_TAREAS (
            PlantillaTareaId,
            TipoAsignacion,
            UsuarioAsignadoId,
            BandejaAsignadaId,
            Estado,
            Observaciones,
            FechaVencimiento,
            UsuarioCreacion,
            FechaCreacion
          )
          OUTPUT INSERTED.Id
          VALUES (
            @plantillaTareaId, @tipoAsignacion,
            @usuarioAsignadoId, @bandejaAsignadaId,
            @estado, @observaciones, @fechaVencimiento,
            @usuarioCreacion, GETDATE()
          )
          `,
          {
            plantillaTareaId: PlantillaId,
            tipoAsignacion: TipoAsignacion,
            usuarioAsignadoId: TipoAsignacion === "Usuario" ? UsuarioAsignadoId : null,
            bandejaAsignadaId: TipoAsignacion === "Bandeja" ? BandejaAsignadaId : null,
            estado: IniciarInmediatamente && TipoAsignacion === "Usuario" ? "Tomada" : "Pendiente",
            observaciones: Observaciones || null,
            fechaVencimiento: FechaVencimiento || null,
            usuarioCreacion: user.nombre,
          }
        );

        const tareaId = insertTareaResult.recordset[0].Id;
        tareasCreadas.push(tareaId);

        // Vincular solo este registro a la tarea
        await query(
          `
          INSERT INTO TR_TAREA_REGISTRO (TareaId, ModuloId, RegistroId)
          VALUES (@tareaId, @moduloId, @registroId)
          `,
          {
            tareaId: tareaId,
            moduloId: registro.ModuloId,
            registroId: registro.RegistroId,
          }
        );

        // Si se inicia inmediatamente
        if (IniciarInmediatamente && TipoAsignacion === "Usuario") {
          await query(
            `
            UPDATE TD_TAREAS 
            SET UsuarioTomadaPorId = @userId, FechaTomada = GETDATE()
            WHERE Id = @tareaId
            `,
            {
              userId: user.userId,
              tareaId: tareaId,
            }
          );

          await query(
            `
            INSERT INTO TD_TAREA_HISTORIAL (
              TareaId, UsuarioId, Usuario, Accion, Detalle, FechaHora
            )
            VALUES (@tareaId, @userId, @usuario, 'Tomar', 'Tarea iniciada automáticamente al crear', GETDATE())
            `,
            {
              tareaId: tareaId,
              userId: user.userId,
              usuario: user.nombre,
            }
          );
        }

        // Registrar en historial la creación
        await query(
          `
          INSERT INTO TD_TAREA_HISTORIAL (
            TareaId, UsuarioId, Usuario, Accion, Detalle, FechaHora
          )
          VALUES (@tareaId, @userId, @usuario, 'Crear', @detalle, GETDATE())
          `,
          {
            tareaId: tareaId,
            userId: user.userId,
            usuario: user.nombre,
            detalle: 'Tarea creada con 1 registro',
          }
        );
      }

      // Limpiar registros temporales del usuario
      await query(
        `DELETE FROM TR_TAREA_TEMPORAL_REGISTROS WHERE UsuarioId = @userId`,
        { userId: user.userId }
      );

      return NextResponse.json({
        success: true,
        message: `${tareasCreadas.length} tareas creadas exitosamente`,
        tareasCreadas: tareasCreadas.length,
        TareaIds: tareasCreadas,
      });
    }

    // MODO 2: Crear una sola tarea con todos los registros (comportamiento original)
    const insertTareaResult = await execute(
      `
      INSERT INTO TD_TAREAS (
        PlantillaTareaId,
        TipoAsignacion,
        UsuarioAsignadoId,
        BandejaAsignadaId,
        Estado,
        Observaciones,
        FechaVencimiento,
        UsuarioCreacion,
        FechaCreacion
      )
      OUTPUT INSERTED.Id
      VALUES (
        @plantillaTareaId, @tipoAsignacion,
        @usuarioAsignadoId, @bandejaAsignadaId,
        @estado, @observaciones, @fechaVencimiento,
        @usuarioCreacion, GETDATE()
      )
      `,
      {
        plantillaTareaId: PlantillaId,
        tipoAsignacion: TipoAsignacion,
        usuarioAsignadoId: TipoAsignacion === "Usuario" ? UsuarioAsignadoId : null,
        bandejaAsignadaId: TipoAsignacion === "Bandeja" ? BandejaAsignadaId : null,
        estado: IniciarInmediatamente && TipoAsignacion === "Usuario" ? "Tomada" : "Pendiente",
        observaciones: Observaciones || null,
        fechaVencimiento: FechaVencimiento || null,
        usuarioCreacion: user.nombre,
      }
    );

    const tareaId = insertTareaResult.recordset[0].Id;

    // Vincular registros a la tarea (solo si hay registros)
    if (registrosTemporales.length > 0) {
      for (const registro of registrosTemporales) {
        await query(
          `
          INSERT INTO TR_TAREA_REGISTRO (TareaId, ModuloId, RegistroId)
          VALUES (@tareaId, @moduloId, @registroId)
          `,
          {
            tareaId: tareaId,
            moduloId: registro.ModuloId,
            registroId: registro.RegistroId,
          }
        );
      }
    }

    // Si se inicia inmediatamente, registrar acción
    if (IniciarInmediatamente && TipoAsignacion === "Usuario") {
      await query(
        `
        UPDATE TD_TAREAS 
        SET UsuarioTomadaPorId = @userId, FechaTomada = GETDATE()
        WHERE Id = @tareaId
        `,
        {
          userId: user.userId,
          tareaId: tareaId,
        }
      );

      await query(
        `
        INSERT INTO TD_TAREA_HISTORIAL (
          TareaId, UsuarioId, Usuario, Accion, Detalle, FechaHora
        )
        VALUES (@tareaId, @userId, @usuario, 'Tomar', 'Tarea iniciada automáticamente al crear', GETDATE())
        `,
        {
          tareaId: tareaId,
          userId: user.userId,
          usuario: user.nombre,
        }
      );
    }

    // Registrar en historial la creación
    await query(
      `
      INSERT INTO TD_TAREA_HISTORIAL (
        TareaId, UsuarioId, Usuario, Accion, Detalle, FechaHora
      )
      VALUES (@tareaId, @userId, @usuario, 'Crear', @detalle, GETDATE())
      `,
      {
        tareaId: tareaId,
        userId: user.userId,
        usuario: user.nombre,
        detalle: registrosTemporales.length > 0 
          ? `Tarea creada con ${registrosTemporales.length} registro(s)`
          : 'Tarea creada sin registros asociados',
      }
    );

    // Limpiar registros temporales del usuario
    await query(
      `DELETE FROM TR_TAREA_TEMPORAL_REGISTROS WHERE UsuarioId = @userId`,
      { userId: user.userId }
    );

    return NextResponse.json({
      success: true,
      message: IniciarInmediatamente
        ? "Tarea creada e iniciada exitosamente"
        : "Tarea creada exitosamente",
      TareaId: tareaId,
    });
  } catch (error: any) {
    console.error("Error en POST /api/tareas:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al crear tarea" },
      { status: 500 }
    );
  }
}
