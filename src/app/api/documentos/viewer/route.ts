import { NextRequest, NextResponse } from 'next/server';
import { documentManager } from '@/lib/document-manager';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json(
        { error: 'No se proporcionó el ID del documento' },
        { status: 400 }
      );
    }

    // Obtener la URL del visor
    const viewerUrl = await documentManager.getViewerUrl(documentId);

    return NextResponse.json({
      success: true,
      viewerUrl,
    });
  } catch (error: any) {
    console.error('Error obteniendo URL del visor:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener la URL del visor' },
      { status: 500 }
    );
  }
}
