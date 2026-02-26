import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

// GET /api/bandejas/usuario - Obtener bandejas accesibles por el usuario actual
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "No autorizado" },
        { status: 401 }
      );
    }

    // Obtener bandejas del usuario (directas o por rol)
    const result = await query(
      `SELECT DISTINCT 
         b.Id as BandejaId,
         b.Nombre as NombreBandeja,
         b.Descripcion as DescripcionBandeja,
         b.Estado as EstadoBandeja
       FROM VW_BANDEJAS_POR_USUARIO vw
       INNER JOIN TD_BANDEJAS b ON vw.BandejaId = b.Id
       WHERE vw.UsuarioId = @userId AND b.Estado = 'Activa'
       ORDER BY b.Nombre`,
      { userId: user.userId }
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Error en GET /api/bandejas/usuario:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al obtener bandejas" },
      { status: 500 }
    );
  }
}
