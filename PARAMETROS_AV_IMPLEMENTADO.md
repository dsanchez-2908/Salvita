# Implementación: Parámetros del Asistente Virtual

## Fecha: 2026-02-10

## Resumen
Se implementó un CRUD completo para configurar el Asistente Virtual por módulo padre en el sistema Salvita.

## Archivos Creados

### 1. Base de Datos
- **`database/migrations/create_parametros_av.sql`**
  - Tabla `TD_PARAMETROS_AV` con campos:
    - `Id` (INT IDENTITY - PK)
    - `ModuloId` (INT - FK a TD_MODULOS)
    - `Prompt` (VARCHAR(MAX))
    - `Temperatura` (VARCHAR(MAX))
    - `MaxTokens` (VARCHAR(MAX))
    - `Modelo` (VARCHAR(MAX))
    - `Estado` (VARCHAR(20) - Activo/Inactivo)
    - Campos de auditoría (FechaCreacion, FechaModificacion, UsuarioCreacion, UsuarioModificacion)
  - Vista `VW_PARAMETROS_AV` para consultas con JOIN a TD_MODULOS
  - Constraint UNIQUE para una sola configuración por módulo
  - Índice para optimizar búsquedas

### 2. API Backend
- **`src/app/api/parametros-av/route.ts`**
  - GET: Listar todas las configuraciones o una específica por ID o ModuloId
  - POST: Crear nueva configuración (valida duplicados)
  - PUT: Actualizar configuración existente
  - DELETE: Eliminar configuración
  - Autenticación requerida en todos los endpoints
  - Incluye información del módulo (nombre, icono) en las respuestas

### 3. Frontend
- **`src/app/dashboard/parametros-av/page.tsx`**
  - Grilla que muestra todas las configuraciones por módulo
  - Modal para crear/editar configuraciones
  - Selector de módulos que solo muestra módulos padres (MostrarEnMenu=true)
  - Campos del formulario:
    - **Módulo** (selector con módulos disponibles)
    - **Prompt** (textarea multilinea)
    - **Modelo** (input texto - ej: gpt-4, claude-3)
    - **Temperatura** (input texto - valor 0.0-2.0)
    - **Max Tokens** (input texto - longitud máxima)
    - **Estado** (selector Activo/Inactivo)
  - Validación para evitar configuraciones duplicadas
  - Diseño responsive con dark mode
  - Iconos y estilos consistentes con el resto del sistema

### 4. Navegación
- **`src/app/dashboard/layout.tsx`**
  - Agregado enlace "Parámetros AV" en menú Configuración
  - Icono: MessageSquare
  - Solo visible para administradores

### 5. Scripts de Utilidad
- **`scripts/run-migration-parametros-av.js`**
  - Script para ejecutar la migración SQL
  - Conecta a la base de datos y crea tabla y vista

- **`scripts/check-parametros-av.js`**
  - Script para verificar que la tabla fue creada correctamente
  - Muestra estructura de columnas y estadísticas

## Características Implementadas

### Funcionalidad Principal
✅ CRUD completo de configuraciones del Asistente Virtual
✅ Una configuración por módulo padre (relación 1:1)
✅ Solo módulos que se muestran en menú pueden configurarse
✅ Validación de duplicados automática
✅ Auditoría completa (usuario y fechas de creación/modificación)

### Campos de Configuración
✅ **Prompt del Sistema**: Instrucciones base para el comportamiento del asistente
✅ **Modelo**: Identificador del modelo de IA a utilizar (gpt-4, claude-3, etc.)
✅ **Temperatura**: Control de creatividad/aleatoriedad (0.0-2.0)
✅ **Max Tokens**: Longitud máxima de respuesta
✅ **Estado**: Activo/Inactivo para habilitar/deshabilitar configuraciones

### UI/UX
✅ Interfaz consistente con el resto del sistema
✅ Dark mode completamente soportado
✅ Feedback visual con toasts para todas las acciones
✅ Diálogos de confirmación para eliminaciones
✅ Información contextual (tooltips y descripciones)
✅ Visualización de campos largos con truncamiento inteligente
✅ Iconos descriptivos para mejor usabilidad

### Seguridad
✅ Autenticación requerida en todos los endpoints
✅ Solo administradores pueden acceder a la funcionalidad
✅ Validación de datos en backend y frontend
✅ Protección contra inyección SQL usando parámetros

## Cómo Usar

### Para Administradores
1. Acceder al Dashboard → Configuración → Parámetros AV
2. Hacer clic en "Nueva Configuración"
3. Seleccionar un módulo de la lista
4. Configurar los parámetros del asistente:
   - Prompt: Describir el comportamiento deseado
   - Modelo: Especificar el modelo de IA (opcional)
   - Temperatura: Ajustar creatividad (opcional)
   - Max Tokens: Limitar longitud de respuesta (opcional)
5. Guardar la configuración

### Para Desarrolladores
```typescript
// Obtener configuración de un módulo
const response = await fetch(`/api/parametros-av?moduloId=${moduloId}`, {
  headers: { Authorization: `Bearer ${token}` }
});
const config = await response.json();

// La configuración estará disponible en config.data
// Si no hay configuración, config.data será null
```

## Próximos Pasos Sugeridos

### Extensiones Futuras
- [ ] Agregar campo "Mensajes de Ejemplo" para entrenar mejor el asistente
- [ ] Agregar campo "Funciones/Tools" para definir capacidades específicas
- [ ] Agregar campo "Fuentes de Conocimiento" para RAG (URLs, documentos)
- [ ] Implementar versionado de configuraciones
- [ ] Agregar pruebas/testing del asistente desde la UI
- [ ] Historial de cambios en configuraciones
- [ ] Duplicar configuración de un módulo a otro
- [ ] Plantillas predefinidas de configuración

### Integraciones
- [ ] Conectar con el componente Chatbot existente
- [ ] Implementar API para obtener configuración activa por módulo
- [ ] Agregar logs de uso del asistente por módulo
- [ ] Métricas de efectividad por configuración

## Notas Técnicas

- Todos los campos de configuración son VARCHAR(MAX) para máxima flexibilidad
- La relación con TD_MODULOS usa ON DELETE CASCADE para limpieza automática
- La constraint UNIQUE previene configuraciones duplicadas a nivel de BD
- La vista VW_PARAMETROS_AV facilita consultas con JOIN pre-configurado
- El frontend solo carga módulos con MostrarEnMenu=true usando el endpoint `modulos-v2?soloMenu=true`

## Verificación

Para verificar que todo está funcionando:
```bash
# Verificar estructura de tabla
node scripts/check-parametros-av.js

# Verificar que el servidor Next.js esté corriendo
npm run dev

# Acceder a: http://localhost:3000/dashboard/parametros-av
```

## Contacto
Si necesitas agregar más campos o funcionalidades al Asistente Virtual, edita:
1. `database/migrations/create_parametros_av.sql` - Agregar columnas
2. `src/app/api/parametros-av/route.ts` - Agregar lógica de API
3. `src/app/dashboard/parametros-av/page.tsx` - Agregar campos al formulario
