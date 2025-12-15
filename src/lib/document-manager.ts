import axios from 'axios';
import { query } from './db';

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_expires_in: number;
  token_type: string;
}

interface DocumentUploadRequest {
  json: {
    properties: Array<{ name: string; value: string }>;
    security: any[];
    objectDefinitionId: string;
  };
  content: string;
  fileName: string;
  contentType: string;
}

interface DocumentUploadResponse {
  id: string;
  message?: string;
}

class DocumentManagerClient {
  private token: string | null = null;
  private tokenExpiration: number = 0;

  private async getParameter(parametro: string): Promise<string> {
    const result = await query<{ Valor: string }>(
      'SELECT Valor FROM TD_PARAMETROS WHERE Parametro = @parametro',
      { parametro }
    );
    return result[0]?.Valor || '';
  }

  private async generateToken(): Promise<string> {
    try {
      const urlToken = await this.getParameter('URL Token');
      const usuario = await this.getParameter('Usuario Token');
      const clave = await this.getParameter('Clave Token');

      const params = new URLSearchParams();
      params.append('grant_type', 'password');
      params.append('client_id', 'aditus-platform-client');
      params.append('username', usuario);
      params.append('password', clave);

      const response = await axios.post<TokenResponse>(urlToken, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      this.token = response.data.access_token;
      this.tokenExpiration = Date.now() + response.data.expires_in * 1000;

      return this.token;
    } catch (error) {
      console.error('Error generando token:', error);
      throw new Error('No se pudo generar el token de autenticación');
    }
  }

  private async getToken(): Promise<string> {
    if (this.token && Date.now() < this.tokenExpiration - 60000) {
      return this.token;
    }
    return this.generateToken();
  }

  async uploadDocument(
    file: Buffer | string,
    fileName: string,
    contentType: string,
    moduloNombre: string
  ): Promise<string> {
    try {
      const token = await this.getToken();
      const urlBase = await this.getParameter('URL BASE Agregar Documento');
      const libreria = await this.getParameter('Codigo libreria');
      const codigoClase = await this.getParameter('Codigo de clase');

      const base64Content =
        typeof file === 'string' ? file : file.toString('base64');

      const requestData: DocumentUploadRequest = {
        json: {
          properties: [
            {
              name: 'modulo',
              value: moduloNombre,
            },
          ],
          security: [],
          objectDefinitionId: codigoClase,
        },
        content: base64Content,
        fileName: fileName,
        contentType: contentType,
      };

      console.log('=== DEBUG UPLOAD ===');
      console.log('URL:', urlBase);
      console.log('Librería:', libreria);
      console.log('Código clase:', codigoClase);
      console.log('Módulo:', moduloNombre);
      console.log('Nombre archivo:', fileName);

      const response = await axios.post(
        urlBase,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
            accept: '*/*',
            'x-library': libreria,
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log('=== RESPONSE ===');
      console.log('Status:', response.status);
      console.log('Data completa:', JSON.stringify(response.data, null, 2));
      console.log('Type of response.data:', typeof response.data);

      // Aditus retorna el ID directamente como string, no como objeto
      const documentId = typeof response.data === 'string' 
        ? response.data.replace(/"/g, '') // Remover comillas si las hay
        : response.data.id || response.data;

      if (!documentId) {
        console.error('⚠️ No se encontró ID en la respuesta');
        throw new Error('No se recibió ID del documento');
      }

      console.log('✅ ID del documento:', documentId);
      return documentId;
    } catch (error: any) {
      console.error('❌ Error subiendo documento:', error.response?.data || error);
      console.error('Error status:', error.response?.status);
      console.error('Error headers:', error.response?.headers);
      throw new Error(
        `Error al subir el documento: ${error.response?.data?.message || error.message}`
      );
    }
  }

  async getViewerUrl(documentId: string): Promise<string> {
    try {
      const token = await this.getToken();
      const urlBase = await this.getParameter('URL BASE Visor');
      const libreria = await this.getParameter('Codigo libreria');

      const encodedImage = encodeURIComponent(`"${documentId}"`);
      const encodedLibrary = encodeURIComponent(`"${libreria}"`);
      const encodedToken = encodeURIComponent(`"${token}"`);

      return `${urlBase}?image=${encodedImage}&library=${encodedLibrary}&token=${encodedToken}`;
    } catch (error) {
      console.error('Error generando URL del visor:', error);
      throw new Error('No se pudo generar la URL del visor');
    }
  }
}

export const documentManager = new DocumentManagerClient();
