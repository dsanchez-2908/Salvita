import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// POST /api/modulos-v2/datos-directos - Obtener datos de registros específicos
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
    const { NombreTabla, RegistroIds } = body;

    if (!NombreTabla || !RegistroIds || !Array.isArray(RegistroIds)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Datos inválidos" },
        { status: 400 }
      );
    }

    if (RegistroIds.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: true,
        data: [],
      });
    }

    // Construir query dinámica
    const ids = RegistroIds.join(',');
    const sql = `SELECT * FROM [${NombreTabla}] WHERE Id IN (${ids})`;

    console.log("datos-directos - SQL:", sql);
    console.log("datos-directos - NombreTabla:", NombreTabla);
    console.log("datos-directos - RegistroIds:", RegistroIds);

    const result = await query(sql);

    console.log("datos-directos - Resultado:", result);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Error en POST /api/modulos-v2/datos-directos:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: error.message || "Error al obtener datos" },
      { status: 500 }
    );
  }
}
