import { NextRequest, NextResponse } from 'next/server';
import { documentManager } from '@/lib/document-manager';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const moduloNombre = formData.get('moduloNombre') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó ningún archivo' },
        { status: 400 }
      );
    }

    if (!moduloNombre) {
      return NextResponse.json(
        { error: 'No se proporcionó el nombre del módulo' },
        { status: 400 }
      );
    }

    // Convertir el archivo a Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Subir el archivo al gestor documental
    const documentId = await documentManager.uploadDocument(
      buffer,
      file.name,
      file.type || 'application/octet-stream',
      moduloNombre
    );

    return NextResponse.json({
      success: true,
      documentId,
      fileName: file.name,
      message: 'Archivo subido correctamente',
    });
  } catch (error: any) {
    console.error('Error en upload:', error);
    return NextResponse.json(
      { error: error.message || 'Error al subir el archivo' },
      { status: 500 }
    );
  }
}
