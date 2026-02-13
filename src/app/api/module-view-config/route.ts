import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "tu_clave_secreta_super_segura_cambiar_en_produccion";

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

// GET - Obtener configuración de vista de un módulo
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "No autorizado" },
        { status: 401 }
      );
    }

    jwt.verify(token, JWT_SECRET);
    const { searchParams } = new URL(request.url);
    const moduloId = searchParams.get("moduloId");

    if (!moduloId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "moduloId es requerido" },
        { status: 400 }
      );
    }

    // Obtener configuración de vista
    const config = await query(
      `SELECT 
        Id,
        ModuloId,
        FiltrosIniciales,
        ConfigTitulo,
        NumeroColumnas,
        FechaCreacion,
        FechaModificacion
      FROM [dbo].[TD_MODULE_VIEW_CONFIG]
      WHERE ModuloId = @moduloId`,
      { moduloId }
    ).catch((err) => {
      // Si la tabla no existe o hay otro error, retornar array vacío
      console.log("Configuración de vista no disponible:", err.message);
      return [];
    });

    if (config.length === 0) {
      // Retornar configuración por defecto si no existe
      return NextResponse.json<ApiResponse>({
        success: true,
        data: {
          ModuloId: parseInt(moduloId),
          FiltrosIniciales: null,
          ConfigTitulo: null,
          NumeroColumnas: 2,
        },
      });
    }

    const cfg = config[0];
    
    // Parsear JSON
    let filtros = null;
    let configTitulo = null;
    
    if (cfg.FiltrosIniciales) {
      try {
        filtros = JSON.parse(cfg.FiltrosIniciales);
      } catch (e) {
        console.error("Error parsing FiltrosIniciales:", e);
      }
    }
    
    if (cfg.ConfigTitulo) {
      try {
        configTitulo = JSON.parse(cfg.ConfigTitulo);
      } catch (e) {
        console.error("Error parsing ConfigTitulo:", e);
      }
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        Id: cfg.Id,
        ModuloId: cfg.ModuloId,
        FiltrosIniciales: filtros,
        ConfigTitulo: configTitulo,
        NumeroColumnas: cfg.NumeroColumnas,
        FechaCreacion: cfg.FechaCreacion,
        FechaModificacion: cfg.FechaModificacion,
      },
    });
  } catch (error: any) {
    console.error("Error en GET /api/module-view-config:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: error.message || "Error al obtener configuración" },
      { status: 500 }
    );
  }
}

// POST/PUT - Guardar o actualizar configuración de vista
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "No autorizado" },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const body = await request.json();
    const { ModuloId, FiltrosIniciales, ConfigTitulo, NumeroColumnas } = body;

    if (!ModuloId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "ModuloId es requerido" },
        { status: 400 }
      );
    }

    // Validar que el número de columnas esté en el rango
    if (NumeroColumnas && (NumeroColumnas < 1 || NumeroColumnas > 4)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "NumeroColumnas debe estar entre 1 y 4" },
        { status: 400 }
      );
    }

    // Convertir a JSON si no es null
    const filtrosJSON = FiltrosIniciales ? JSON.stringify(FiltrosIniciales) : null;
    const configTituloJSON = ConfigTitulo ? JSON.stringify(ConfigTitulo) : null;

    // Verificar si ya existe configuración
    const existing = await query(
      `SELECT Id FROM [dbo].[TD_MODULE_VIEW_CONFIG] WHERE ModuloId = @moduloId`,
      { moduloId: ModuloId }
    ).catch((err) => {
      console.log("Configuración de vista no disponible:", err.message);
      throw new Error("La funcionalidad de configuración de vista no está disponible. Por favor, contacte al administrador del sistema.");
    });

    if (existing.length > 0) {
      // Actualizar configuración existente
      await query(
        `UPDATE [dbo].[TD_MODULE_VIEW_CONFIG]
        SET 
          FiltrosIniciales = @filtrosIniciales,
          ConfigTitulo = @configTitulo,
          NumeroColumnas = @numeroColumnas,
          FechaModificacion = GETDATE(),
          UsuarioModificacion = @usuario
        WHERE ModuloId = @moduloId`,
        {
          moduloId: ModuloId,
          filtrosIniciales: filtrosJSON,
          configTitulo: configTituloJSON,
          numeroColumnas: NumeroColumnas || 2,
          usuario: decoded.Nombre,
        }
      );

      return NextResponse.json<ApiResponse>({
        success: true,
        message: "Configuración actualizada exitosamente",
      });
    } else {
      // Crear nueva configuración
      await query(
        `INSERT INTO [dbo].[TD_MODULE_VIEW_CONFIG] 
        (ModuloId, FiltrosIniciales, ConfigTitulo, NumeroColumnas, UsuarioCreacion, UsuarioModificacion)
        VALUES (@moduloId, @filtrosIniciales, @configTitulo, @numeroColumnas, @usuario, @usuario)`,
        {
          moduloId: ModuloId,
          filtrosIniciales: filtrosJSON,
          configTitulo: configTituloJSON,
          numeroColumnas: NumeroColumnas || 2,
          usuario: decoded.Nombre,
        }
      );

      return NextResponse.json<ApiResponse>({
        success: true,
        message: "Configuración creada exitosamente",
      });
    }
  } catch (error: any) {
    console.error("Error en POST /api/module-view-config:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: error.message || "Error al guardar configuración" },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar configuración (restablecer a valores por defecto)
export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "No autorizado" },
        { status: 401 }
      );
    }

    jwt.verify(token, JWT_SECRET);
    const { searchParams } = new URL(request.url);
    const moduloId = searchParams.get("moduloId");

    if (!moduloId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "moduloId es requerido" },
        { status: 400 }
      );
    }

    await query(
      `DELETE FROM [dbo].[TD_MODULE_VIEW_CONFIG] WHERE ModuloId = @moduloId`,
      { moduloId }
    ).catch((err) => {
      console.log("Configuración de vista no disponible:", err.message);
      throw new Error("La funcionalidad de configuración de vista no está disponible. Por favor, contacte al administrador del sistema.");
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Configuración eliminada (restablecida a valores por defecto)",
    });
  } catch (error: any) {
    console.error("Error en DELETE /api/module-view-config:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: error.message || "Error al eliminar configuración" },
      { status: 500 }
    );
  }
}
