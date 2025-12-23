import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, verificarPermiso } from "@/lib/auth";
import sql from "mssql";
import { getConnection } from "@/lib/db";

// GET - Consultar trazas con filtros
export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "No autorizado" },
        { status: 401 }
      );
    }

    // Obtener el ID del módulo de Trazas
    const pool = await getConnection();
    const trazasModulo = await pool
      .request()
      .query("SELECT Id FROM TD_MODULOS WHERE Nombre = 'Trazas' AND Tipo = 'Independiente'");

    if (trazasModulo.recordset.length === 0) {
      return NextResponse.json(
        { success: false, message: "Módulo de Trazas no configurado" },
        { status: 500 }
      );
    }

    const trazasModuloId = trazasModulo.recordset[0].Id;

    // Verificar si el usuario tiene permiso de Ver en el módulo de Trazas
    const tienePermiso = await verificarPermiso(user.userId, trazasModuloId, 'ver');
    
    if (!tienePermiso) {
      return NextResponse.json(
        { success: false, message: "No tiene permisos para ver las trazas de auditoría" },
        { status: 403 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const proceso = searchParams.get("proceso");
    const fechaDesde = searchParams.get("fechaDesde");
    const fechaHasta = searchParams.get("fechaHasta");
    const usuarioId = searchParams.get("usuarioId");
    const accion = searchParams.get("accion");
    const detalle = searchParams.get("detalle");

    let query = `
      SELECT 
        t.Id,
        t.FechaHora,
        t.UsuarioId,
        t.Usuario,
        t.Accion,
        t.Proceso,
        t.Detalle
      FROM TD_MODULO_TRAZAS t
      WHERE 1=1
    `;

    const request = pool.request();

    if (proceso) {
      query += " AND t.Proceso LIKE @proceso";
      request.input("proceso", sql.NVarChar, `%${proceso}%`);
    }

    if (fechaDesde) {
      query += " AND t.FechaHora >= @fechaDesde";
      request.input("fechaDesde", sql.DateTime, new Date(fechaDesde));
    }

    if (fechaHasta) {
      query += " AND t.FechaHora <= @fechaHasta";
      const fecha = new Date(fechaHasta);
      fecha.setHours(23, 59, 59, 999); // Incluir todo el día
      request.input("fechaHasta", sql.DateTime, fecha);
    }

    if (usuarioId) {
      query += " AND t.UsuarioId = @usuarioId";
      request.input("usuarioId", sql.Int, parseInt(usuarioId));
    }

    if (accion) {
      query += " AND t.Accion = @accion";
      request.input("accion", sql.NVarChar, accion);
    }

    if (detalle) {
      query += " AND t.Detalle LIKE @detalle";
      request.input("detalle", sql.NVarChar, `%${detalle}%`);
    }

    query += " ORDER BY t.FechaHora DESC";

    const result = await request.query(query);

    return NextResponse.json({
      success: true,
      data: result.recordset,
    });
  } catch (error: any) {
    console.error("Error al consultar trazas:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

// POST - Registrar nueva traza
export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "No autorizado" },
        { status: 401 }
      );
    }

    const { accion, proceso, detalle } = await req.json();

    if (!accion || !proceso || !detalle) {
      return NextResponse.json(
        { success: false, message: "Faltan datos requeridos" },
        { status: 400 }
      );
    }

    const pool = await getConnection();
    
    // Obtener el nombre del usuario
    const userResult = await pool
      .request()
      .input("id", sql.Int, user.userId)
      .query("SELECT Usuario FROM TD_USUARIOS WHERE Id = @id");

    const usuario = userResult.recordset[0]?.Usuario || "Desconocido";

    await pool
      .request()
      .input("usuarioId", sql.Int, user.userId)
      .input("usuario", sql.NVarChar, usuario)
      .input("accion", sql.NVarChar, accion)
      .input("proceso", sql.NVarChar, proceso)
      .input("detalle", sql.NVarChar, detalle)
      .query(`
        INSERT INTO TD_MODULO_TRAZAS (UsuarioId, Usuario, Accion, Proceso, Detalle)
        VALUES (@usuarioId, @usuario, @accion, @proceso, @detalle)
      `);

    return NextResponse.json({
      success: true,
      message: "Traza registrada exitosamente",
    });
  } catch (error: any) {
    console.error("Error al registrar traza:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
