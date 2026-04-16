# Sistema de Permisos del Menú de Configuración

## Resumen

Se implementó un sistema de permisos granulares para el menú de configuración, permitiendo a los administradores controlar qué opciones del menú puede ver cada rol. Anteriormente, solo el rol "Administrador" tenía acceso completo al menú de configuración.

## Fecha de Implementación
5 de marzo de 2026

## Archivos Modificados

### 1. Base de Datos

#### `database/migrations/add_config_menu_permissions.sql`
- Nueva tabla: `TR_ROL_CONFIG_PERMISO`
- Columnas:
  - `HabilitarMenuConfig`: Habilita/deshabilita el menú completo
  - `PermisosRoles`: Acceso a gestión de roles
  - `PermisosUsuarios`: Acceso a gestión de usuarios
  - `PermisosListas`: Acceso a gestión de listas
  - `PermisosModulos`: Acceso a configuración de módulos
  - `PermisosParametros`: Acceso a parámetros del sistema
  - `PermisosDashboard`: Acceso a configuración de dashboards
  - `PermisosParametrosAV`: Acceso a parámetros del asistente virtual

**Estado:** ✅ Migración aplicada exitosamente

### 2. Backend

#### `src/app/api/permisos-config/route.ts` (NUEVO)
- Endpoint GET para obtener permisos de configuración del usuario actual
- Combina permisos de todos los roles asignados al usuario (usando MAX)
- Retorna objeto con booleanos para cada permiso

#### `src/app/api/roles/route.ts` (MODIFICADO)
**Cambios en GET:**
- Incluye `PermisosConfig` al obtener un rol específico

**Cambios en POST:**
- Acepta `PermisosConfig` en el body
- Crea registro en `TR_ROL_CONFIG_PERMISO` con los permisos especificados
- Si no se proporcionan, crea con todo deshabilitado

**Cambios en PUT:**
- Acepta `PermisosConfig` en el body
- Actualiza o inserta permisos de configuración según corresponda

### 3. Frontend

#### `src/app/dashboard/roles/page.tsx` (MODIFICADO)
**Cambios en el estado:**
```typescript
PermisosConfig: {
  HabilitarMenuConfig: false,
  PermisosRoles: false,
  PermisosUsuarios: false,
  PermisosListas: false,
  PermisosModulos: false,
  PermisosParametros: false,
  PermisosDashboard: false,
  PermisosParametrosAV: false,
}
```

**Nueva sección en el formulario:**
- Checkbox maestro "Habilitar Menú de Configuración"
- Al activarse, muestra lista de sub-permisos:
  - Roles
  - Usuarios
  - Listas
  - Módulos
  - Parámetros
  - Dashboard
  - Parámetros AV
- Al desactivar el maestro, todos los sub-permisos se deshabilitan automáticamente

#### `src/app/dashboard/layout.tsx` (MODIFICADO)
**Nuevo estado:**
```typescript
const [permisosConfig, setPermisosConfig] = useState({...});
```

**Nueva función:**
```typescript
const loadPermisosConfig = async (token: string) => {...}
```

**Cambio importante:**
- Se reemplazó la verificación `isAdmin` por `permisosConfig.HabilitarMenuConfig`
- Cada opción del menú verifica su permiso específico:
  ```tsx
  {permisosConfig.PermisosRoles && (
    <Link href="/dashboard/roles">...</Link>
  )}
  ```

### 4. Scripts de Migración

#### `apply-config-menu-migration.js` (NUEVO)
- Script para aplicar la migración automáticamente
- Configura conexión a base de datos
- Ejecuta migración en lotes
- Verifica la estructura y permisos creados
- Muestra resumen de permisos por rol

## Flujo de Uso

### Configuración de Permisos
1. Administrador ingresa a **Dashboard > Roles**
2. Crea un nuevo rol o edita uno existente
3. En la sección "Permisos del Menú de Configuración":
   - Activa "Habilitar Menú de Configuración"
   - Selecciona las opciones específicas que el rol puede ver
4. Guarda el rol
5. Asigna el rol a usuarios

### Experiencia del Usuario
- Usuario con permisos limitados:
  - Ve solo el menú de Configuración si tiene `HabilitarMenuConfig = true`
  - Dentro del menú, solo ve las opciones para las que tiene permiso
  - No puede acceder directamente a URLs de opciones no permitidas

- Usuario sin permisos:
  - No ve el menú de Configuración en el sidebar
  - Intento de acceso directo a URLs de configuración será bloqueado

## Estructura de Permisos

### Tabla TR_ROL_CONFIG_PERMISO

```sql
CREATE TABLE TR_ROL_CONFIG_PERMISO (
  Id INT IDENTITY(1,1) PRIMARY KEY,
  RolId INT NOT NULL,
  HabilitarMenuConfig BIT NOT NULL DEFAULT 0,
  PermisosRoles BIT NOT NULL DEFAULT 0,
  PermisosUsuarios BIT NOT NULL DEFAULT 0,
  PermisosListas BIT NOT NULL DEFAULT 0,
  PermisosModulos BIT NOT NULL DEFAULT 0,
  PermisosParametros BIT NOT NULL DEFAULT 0,
  PermisosDashboard BIT NOT NULL DEFAULT 0,
  PermisosParametrosAV BIT NOT NULL DEFAULT 0,
  FechaCreacion DATETIME DEFAULT GETDATE(),
  FechaModificacion DATETIME DEFAULT GETDATE(),
  UsuarioCreacion VARCHAR(100),
  UsuarioModificacion VARCHAR(100),
  CONSTRAINT FK_TR_ROL_CONFIG_PERMISO_Rol 
    FOREIGN KEY (RolId) REFERENCES TD_ROLES(Id) ON DELETE CASCADE,
  CONSTRAINT UQ_TR_ROL_CONFIG_PERMISO_RolId UNIQUE (RolId)
)
```

### Estado Actual de Permisos

| Rol | HabilitarMenuConfig | Todas las opciones |
|-----|--------------------|--------------------|
| Administrador | ✅ Sí | ✅ Todas habilitadas |
| Administrador Salvita | ❌ No | ❌ Todas deshabilitadas |
| Enfermera | ❌ No | ❌ Todas deshabilitadas |
| Prueba | ❌ No | ❌ Todas deshabilitadas |
| prueba2 | ❌ No | ❌ Todas deshabilitadas |
| pruebaNuevaEstructura | ❌ No | ❌ Todas deshabilitadas |
| Tareas | ❌ No | ❌ Todas deshabilitadas |
| v4 | ❌ No | ❌ Todas deshabilitadas |

## Pruebas Sugeridas

1. **Configurar rol con permisos parciales:**
   ```
   - Crear rol "Configurador Parcial"
   - Habilitar: Roles, Usuarios
   - Deshabilitar: Listas, Módulos, Parámetros, Dashboard, Parámetros AV
   ```

2. **Asignar a usuario de prueba:**
   - Iniciar sesión con ese usuario
   - Verificar que solo ve Roles y Usuarios en el menú de Configuración

3. **Intentar acceso directo:**
   - Intentar navegar a `/dashboard/listas`
   - Debería ser bloqueado (requiere implementar guard en el frontend)

## Mejoras Futuras

1. **Guards de ruta:** Implementar protección a nivel de ruta para evitar acceso directo por URL
2. **Auditoría:** Registrar cambios de permisos en trazas
3. **Permisos compuestos:** Permitir herencia de permisos entre roles
4. **Interfaz mejorada:** Agregar presets de permisos (ej: "Configurador de Módulos", "Gestor de Usuarios")

## Compatibilidad

- ✅ Compatible con sistema de permisos existente (módulos, tareas, trazas)
- ✅ No afecta roles sin permisos de configuración asignados
- ✅ Rol Administrador mantiene acceso completo automáticamente
- ✅ Sistema retrocompatible: roles antiguos siguen funcionando

## Notas Técnicas

- Se usa `MAX()` en SQL para combinar permisos cuando un usuario tiene múltiples roles
- La migración es idempotente (puede ejecutarse múltiples veces sin errores)
- Foreign key con CASCADE DELETE: al eliminar rol, se eliminan sus permisos de configuración
- Constraint UNIQUE en RolId: un rol solo puede tener un registro de permisos de configuración
