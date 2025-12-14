import { NextRequest, NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import sql from "mssql";
import { verifyToken } from "@/lib/auth";

// GET - Obtener todos los registros de un módulo
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get("authorization")?.split(" ")[1];
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ success: false, message: "No autorizado" }, { status: 401 });
    }

    const moduloId = parseInt(params.id);
    const pool = await getConnection();
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get("parentId");

    // Obtener información del módulo
    const moduloResult = await pool
      .request()
      .input("moduloId", sql.Int, moduloId)
      .query("SELECT * FROM TD_MODULOS WHERE Id = @moduloId");

    if (moduloResult.recordset.length === 0) {
      return NextResponse.json({ success: false, message: "Módulo no encontrado" }, { status: 404 });
    }

    const modulo = moduloResult.recordset[0];
    const tableName = `TD_MODULO_${modulo.Nombre.toUpperCase()}`;

    // Obtener campos del módulo
    const camposResult = await pool
      .request()
      .input("moduloId", sql.Int, moduloId)
      .query(`
        SELECT c.*, l.Nombre as ListaNombre
        FROM TD_CAMPOS c
        LEFT JOIN TD_LISTAS l ON c.ListaId = l.Id
        WHERE c.ModuloId = @moduloId
        ORDER BY c.Orden
      `);

    // Construir SELECT con alias para mapear columnas sanitizadas a nombres originales
    const campos = camposResult.recordset;
    const selectColumns = campos
      .map((campo: any) => `[${campo.NombreColumna}] AS [${campo.Nombre}]`)
      .join(', ');

    // Construir WHERE clause
    let whereClause = "WHERE Estado = 'Activo'";
    const dbRequest = pool.request();
    
    // Si es un módulo secundario y se proporciona parentId, filtrar por el padre
    if (modulo.Tipo === "Secundario" && parentId && modulo.ModuloPrincipalId) {
      // Obtener nombre de tabla del módulo principal
      const moduloPrincipalResult = await pool
        .request()
        .input("moduloPrincipalId", sql.Int, modulo.ModuloPrincipalId)
        .query("SELECT NombreTabla FROM TD_MODULOS WHERE Id = @moduloPrincipalId");
      
      if (moduloPrincipalResult.recordset.length > 0) {
        const parentTableName = moduloPrincipalResult.recordset[0].NombreTabla;
        whereClause += ` AND [${parentTableName}_Id] = @parentId`;
        dbRequest.input("parentId", sql.Int, parseInt(parentId));
      }
    }

    // Obtener datos de la tabla dinámica
    const datosResult = await dbRequest.query(`
        SELECT Id, ${selectColumns}, Estado, FechaCreacion, FechaModificacion, 
               UsuarioCreacion, UsuarioModificacion
        FROM ${tableName} 
        ${whereClause}
        ORDER BY Id DESC
      `);

    return NextResponse.json({
      success: true,
      data: {
        modulo,
        campos: camposResult.recordset,
        registros: datosResult.recordset,
      },
    });
  } catch (error: any) {
    console.error("Error en GET /api/modulos/[id]/datos:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Error al obtener datos" },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo registro
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get("authorization")?.split(" ")[1];
    const decodedToken = verifyToken(token || "");
    if (!decodedToken) {
      return NextResponse.json({ success: false, message: "No autorizado" }, { status: 401 });
    }

    const moduloId = parseInt(params.id);
    const body = await request.json();
    const pool = await getConnection();

    // Obtener información del módulo
    const moduloResult = await pool
      .request()
      .input("moduloId", sql.Int, moduloId)
      .query("SELECT * FROM TD_MODULOS WHERE Id = @moduloId");

    if (moduloResult.recordset.length === 0) {
      return NextResponse.json({ success: false, message: "Módulo no encontrado" }, { status: 404 });
    }

    const modulo = moduloResult.recordset[0];
    const tableName = modulo.NombreTabla;

    // Obtener campos del módulo
    const camposResult = await pool
      .request()
      .input("moduloId", sql.Int, moduloId)
      .query("SELECT * FROM TD_CAMPOS WHERE ModuloId = @moduloId");

    const campos = camposResult.recordset;

    // Construir el INSERT dinámicamente
    const columnNames: string[] = [];
    const paramNames: string[] = [];
    const dbRequest = pool.request();

    // Si es un módulo secundario, incluir la columna FK del módulo principal
    if (modulo.ModuloPrincipalId) {
      // Obtener el nombre de la tabla del módulo principal
      const moduloPrincipalResult = await pool
        .request()
        .input("moduloPrincipalId", sql.Int, modulo.ModuloPrincipalId)
        .query("SELECT NombreTabla FROM TD_MODULOS WHERE Id = @moduloPrincipalId");
      
      if (moduloPrincipalResult.recordset.length > 0) {
        const fkColumnName = `${moduloPrincipalResult.recordset[0].NombreTabla}_Id`;
        const fkValue = body[fkColumnName];
        
        if (fkValue) {
          columnNames.push(`[${fkColumnName}]`);
          paramNames.push(`@FK_Principal`);
          dbRequest.input("FK_Principal", sql.Int, parseInt(fkValue));
        }
      }
    }

    campos.forEach((campo: any) => {
      const value = body[campo.Nombre];
      
      if (value !== undefined && value !== null && value !== "") {
        columnNames.push(`[${campo.NombreColumna}]`);
        paramNames.push(`@${campo.NombreColumna}`);

        // Agregar parámetro según el tipo de dato
        switch (campo.TipoDato) {
          case "Numero":
            dbRequest.input(campo.NombreColumna, sql.Int, parseInt(value));
            break;
          case "Fecha":
            dbRequest.input(campo.NombreColumna, sql.Date, new Date(value));
            break;
          case "FechaHora":
            dbRequest.input(campo.NombreColumna, sql.DateTime, new Date(value));
            break;
          case "Lista":
            dbRequest.input(campo.NombreColumna, sql.Int, parseInt(value));
            break;
          case "Archivo":
            dbRequest.input(campo.NombreColumna, sql.NVarChar, value);
            break;
          default: // Texto, Descripcion
            dbRequest.input(campo.NombreColumna, sql.NVarChar, value);
        }
      }
    });

    // Agregar campos de auditoría
    columnNames.push("Estado", "FechaCreacion", "UsuarioCreacion");
    paramNames.push("@Estado", "@FechaCreacion", "@UsuarioCreacion");
    dbRequest.input("Estado", sql.NVarChar, "Activo");
    dbRequest.input("FechaCreacion", sql.DateTime, new Date());
    dbRequest.input("UsuarioCreacion", sql.NVarChar, decodedToken.Usuario);

    const insertQuery = `
      INSERT INTO ${tableName} (${columnNames.join(", ")})
      OUTPUT INSERTED.Id
      VALUES (${paramNames.join(", ")})
    `;

    const result = await dbRequest.query(insertQuery);

    return NextResponse.json({
      success: true,
      data: { id: result.recordset[0].Id },
      message: "Registro creado exitosamente",
    });
  } catch (error: any) {
    console.error("Error en POST /api/modulos/[id]/datos:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Error al crear registro" },
      { status: 500 }
    );
  }
}

// PUT - Actualizar registro
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get("authorization")?.split(" ")[1];
    const decodedToken = verifyToken(token || "");
    if (!decodedToken) {
      return NextResponse.json({ success: false, message: "No autorizado" }, { status: 401 });
    }

    const moduloId = parseInt(params.id);
    const body = await request.json();
    const registroId = body.id;

    if (!registroId) {
      return NextResponse.json({ success: false, message: "ID de registro requerido" }, { status: 400 });
    }

    const pool = await getConnection();

    // Obtener información del módulo
    const moduloResult = await pool
      .request()
      .input("moduloId", sql.Int, moduloId)
      .query("SELECT * FROM TD_MODULOS WHERE Id = @moduloId");

    if (moduloResult.recordset.length === 0) {
      return NextResponse.json({ success: false, message: "Módulo no encontrado" }, { status: 404 });
    }

    const modulo = moduloResult.recordset[0];
    const tableName = modulo.NombreTabla;

    // Obtener campos del módulo
    const camposResult = await pool
      .request()
      .input("moduloId", sql.Int, moduloId)
      .query("SELECT * FROM TD_CAMPOS WHERE ModuloId = @moduloId");

    const campos = camposResult.recordset;

    // Construir el UPDATE dinámicamente
    const setStatements: string[] = [];
    const dbRequest = pool.request();
    dbRequest.input("Id", sql.Int, registroId);

    campos.forEach((campo: any) => {
      const value = body[campo.Nombre];
      
      if (value !== undefined) {
        setStatements.push(`[${campo.NombreColumna}] = @${campo.NombreColumna}`);

        // Agregar parámetro según el tipo de dato
        switch (campo.TipoDato) {
          case "Numero":
            dbRequest.input(campo.NombreColumna, sql.Int, value ? parseInt(value) : null);
            break;
          case "Fecha":
            dbRequest.input(campo.NombreColumna, sql.Date, value ? new Date(value) : null);
            break;
          case "FechaHora":
            dbRequest.input(campo.NombreColumna, sql.DateTime, value ? new Date(value) : null);
            break;
          case "Lista":
            dbRequest.input(campo.NombreColumna, sql.Int, value ? parseInt(value) : null);
            break;
          case "Archivo":
            dbRequest.input(campo.NombreColumna, sql.NVarChar, value);
            break;
          default: // Texto, Descripcion
            dbRequest.input(campo.NombreColumna, sql.NVarChar, value);
        }
      }
    });

    // Agregar campos de auditoría
    setStatements.push("FechaModificacion = @FechaModificacion");
    setStatements.push("UsuarioModificacion = @UsuarioModificacion");
    dbRequest.input("FechaModificacion", sql.DateTime, new Date());
    dbRequest.input("UsuarioModificacion", sql.NVarChar, decodedToken.Usuario);

    const updateQuery = `
      UPDATE ${tableName}
      SET ${setStatements.join(", ")}
      WHERE Id = @Id
    `;

    await dbRequest.query(updateQuery);

    return NextResponse.json({
      success: true,
      message: "Registro actualizado exitosamente",
    });
  } catch (error: any) {
    console.error("Error en PUT /api/modulos/[id]/datos:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Error al actualizar registro" },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar registro (soft delete)
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.headers.get("authorization")?.split(" ")[1];
    const decodedToken = verifyToken(token || "");
    if (!decodedToken) {
      return NextResponse.json({ success: false, message: "No autorizado" }, { status: 401 });
    }

    const moduloId = parseInt(params.id);
    const { searchParams } = new URL(request.url);
    const registroId = searchParams.get("registroId");

    if (!registroId) {
      return NextResponse.json({ success: false, message: "ID de registro requerido" }, { status: 400 });
    }

    const pool = await getConnection();

    // Obtener información del módulo
    const moduloResult = await pool
      .request()
      .input("moduloId", sql.Int, moduloId)
      .query("SELECT * FROM TD_MODULOS WHERE Id = @moduloId");

    if (moduloResult.recordset.length === 0) {
      return NextResponse.json({ success: false, message: "Módulo no encontrado" }, { status: 404 });
    }

    const modulo = moduloResult.recordset[0];
    const tableName = modulo.NombreTabla;

    await pool
      .request()
      .input("Id", sql.Int, parseInt(registroId))
      .input("Estado", sql.NVarChar, "Inactivo")
      .input("FechaModificacion", sql.DateTime, new Date())
      .input("UsuarioModificacion", sql.NVarChar, decodedToken.Usuario)
      .query(`
        UPDATE ${tableName}
        SET Estado = @Estado,
            FechaModificacion = @FechaModificacion,
            UsuarioModificacion = @UsuarioModificacion
        WHERE Id = @Id
      `);

    return NextResponse.json({
      success: true,
      message: "Registro eliminado exitosamente",
    });
  } catch (error: any) {
    console.error("Error en DELETE /api/modulos/[id]/datos:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Error al eliminar registro" },
      { status: 500 }
    );
  }
}
