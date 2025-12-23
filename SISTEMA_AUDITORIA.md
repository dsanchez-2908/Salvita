# Sistema de Auditoría y Trazas - Documentación

## Resumen

Se ha implementado un sistema completo de auditoría y trazas que registra todas las actividades realizadas en el sistema, tanto en las pantallas de configuración como en los módulos dinámicos.

## Características Implementadas

### 1. Tabla de Auditoría (TD_TRAZAS)

Se creó la tabla `TD_TRAZAS` que almacena:
- **FechaHora**: Fecha y hora exacta de la acción
- **UsuarioId**: ID del usuario que realizó la acción
- **Usuario**: Nombre del usuario
- **Accion**: Tipo de acción (Agregar, Modificar, Eliminar)
- **Proceso**: Pantalla o módulo donde se realizó la acción
- **Detalle**: Descripción detallada de lo que se hizo

### 2. Registro Automático de Trazas

Se registran automáticamente las trazas en:

#### Pantallas de Configuración:
- ✅ **Usuarios**: Crear, modificar y eliminar usuarios
- ✅ **Roles**: Crear, modificar y eliminar roles (incluye permisos)
- ✅ **Módulos**: Crear, modificar y eliminar módulos
- ✅ **Listas**: Crear, modificar y eliminar listas y sus valores
- ✅ **Parámetros**: Solo modificaciones (agregar y eliminar están ocultos)

#### Módulos Dinámicos:
- ✅ **Registros Principales**: Agregar, modificar y eliminar
- ✅ **Registros Secundarios**: Agregar, modificar y eliminar

Cada traza incluye:
- El nombre del usuario que realizó la acción
- El tipo de acción (Agregar/Modificar/Eliminar)
- La pantalla o módulo afectado
- Detalles específicos de los cambios realizados

### 3. Pantalla de Consulta de Auditoría

Se creó la pantalla **Consultas > Auditoría** accesible desde el menú lateral (solo para administradores).

#### Filtros Disponibles:
1. **Proceso/Pantalla**: Buscar por nombre de proceso (ej: "Usuarios", "Roles", "Módulo: Productos")
2. **Fecha Desde / Hasta**: Rango de fechas para filtrar las trazas
3. **Usuario**: Filtrar por usuario específico (lista desplegable)
4. **Acción**: Filtrar por tipo de acción (Agregar, Modificar, Eliminar)

#### Visualización:
- Cada traza muestra un badge de color según la acción:
  - 🟢 Verde: Agregar
  - 🔵 Azul: Modificar
  - 🔴 Rojo: Eliminar
- Información completa: fecha/hora, usuario, proceso y detalle
- Ordenadas por fecha descendente (más recientes primero)
- Contador de resultados encontrados

### 4. Nueva Sección en el Menú

Se agregó la sección **"Consultas"** en el menú lateral, después de Configuración:
- Solo visible para administradores
- Desplegable con botón de chevron
- Contiene el enlace a "Auditoría"

### 5. Permisos y Seguridad

- ✅ Solo los administradores pueden ver las trazas
- ✅ La API `/api/trazas` valida que el usuario sea administrador
- ✅ El registro de trazas no interrumpe las operaciones principales (manejo de errores silencioso)
- ✅ El módulo "Trazas" fue agregado a la base de datos con permisos para administradores

## Archivos Creados/Modificados

### Nuevos Archivos:
1. `database/migrations/create_trazas_table.sql` - Script para crear la tabla TD_TRAZAS
2. `database/migrations/add_trazas_module.sql` - Script para agregar el módulo al sistema
3. `src/app/api/trazas/route.ts` - API para consultar y registrar trazas
4. `src/app/dashboard/trazas/page.tsx` - Página de consulta de auditoría

### Archivos Modificados:
1. `src/lib/auth.ts` - Agregada función `registrarTraza()`
2. `src/app/api/usuarios/route.ts` - Registro de trazas en POST, PUT, DELETE
3. `src/app/api/roles/route.ts` - Registro de trazas en POST, PUT, DELETE
4. `src/app/api/modulos/route.ts` - Registro de trazas en POST, PUT, DELETE
5. `src/app/api/listas/route.ts` - Registro de trazas en POST, PUT, DELETE
6. `src/app/api/listas/[id]/valores/route.ts` - Registro de trazas en POST, PUT, DELETE
7. `src/app/api/modulos/[id]/datos/route.ts` - Registro de trazas en POST, PUT, DELETE
8. `src/app/dashboard/layout.tsx` - Agregada sección "Consultas" en el menú

## Cómo Usar

### Para Consultar Trazas:

1. Ingresar al sistema como **administrador**
2. En el menú lateral, hacer clic en **"Consultas"**
3. Seleccionar **"Auditoría"**
4. Aplicar los filtros deseados:
   - Escribir el nombre del proceso (ej: "Usuarios", "Módulo: Productos")
   - Seleccionar rango de fechas
   - Elegir un usuario específico
   - Filtrar por tipo de acción
5. Hacer clic en **"Buscar"**
6. Revisar los resultados ordenados por fecha

### Ejemplos de Búsqueda:

- **Ver todos los cambios de un usuario específico**: Seleccionar el usuario y dejar los demás filtros vacíos
- **Ver actividad de hoy**: Poner la fecha de hoy en "Fecha Desde" y "Fecha Hasta"
- **Ver solo eliminaciones**: Seleccionar "Eliminar" en el filtro de Acción
- **Ver cambios en Usuarios**: Escribir "Usuarios" en Proceso

## Ejemplos de Trazas Registradas

### Usuario Creado:
```
Acción: Agregar
Proceso: Usuarios
Detalle: Usuario creado: jperez (Juan Pérez). Roles asignados: 2
```

### Módulo Modificado:
```
Acción: Modificar
Proceso: Módulos
Detalle: Módulo modificado (ID: 5). Cambios: Nombre: Productos, Orden: 3, Campos actualizados: 8
```

### Registro Eliminado:
```
Acción: Eliminar
Proceso: Módulo: Clientes
Detalle: Registro eliminado (ID: 123)
```

### Rol Modificado:
```
Acción: Modificar
Proceso: Roles
Detalle: Rol modificado (ID: 3). Cambios: Nombre: Supervisor, Estado: Activo, Permisos actualizados: 5
```

## Notas Importantes

1. **Rendimiento**: El sistema está optimizado para no afectar el rendimiento. Si falla el registro de una traza, la operación principal continúa sin errores.

2. **Almacenamiento**: Las trazas se almacenan indefinidamente. Se recomienda implementar un proceso de limpieza periódica para trazas antiguas (por ejemplo, eliminar trazas de más de 1 año).

3. **Privacidad**: Las trazas contienen información sensible. Solo los administradores tienen acceso a ellas.

4. **Índices**: La tabla TD_TRAZAS tiene índices en FechaHora, UsuarioId y Proceso para optimizar las consultas.

## Próximas Mejoras Sugeridas

1. **Exportar a Excel**: Agregar botón para exportar los resultados filtrados a Excel
2. **Dashboard de Auditoría**: Crear gráficos con estadísticas de actividad
3. **Alertas**: Configurar alertas para acciones específicas (ej: eliminaciones masivas)
4. **Limpieza Automática**: Script para archivar o eliminar trazas antiguas
5. **Permisos Granulares**: Permitir que roles no administradores vean trazas de ciertos módulos

## Soporte

Para cualquier problema o consulta sobre el sistema de auditoría, contactar al administrador del sistema.

---

**Fecha de Implementación**: 23 de diciembre de 2025
**Versión**: 1.0
