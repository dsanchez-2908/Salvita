import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { query } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'salvita_secret_key_change_in_production_2024';

export interface JWTPayload {
  userId: number;
  usuario: string;
  nombre: string;
  roles: string[];
}

export interface PermisoUsuario {
  ModuloId: number;
  PermisoVer: number;
  PermisoVerAgrupado: number;
  PermisoAgregar: number;
  PermisoModificar: number;
  PermisoEliminar: number;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

export function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

export function getUserFromRequest(request: NextRequest): JWTPayload | null {
  const token = getTokenFromRequest(request);
  if (!token) {
    return null;
  }
  return verifyToken(token);
}
/**
 * Verifica si un usuario tiene un permiso específico en un módulo
 * @param userId ID del usuario
 * @param moduloId ID del módulo
 * @param permiso Tipo de permiso a verificar: 'ver', 'verAgrupado', 'agregar', 'modificar', 'eliminar'
 * @returns true si tiene el permiso o es administrador, false en caso contrario
 */
export async function verificarPermiso(
  userId: number,
  moduloId: number,
  permiso: 'ver' | 'verAgrupado' | 'agregar' | 'modificar' | 'eliminar'
): Promise<boolean> {
  try {
    // Verificar si es administrador
    const adminCheck = await query(
      `SELECT COUNT(*) as EsAdmin
       FROM TD_USUARIOS u
       INNER JOIN TR_USUARIO_ROL ur ON u.Id = ur.UsuarioId
       INNER JOIN TD_ROLES r ON ur.RolId = r.Id
       WHERE u.Id = @userId AND r.Nombre = 'Administrador' AND r.Estado = 'Activo'`,
      { userId }
    );

    if (adminCheck[0]?.EsAdmin > 0) {
      return true;
    }

    // Mapear nombre de permiso a columna
    const columnaPermiso = {
      ver: 'PermisoVer',
      verAgrupado: 'PermisoVerAgrupado',
      agregar: 'PermisoAgregar',
      modificar: 'PermisoModificar',
      eliminar: 'PermisoEliminar'
    }[permiso];

    // Verificar permisos específicos
    const permisos = await query(
      `SELECT MAX(CAST(rp.${columnaPermiso} as int)) as TienePermiso
       FROM TD_USUARIOS u
       INNER JOIN TR_USUARIO_ROL ur ON u.Id = ur.UsuarioId
       INNER JOIN TD_ROLES r ON ur.RolId = r.Id AND r.Estado = 'Activo'
       INNER JOIN TR_ROL_MODULO_PERMISO rp ON r.Id = rp.RolId
       WHERE u.Id = @userId AND rp.ModuloId = @moduloId
       GROUP BY rp.ModuloId`,
      { userId, moduloId }
    );

    return permisos.length > 0 && permisos[0].TienePermiso === 1;
  } catch (error) {
    console.error('Error verificando permiso:', error);
    return false;
  }
}

/**
 * Registra una traza de auditoría
 * @param userId ID del usuario que realiza la acción
 * @param accion Tipo de acción: 'Agregar', 'Modificar', 'Eliminar'
 * @param proceso Nombre del proceso/pantalla: 'Roles', 'Usuarios', 'Módulos', 'Lista: Nombre', 'Módulo: Nombre'
 * @param detalle Descripción detallada de lo que se hizo
 */
export async function registrarTraza(
  userId: number,
  accion: 'Agregar' | 'Modificar' | 'Eliminar',
  proceso: string,
  detalle: string
): Promise<void> {
  try {
    // Obtener el nombre del usuario
    const usuarios = await query(
      `SELECT Usuario FROM TD_USUARIOS WHERE Id = @userId`,
      { userId }
    );

    const usuario = usuarios[0]?.Usuario || 'Desconocido';

    await query(
      `INSERT INTO TD_MODULO_TRAZAS (UsuarioId, Usuario, Accion, Proceso, Detalle)
       VALUES (@userId, @usuario, @accion, @proceso, @detalle)`,
      { userId, usuario, accion, proceso, detalle }
    );
  } catch (error) {
    console.error('Error registrando traza:', error);
    // No lanzamos error para no interrumpir la operación principal
  }
}