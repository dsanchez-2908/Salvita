import { query } from './db';

/**
 * Interfaz para permisos de tareas
 */
export interface PermisosTareas {
  HabilitarTareas: boolean;
  PuedeCrearTareas: boolean;
  PuedeAdministracionTareas: boolean;
  AdministracionBandejas: boolean;
  PuedeConsultarTareas: boolean;
  PuedeVerMonitorTareas: boolean;
}

/**
 * Obtiene los permisos de tareas de un usuario
 * @param userId ID del usuario
 * @returns Objeto con todos los permisos de tareas
 */
export async function obtenerPermisosTareas(userId: number): Promise<PermisosTareas> {
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

    // Administrador tiene todos los permisos
    if (adminCheck[0]?.EsAdmin > 0) {
      return {
        HabilitarTareas: true,
        PuedeCrearTareas: true,
        PuedeAdministracionTareas: true,
        AdministracionBandejas: true,
        PuedeConsultarTareas: true,
        PuedeVerMonitorTareas: true,
      };
    }

    // Obtener permisos de tareas del rol (usar MAX para casos de múltiples roles)
    const permisos = await query(
      `SELECT 
         MAX(CAST(tp.HabilitarTareas as int)) as HabilitarTareas,
         MAX(CAST(tp.PuedeCrearTareas as int)) as PuedeCrearTareas,
         MAX(CAST(tp.PuedeAdministracionTareas as int)) as PuedeAdministracionTareas,
         MAX(CAST(tp.AdministracionBandejas as int)) as AdministracionBandejas,
         MAX(CAST(tp.PuedeConsultarTareas as int)) as PuedeConsultarTareas,
         MAX(CAST(tp.PuedeVerMonitorTareas as int)) as PuedeVerMonitorTareas
       FROM TD_USUARIOS u
       INNER JOIN TR_USUARIO_ROL ur ON u.Id = ur.UsuarioId
       INNER JOIN TD_ROLES r ON ur.RolId = r.Id AND r.Estado = 'Activo'
       INNER JOIN TR_ROL_TAREAS_PERMISO tp ON r.Id = tp.RolId
       WHERE u.Id = @userId`,
      { userId }
    );

    if (permisos.length === 0) {
      // Si no hay permisos configurados, retornar todo deshabilitado
      return {
        HabilitarTareas: false,
        PuedeCrearTareas: false,
        PuedeAdministracionTareas: false,
        AdministracionBandejas: false,
        PuedeConsultarTareas: false,
        PuedeVerMonitorTareas: false,
      };
    }

    return {
      HabilitarTareas: permisos[0].HabilitarTareas === 1,
      PuedeCrearTareas: permisos[0].PuedeCrearTareas === 1,
      PuedeAdministracionTareas: permisos[0].PuedeAdministracionTareas === 1,
      AdministracionBandejas: permisos[0].AdministracionBandejas === 1,
      PuedeConsultarTareas: permisos[0].PuedeConsultarTareas === 1,
      PuedeVerMonitorTareas: permisos[0].PuedeVerMonitorTareas === 1,
    };
  } catch (error) {
    console.error('Error obteniendo permisos de tareas:', error);
    // En caso de error, retornar todo deshabilitado por seguridad
    return {
      HabilitarTareas: false,
      PuedeCrearTareas: false,
      PuedeAdministracionTareas: false,
      AdministracionBandejas: false,
      PuedeConsultarTareas: false,
      PuedeVerMonitorTareas: false,
    };
  }
}

/**
 * Verifica si un usuario tiene un permiso específico de tareas
 * @param userId ID del usuario
 * @param permiso Tipo de permiso: 'habilitar' | 'crear' | 'admin' | 'bandejas' | 'consultar' | 'monitor'
 * @returns true si tiene el permiso, false en caso contrario
 */
export async function verificarPermisoTarea(
  userId: number,
  permiso: 'habilitar' | 'crear' | 'admin' | 'bandejas' | 'consultar' | 'monitor'
): Promise<boolean> {
  const permisos = await obtenerPermisosTareas(userId);
  
  switch (permiso) {
    case 'habilitar':
      return permisos.HabilitarTareas;
    case 'crear':
      return permisos.HabilitarTareas && permisos.PuedeCrearTareas;
    case 'admin':
      return permisos.HabilitarTareas && permisos.PuedeAdministracionTareas;
    case 'bandejas':
      return permisos.HabilitarTareas && permisos.AdministracionBandejas;
    case 'consultar':
      return permisos.HabilitarTareas && permisos.PuedeConsultarTareas;
    case 'monitor':
      return permisos.HabilitarTareas && permisos.PuedeVerMonitorTareas;
    default:
      return false;
  }
}
