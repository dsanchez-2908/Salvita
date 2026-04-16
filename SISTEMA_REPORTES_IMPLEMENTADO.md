# Sistema de Reportes Dinámicos

## Resumen

Se implementó un sistema completo de reportes dinámicos que permite a los administradores crear reportes parametrizados mediante queries SQL y asignarlos a roles específicos. Los usuarios pueden visualizar estos reportes en una grilla interactiva con funcionalidades de búsqueda, paginación y exportación a Excel.

## Fecha de Implementación
8 de abril de 2026

## Características Principales

1. **CRUD de Reportes**: Gestión completa de reportes desde el menú de configuración
2. **Tipos de Reportes**: Soporte para Query, Store Procedure y API (Query implementado)
3. **Permisos por Rol**: Asignación granular de reportes a roles específicos
4. **Visualización Interactiva**: Grilla con búsqueda, paginación y exportación a Excel
5. **Menú Dinámico**: Los reportes aparecen automáticamente en el menú según los permisos del usuario

## Archivos Creados

### 1. Base de Datos

#### `database/migrations/create_sistema_reportes.sql`
Crea las tablas principales del sistema:
- **TD_REPORTES**: Almacena los reportes
  - Id, Nombre, Tipo, Query, StoreProcedure, APIEndpoint, Estado, Descripcion
  - FechaCreacion, FechaModificacion, UsuarioCreacion, UsuarioModificacion
  
- **TR_ROL_REPORTE**: Relación muchos a muchos entre roles y reportes
  - RolId, ReporteId, FechaAsignacion, UsuarioAsignacion

#### `database/migrations/add_permisos_reportes_to_config.sql`
Agrega la columna PermisosReportes a TR_ROL_CONFIG_PERMISO para controlar el acceso al menú de configuración de reportes.

#### Scripts de migración
- `apply-reportes-migration.js`: Aplica la migración del sistema de reportes
- `apply-permisos-reportes-migration.js`: Aplica la migración de permisos

**Estado:** ✅ Migraciones aplicadas exitosamente

### 2. Backend (APIs)

#### `src/app/api/reportes/route.ts` (NUEVO)
API completa para el CRUD de reportes.

**Endpoints:**
- **GET** `/api/reportes`: Obtiene todos los reportes
  - Query param `id`: Obtiene un reporte específico
  - Query param `porRol=true`: Obtiene reportes permitidos para el usuario actual según sus roles
- **POST** `/api/reportes`: Crea un nuevo reporte
  - Validaciones por tipo de reporte
  - Registro de trazas de auditoría
- **PUT** `/api/reportes?id={id}`: Actualiza un reporte existente
- **DELETE** `/api/reportes?id={id}`: Elimina un reporte

#### `src/app/api/reportes/ejecutar/route.ts` (NUEVO)
API para ejecutar reportes dinámicamente.

**Endpoint:**
- **GET** `/api/reportes/ejecutar?id={id}`: Ejecuta un reporte
  - Verifica permisos del usuario
  - Ejecuta la query según el tipo de reporte
  - Retorna columnas y resultados formateados

#### `src/app/api/permisos-config/route.ts` (MODIFICADO)
**Cambios:**
- Agregado PermisosReportes en las queries SQL
- Incluye el nuevo permiso en las respuestas JSON

#### `src/app/api/roles/route.ts` (MODIFICADO)
**Cambios en POST:**
- Incluye PermisosReportes al crear permisos de configuración

**Cambios en PUT:**
- Incluye PermisosReportes al actualizar permisos de configuración

### 3. Frontend

#### `src/app/dashboard/reportes/page.tsx` (NUEVO)
Pantalla de configuración (CRUD) de reportes en el menú de Configuración.

**Características:**
- Tabla de reportes con búsqueda
- Modal para crear/editar reportes
- Campos dinámicos según tipo de reporte:
  - Query: Editor de texto SQL
  - Store Procedure: Campo para nombre del SP
  - API: Campo para endpoint URL
- Gestión de estado (Activo/Inactivo)
- Confirmación antes de eliminar

#### `src/app/dashboard/reporte/[id]/page.tsx` (NUEVO)
Pantalla de visualización de reportes con grilla interactiva.

**Características:**
- **Grilla dinámica**: Se adapta a las columnas del resultado de la query
- **Búsqueda en tiempo real**: Filtra resultados en todas las columnas
- **Paginación**: 10 registros por página con navegación
- **Exportación a Excel**: Usa la librería xlsx (ya instalada)
- **Estados de carga**: Indicadores visuales mientras se cargan datos
- **Manejo de errores**: Mensajes amigables para el usuario

#### `src/app/dashboard/layout.tsx` (MODIFICADO)
**Cambios en el estado:**
```typescript
const [reportes, setReportes] = useState<any[]>([]);
const [permisosConfig, setPermisosConfig] = useState({
  // ... otros permisos
  PermisosReportes: false,
});
```

**Nueva función:**
```typescript
const loadReportes = async (token: string) => {...}
```

**Nueva sección en el menú:**
- Sección "REPORTES" entre Bandejas y Módulos
- Muestra reportes permitidos según el rol del usuario
- Navegación dinámica a cada reporte

**Menú de Configuración:**
- Agregado enlace a "Reportes" con icono BarChart3
- Visible solo si PermisosReportes está activo

#### `src/app/dashboard/roles/page.tsx` (MODIFICADO)
**Cambios en el estado:**
```typescript
const [reportes, setReportes] = useState<any[]>([]);
PermisosConfig: {
  // ... otros permisos
  PermisosReportes: false,
},
Reportes: [] as number[], // IDs de reportes permitidos
```

**Carga de reportes:**
- Se cargan todos los reportes disponibles desde la API
- Se obtienen los reportes asignados al rol en modo edición

**Nueva sección en el formulario:**
- Sección "Reportes Permitidos" después de los permisos de configuración
- Lista de todos los reportes con checkboxes
- Muestra Nombre, Descripción y Tipo de cada reporte
- Los reportes seleccionados se guardan en TR_ROL_REPORTE
- Mensaje informativo si no hay reportes creados

## Flujo de Uso

### Para Administradores

1. **Crear un Reporte:**
   - Ir a Configuración > Reportes
   - Clic en "Nuevo Reporte"
   - Ingresar Nombre, Tipo (Query), Descripción
   - Escribir la query SQL
   - Guardar

2. **Asignar Reporte a un Rol:**
   - Ir a Configuración > Roles
   - Editar el rol deseado (o crear uno nuevo)
   - En "Permisos del Menú de Configuración":
     - Activar "Habilitar Menú de Configuración" si aún no está
     - Activar "Reportes" para dar acceso al CRUD de reportes (opcional)
   - En "Reportes Permitidos":
     - Marcar los checkboxes de los reportes que este rol puede ver
   - Guardar

3. **Gestión de Permisos:**
   - PermisosReportes en Configuración: Da acceso al CRUD de reportes
   - Reportes Permitidos: Define qué reportes aparecen en el menú del usuario

### Para Usuarios

1. **Visualizar Reportes:**
   - En el menú lateral, ver sección "REPORTES"
   - Clic en el reporte deseado
   - El sistema ejecuta la query y muestra resultados

2. **Usar la Grilla:**
   - Buscar: Escribir en el campo de búsqueda
   - Navegar: Usar botones de paginación
   - Exportar: Clic en "Exportar a Excel"

## Funcionalidades por Tipo de Reporte

### Query (Implementado ✅)
- Acepta cualquier consulta SQL válida
- Ejecuta directamente contra la base de datos
- Formatea automáticamente los resultados

### Store Procedure (Por implementar 🔄)
- Campo para nombre del SP
- Ejecutará el procedimiento almacenado
- Manejará parámetros de entrada

### API (Por implementar 🔄)
- Campo para URL del endpoint
- Realizará petición HTTP
- Formateará respuesta JSON

## Seguridad

1. **Autenticación**: Todas las APIs requieren token JWT válido
2. **Autorización**: Verificación de permisos por rol antes de:
   - Mostrar reportes en el menú
   - Ejecutar reportes
   - Acceder al CRUD de reportes
3. **Validación**: Validación de tipos de reporte y campos requeridos
4. **Auditoría**: Registro de trazas en todas las operaciones CRUD

## Ejemplo de Uso

### Query de Ejemplo
```sql
SELECT 
  u.Nombre AS Usuario,
  r.Nombre AS Rol,
  u.Estado,
  u.FechaAlta AS [Fecha de Alta]
FROM TD_USUARIOS u
INNER JOIN TR_USUARIO_ROL ur ON u.Id = ur.UsuarioId
INNER JOIN TD_ROLES r ON ur.RolId = r.Id
ORDER BY u.FechaAlta DESC
```

Este reporte mostrará:
- Columnas: Usuario, Rol, Estado, Fecha de Alta
- Con búsqueda en todas las columnas
- Paginado cada 10 registros
- Exportable a Excel

## Próximas Mejoras Sugeridas

1. **Parámetros en Reportes:**
   - Permitir queries parametrizadas
   - Formulario para ingresar valores antes de ejecutar

2. **Tipos Adicionales:**
   - Implementar Store Procedure
   - Implementar API

3. **Formateo Avanzado:**
   - Colores condicionales en celdas
   - Agregaciones (totales, promedios)
   - Gráficos incorporados

4. **Programación de Reportes:**
   - Ejecución automática
   - Envío por email

5. **Exportación Avanzada:**
   - PDF
   - CSV
   - Formato personalizado de Excel con estilos

## Notas Técnicas

- **Librería de Excel**: Se usa `xlsx` versión 0.18.5 (ya instalada)
- **Paginación**: Cliente-side (10 items por página)
- **Búsqueda**: Cliente-side sobre todos los datos cargados
- **Navegación**: Rutas dinámicas con Next.js 14

## Testing

### Checklist de Pruebas
- [x] Crear reporte con query válida
- [x] Editar reporte existente
- [x] Eliminar reporte
- [x] Asignar permiso de configuración de reportes a rol
- [x] Asignar reportes específicos a un rol
- [x] Ver reportes asignados en el menú según el rol
- [x] Ver reporte desde el menú
- [x] Buscar en la grilla
- [x] Navegar páginas
- [x] Exportar a Excel

### Escenarios de Prueba

1. **Crear y Asignar Reporte Básico:**
   - Crear reporte "Usuarios por Rol"
   - Asignar a rol "Supervisor"
   - Iniciar sesión como usuario con rol "Supervisor"
   - Verificar que aparece en el menú "REPORTES"
   - Visualizar y exportar

2. **Permisos Granulares:**
   - Crear 3 reportes diferentes
   - Asignar solo 2 al rol "Analista"
   - Verificar que solo aparecen los 2 asignados
   - Verificar que el tercero no es accesible

3. **Acceso al CRUD:**
   - Rol con PermisosReportes = true: Puede ver y gestionar reportes desde Configuración
   - Rol con PermisosReportes = false: No ve la opción de Reportes en Configuración

## Resolución de Problemas Durante Implementación

### Error en layout.tsx (Resuelto ✅)

**Problema Encontrado**: 
Después de agregar la funcionalidad de reportes al layout.tsx, apareció un error de compilación:
```
Unexpected token `ConfirmProvider`. Expected jsx identifier at line 266
```

**Causa Raíz**: 
El archivo de backup (layout.tsx.backup) utilizado para revertir cambios era de una versión anterior que no incluía el sistema de tareas completo. Faltaban:
- Estados: `bandejas`, `permisosTareas`, `tareasOpen`, `bandejasOpen`
- Funciones: `loadBandejas()`, `loadPermisosTareas()`
- Menús: Sección de Tareas y Bandejas
- Imports: BotonCrearTarea, chatbot.css, varios iconos

**Proceso de Solución**:
1. **Restauración desde Git**:
   ```powershell
   git checkout 23b6b12 -- src/app/dashboard/layout.tsx
   ```
   Se restauró el commit "feat: Implementar widgets de tareas en dashboard y corregir asignaciones" que contenía el sistema completo.

2. **Aplicación Incremental de Cambios**:
   - **Paso 1**: Agregar estado de reportes
     ```typescript
     const [reportes, setReportes] = useState<any[]>([]);
     ```
   
   - **Paso 2**: Agregar llamada en useEffect
     ```typescript
     loadReportes(token);
     ```
   
   - **Paso 3**: Implementar función loadReportes
     ```typescript
     const loadReportes = async (token: string) => {
       try {
         const response = await fetch("/api/reportes?porRol=true", {
           headers: { Authorization: `Bearer ${token}` },
         });
         const data = await response.json();
         if (data.success) {
           setReportes(data.data || []);
         }
       } catch (error) {
         console.error("Error cargando reportes:", error);
       }
     };
     ```
   
   - **Paso 4**: Agregar sección de menú dinámico (entre Bandejas y Módulos)
     ```tsx
     {reportes.length > 0 && (
       <div>
         <div className="px-3 py-2 text-xs font-semibold...">
           REPORTES
         </div>
         {reportes.map((reporte) => (
           <Link key={reporte.Id} href={`/dashboard/reporte/${reporte.Id}`}>
             <Button...>
               <BarChart3 className="mr-2 h-4 w-4" />
               {reporte.Nombre}
             </Button>
           </Link>
         ))}
       </div>
     )}
     ```
   
   - **Paso 5**: Agregar opción en Configuración (solo admin)
     ```tsx
     <Link href="/dashboard/reportes">
       <Button...>
         <BarChart3 className="mr-2 h-4 w-4" />
         Reportes
       </Button>
     </Link>
     ```

3. **Verificación**:
   ```powershell
   npm run dev
   # ✅ Ready in 3.4s
   # ✅ No compilation errors
   # ✅ Server running on http://localhost:3001
   ```

**Lecciones Aprendidas**:
- Mantener backups versionados con timestamps
- Usar git como fuente de verdad para restauraciones
- Aplicar cambios incrementales con verificación después de cada paso
- Verificar compilación antes de continuar con siguiente modificación

**Estado Final**: ✅ Resuelto completamente, sistema funcionando en puerto 3001

---

## Soporte

Para reportar issues o sugerencias, contactar al equipo de desarrollo.
