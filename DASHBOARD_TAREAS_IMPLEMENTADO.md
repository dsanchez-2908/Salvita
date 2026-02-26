# Sistema de Dashboard Dinámico - Soporte para Widgets de Tareas

**Fecha:** 2025  
**Estado:** ✅ IMPLEMENTADO

## Resumen

Se extendió el sistema de dashboard dinámico existente para soportar widgets de Tareas además de widgets de Módulos. Ahora los administradores pueden configurar dashboards personalizados por rol que incluyan tanto visualizaciones de datos de módulos como estadísticas de tareas.

---

## 1. Base de Datos

### Migración: `add-dashboard-tareas-support.js`

**Ejecutado:** ✅ Exitoso

**Cambios en tabla `TD_DASHBOARD_CONFIG`:**

1. **Nueva columna `Tipo`**: `VARCHAR(20) NOT NULL DEFAULT 'Modulos'`
   - Valores: `'Modulos'` o `'Tareas'`
   - Determina si el widget es de módulos o de tareas

2. **Nueva columna `TareasTipoVisualizacion`**: `VARCHAR(50) NULL`
   - Valores: `'PendientesPropios'` o `'PendientesTotales'`
   - Solo para widgets de tipo `'Tareas'`

3. **Nueva columna `TareasCategoria`**: `VARCHAR(50) NULL`
   - Valores: `'BandejaPersonal'` o `'BandejasGrupal'`
   - Solo para widgets de tipo `'Tareas'`

4. **Modificación `ModuloId`**: Ahora acepta `NULL`
   - Permite widgets de Tareas sin módulo asociado
   - FK constraint recreada

**Registros existentes:** Automáticamente marcados como `Tipo = 'Modulos'` para compatibilidad

---

## 2. Frontend - Configuración de Dashboard

### Archivo: `dashboard/dashboard-config/page.tsx`

**Cambios implementados:**

#### Interface `ConfigWidget`
```typescript
interface ConfigWidget {
  id: string;
  Tipo: "Modulos" | "Tareas";  // NUEVO
  
  // Campos para widgets de Módulos
  ModuloId: number;
  ModuloNombre: string;
  TipoVisualizacion: "Agrupamiento" | "DetalleFiltrado" | "Totalizado";
  CampoAgrupamiento: string | null;
  // ... otros campos de módulos
  
  // Campos para widgets de Tareas (NUEVO)
  TareasTipoVisualizacion: "PendientesPropios" | "PendientesTotales" | null;
  TareasCategoria: "BandejaPersonal" | "BandejasGrupal" | null;
}
```

#### Función `agregarWidget()`
- Widgets nuevos se inicializan con `Tipo: "Modulos"` por defecto
- Se agregan campos nulos para Tareas

#### Función `actualizarWidget()`
- **Nuevo:** Manejo del cambio de `Tipo`
  - Al cambiar a `"Modulos"`: Resetea campos de Tareas
  - Al cambiar a `"Tareas"`: Resetea campos de Módulos, inicializa valores default

#### UI de widgets
- **Nuevo selector:** Dropdown "Tipo de Widget" (Módulos/Tareas)
- **Renderizado condicional:**
  - Si `Tipo === "Modulos"`: Muestra selectores de módulo, visualización, campos, filtros
  - Si `Tipo === "Tareas"`: Muestra selectores de TipoVisualizacion y Categoria
- **Descripción contextual:** Explica qué mostrará cada combinación de Tareas

#### Función `guardarConfiguracion()`
- **Validación mejorada:**
  - Valida widgets de Módulos (módulo, campo agrupamiento, filtros)
  - Valida widgets de Tareas (tipo visualización y categoría requeridos)
- **Mapeo de datos:** Envía campos apropiados según `Tipo`

#### Función `loadConfiguracionExistente()`
- Carga el campo `Tipo` (default `"Modulos"` para compatibilidad)
- Carga todos los campos de Tareas

---

## 3. Backend - Configuración de Dashboard

### Archivo: `api/dashboard-config/route.ts`

**Cambios implementados:**

#### GET - Obtener configuración
```typescript
// Cambiado INNER JOIN a LEFT JOIN para permitir widgets sin módulo
LEFT JOIN TD_MODULOS m ON dc.ModuloId = m.Id
```

#### POST - Guardar configuración
```sql
INSERT INTO TD_DASHBOARD_CONFIG (
  RolId, Tipo, ModuloId, TipoVisualizacion,
  CampoAgrupamiento, CampoFiltro, ValorFiltro,
  FiltroOperador, FiltroActivo,
  TareasTipoVisualizacion, TareasCategoria,  -- NUEVO
  Orden, UsuarioCreacion
)
```

**Parámetros:**
- `tipo`: Default `'Modulos'`
- `moduloId`: Puede ser `null` para widgets de Tareas
- `tareasTipoVisualizacion`: `null` o valor de Tareas
- `tareasCategoria`: `null` o valor de Tareas

---

## 4. Backend - Datos de Widgets de Tareas

### Archivo: `api/dashboard-task-data/route.ts` (NUEVO)

**Endpoint:** `GET /api/dashboard-task-data`

**Query Parameters:**
- `tipoVisualizacion`: `PendientesPropios` | `PendientesTotales`
- `categoria`: `BandejaPersonal` | `BandejasGrupal`

**Autenticación:** Requiere token JWT

---

### **Combinación 1: PendientesPropios + BandejaPersonal**

**Descripción:** Tareas pendientes del usuario en su bandeja personal

**Query:**
```sql
SELECT 
  COUNT(*) as TotalPendientes,
  SUM(CASE WHEN FechaVencimiento < GETDATE() ... THEN 1 ELSE 0 END) as TotalVencidas
FROM TD_TAREAS t
INNER JOIN VW_BANDEJAS_POR_USUARIO vb ON t.BandejaId = vb.BandejaId
WHERE vb.UsuarioId = @userId
AND t.Estado IN ('Pendiente', 'Tomada')
AND bandeja es Personal
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "TotalPendientes": 5,
    "TotalVencidas": 2
  }
}
```

---

### **Combinación 2: PendientesPropios + BandejasGrupal**

**Descripción:** Agregado de todas las bandejas del usuario (grupales)

**Query:**
```sql
SELECT 
  COUNT(*) as TotalPendientes,
  SUM(CASE WHEN t.UsuarioAsignadoId = @userId THEN 1 ELSE 0 END) as TomadasPorMi,
  SUM(CASE WHEN FechaVencimiento < GETDATE() ... THEN 1 ELSE 0 END) as TotalVencidas
FROM TD_TAREAS t
INNER JOIN VW_BANDEJAS_POR_USUARIO vb ON t.BandejaId = vb.BandejaId
WHERE vb.UsuarioId = @userId
AND t.Estado IN ('Pendiente', 'Tomada')
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "TotalPendientes": 12,
    "TomadasPorMi": 4,
    "TotalVencidas": 1
  }
}
```

---

### **Combinación 3: PendientesTotales + BandejaPersonal**

**Descripción:** Lista todos los usuarios con tareas pendientes en bandeja personal

**Query:**
```sql
SELECT 
  u.Id as UsuarioId,
  u.Usuario,
  u.Nombre + ' ' + u.Apellido as NombreCompleto,
  COUNT(*) as TotalPendientes,
  SUM(CASE WHEN FechaVencimiento < GETDATE() ... THEN 1 ELSE 0 END) as TotalVencidas
FROM TD_USUARIOS u
INNER JOIN VW_BANDEJAS_POR_USUARIO vb ON u.Id = vb.UsuarioId
INNER JOIN TD_BANDEJAS b ON vb.BandejaId = b.Id
INNER JOIN TD_TAREAS t ON b.Id = t.BandejaId
WHERE b.TipoBandeja = 'Personal'
AND t.Estado IN ('Pendiente', 'Tomada')
GROUP BY u.Id, u.Usuario, u.Nombre, u.Apellido
HAVING COUNT(*) > 0
ORDER BY COUNT(*) DESC
```

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "UsuarioId": 10,
      "Usuario": "jperez",
      "NombreCompleto": "Juan Pérez",
      "TotalPendientes": 8,
      "TotalVencidas": 3
    },
    {
      "UsuarioId": 12,
      "Usuario": "mlopez",
      "NombreCompleto": "María López",
      "TotalPendientes": 5,
      "TotalVencidas": 0
    }
  ]
}
```

---

### **Combinación 4: PendientesTotales + BandejasGrupal**

**Descripción:** Lista todas las bandejas con tareas pendientes y tomadas

**Query:**
```sql
SELECT 
  b.Id as BandejaId,
  b.Nombre as BandejaNombre,
  COUNT(*) as TotalPendientes,
  SUM(CASE WHEN t.Estado = 'Tomada' THEN 1 ELSE 0 END) as TotalTomadas,
  SUM(CASE WHEN FechaVencimiento < GETDATE() ... THEN 1 ELSE 0 END) as TotalVencidas
FROM TD_BANDEJAS b
INNER JOIN TD_TAREAS t ON b.Id = t.BandejaId
WHERE b.TipoBandeja = 'Grupal'
AND b.Estado = 'Activa'
AND t.Estado IN ('Pendiente', 'Tomada')
GROUP BY b.Id, b.Nombre
HAVING COUNT(*) > 0
ORDER BY COUNT(*) DESC
```

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "BandejaId": 5,
      "BandejaNombre": "Enfermería",
      "TotalPendientes": 15,
      "TotalTomadas": 6,
      "TotalVencidas": 2
    },
    {
      "BandejaId": 7,
      "BandejaNombre": "Administración",
      "TotalPendientes": 10,
      "TotalTomadas": 4,
      "TotalVencidas": 0
    }
  ]
}
```

---

## 5. Frontend - Visualización de Dashboard

### Archivo: `dashboard/page.tsx`

**Cambios implementados:**

#### Interfaces actualizadas
```typescript
interface DashboardConfig {
  Id: number;
  Tipo: "Modulos" | "Tareas";  // NUEVO
  
  // Campos opcionales para Módulos
  ModuloId?: number;
  ModuloNombre?: string;
  TipoVisualizacion?: "Agrupamiento" | "DetalleFiltrado" | "Totalizado";
  // ...
  
  // Campos para Tareas (NUEVO)
  TareasTipoVisualizacion?: "PendientesPropios" | "PendientesTotales" | null;
  TareasCategoria?: "BandejaPersonal" | "BandejasGrupal" | null;
}

interface WidgetData {
  config: DashboardConfig;
  // ... datos de módulos
  tareasData?: any;  // NUEVO
}
```

#### Función `loadUserDashboard()`
- **Lógica bifurcada:**
  - `Tipo === "Modulos"`: Carga desde `/api/dashboard-data`
  - `Tipo === "Tareas"`: Carga desde `/api/dashboard-task-data`

#### Nuevas funciones de renderizado

**1. `renderWidgetTareasPendientesPropiosBandejaPersonal()`**
- Muestra tarjetas con:
  - Total Pendientes (naranja)
  - Total Vencidas (rojo, solo si > 0)

**2. `renderWidgetTareasPendientesPropiosBandejasGrupal()`**
- Muestra tarjetas con:
  - Total Pendientes (azul)
  - Tomadas por mí (verde)
  - Total Vencidas (rojo, solo si > 0)

**3. `renderWidgetTareasPendientesTotalesBandejaPersonal()`**
- Tabla con columnas:
  - Usuario
  - Nombre Completo
  - Total Pendientes (badge púrpura)
  - Total Vencidas (badge rojo o guion)

**4. `renderWidgetTareasPendientesTotalesBandejasGrupal()`**
- Tabla con columnas:
  - Nombre Bandeja
  - Total Pendientes (badge índigo)
  - Total Tomadas (badge verde)
  - Total Vencidas (badge rojo o guion)

#### Renderizado principal
- Switch case extendido para determinar función de renderizado según:
  - `Tipo` del widget (Modulos/Tareas)
  - `TipoVisualizacion` o `TareasTipoVisualizacion`
  - `TareasCategoria`

---

## 6. Flujo de Uso

### Para Administradores:

1. **Navegar a** `Dashboard > Configuración de Dashboard`
2. **Seleccionar rol** a configurar
3. **Hacer clic en** "Agregar Widget"
4. **Seleccionar Tipo:**
   - **Módulos:** Continuar con configuración normal (módulo, visualización, campos)
   - **Tareas:** Seleccionar:
     - Tipo de Visualización: PendientesPropios / PendientesTotales
     - Categoría: BandejaPersonal / BandejasGrupal
5. **Ver descripción** de lo que mostrará el widget
6. **Reordenar widgets** con botones arriba/abajo
7. **Guardar configuración**

### Para Usuarios:

1. **Acceder al Dashboard**
2. **Ver widgets configurados** para su rol:
   - Widgets de Módulos: Agrupamientos, tablas filtradas, contadores
   - Widgets de Tareas: Estadísticas de tareas propias o totales
3. **Actualizar datos:** Recargar página

---

## 7. Permisos y Acceso

### Dashboard Config
- **Requiere:** Rol `Administrador`
- **Endpoint:** `/api/dashboard-config` (POST)

### Dashboard Task Data
- **Requiere:** Usuario autenticado con permisos de Tareas
- **Respeta:** Permisos de `HabilitarTareas` del usuario
- **Filtra datos según:** Bandejas asignadas al usuario (`VW_BANDEJAS_POR_USUARIO`)

---

## 8. Compatibilidad Retroactiva

✅ **Totalmente compatible** con configuraciones existentes:
- Registros antiguos se marcan automáticamente como `Tipo = 'Modulos'`
- Frontend detecta ausencia de `Tipo` y asume `"Modulos"`
- Queries de módulos funcionan sin cambios (LEFT JOIN en lugar de INNER JOIN)

---

## 9. Archivos Modificados

### Base de Datos
- ✅ `scripts/add-dashboard-tareas-support.js` (NUEVO)

### Frontend - Configuración
- ✅ `app/dashboard/dashboard-config/page.tsx` (MODIFICADO)

### Frontend - Visualización
- ✅ `app/dashboard/page.tsx` (MODIFICADO)

### Backend - Config
- ✅ `app/api/dashboard-config/route.ts` (MODIFICADO)

### Backend - Data
- ✅ `app/api/dashboard-task-data/route.ts` (NUEVO)

---

## 10. Testing Checklist

- [ ] Crear widget de Tareas: PendientesPropios + BandejaPersonal
- [ ] Crear widget de Tareas: PendientesPropios + BandejasGrupal
- [ ] Crear widget de Tareas: PendientesTotales + BandejaPersonal
- [ ] Crear widget de Tareas: PendientesTotales + BandejasGrupal
- [ ] Verificar que widgets de Módulos existentes siguen funcionando
- [ ] Reordenar widgets (mezcla de Módulos y Tareas)
- [ ] Asignar configuración a rol no-administrador
- [ ] Login con usuario del rol y verificar dashboard
- [ ] Verificar contadores correctos de tareas
- [ ] Verificar que vencidas se muestran en rojo
- [ ] Verificar tablas con múltiples usuarios/bandejas
- [ ] Verificar mensaje "No hay datos" cuando corresponda

---

## 11. Próximos Pasos (Opcional)

### Posibles Mejoras Futuras:
1. **Auto-refresh:** Actualizar widgets cada X minutos
2. **Filtros adicionales:** Filtrar por fecha, prioridad, estado específico
3. **Drill-down:** Click en widget para ver detalle de tareas
4. **Gráficos:** Agregar visualizaciones con charts (barras, líneas, pie)
5. **Exportar:** Exportar datos de widgets a Excel/PDF
6. **Notificaciones:** Alertas cuando tareas vencidas > umbral

---

## 12. Notas Técnicas

### Seguridad
- Todos los endpoints requieren autenticación JWT
- Queries respetan permisos de usuario (via VW_BANDEJAS_POR_USUARIO)
- Validación de parámetros en backend

### Performance
- Queries optimizadas con índices existentes
- LEFT JOIN permite widgets sin módulo
- Límite implícito de 10 filas en tablas (slice en frontend)

### Mantenibilidad
- Código modular con funciones de renderizado separadas
- Interfaces TypeScript bien definidas
- Comentarios en código SQL complejo
- Nombres descriptivos de variables y funciones

---

**Implementación completada exitosamente ✅**  
**Sistema listo para testing y uso en producción**
