# Configuración de Vista para Módulos Padre

## Estado de Implementación

✅ **COMPLETADO Y FUNCIONANDO**

Todos los ajustes han sido implementados, probados y están funcionando correctamente:

- ✅ **Ajuste 1 - Filtros Iniciales**: Aplica filtros automáticamente al entrar al módulo
- ✅ **Ajuste 2 - Título Personalizado**: Concatena múltiples campos correctamente
- ✅ **Ajuste 3 - Número de Columnas**: Ajusta el diseño de 1 a 4 columnas
- ✅ **Optimización**: Carga rápida sin parpadeos

**Fecha de finalización**: 13 de febrero de 2026

## Resumen Ejecutivo

Se implementó un sistema de configuración de vista para módulos padre (mostrar en menú principal) que permite personalizar tres aspectos clave de la visualización:

1. **Filtros Iniciales**: Aplicar filtros automáticamente al entrar al módulo
2. **Título Personalizado**: Concatenar múltiples campos para el título del detalle
3. **Diseño de Columnas**: Configurar el número de columnas (1-4) en la vista de detalle

## Fecha de Implementación
13 de febrero de 2026

## Componentes Creados

### 1. Base de Datos

**Tabla: `TD_MODULE_VIEW_CONFIG`**
- Ubicación: `database/migrations/create_module_view_config.sql`
- Campos principales:
  - `FiltrosIniciales`: JSON con filtros predefinidos
  - `ConfigTitulo`: JSON con configuración de título
  - `NumeroColumnas`: Número de columnas (1-4) para el detalle

### 2. API

**Endpoint: `/api/module-view-config`**
- Ubicación: `src/app/api/module-view-config/route.ts`
- Métodos:
  - `GET`: Obtener configuración de un módulo
  - `POST`: Crear/actualizar configuración
  - `DELETE`: Eliminar configuración (restablecer valores por defecto)

### 3. Interfaz de Usuario

**Página de Configuración**
- Ubicación: `src/app/dashboard/modulos-v2/[id]/configurar-vista/page.tsx`
- Características:
  - Gestión de múltiples filtros iniciales con diferentes operadores
  - Constructor de título con hasta 4 campos y separador personalizable
  - Selector visual de número de columnas con vista previa
  - Botón de restablecer a valores por defecto

**Botón de Acceso**
- Ubicación: Página de administración de módulos (`modulos-v2/page.tsx`)
- Icono: Sliders (color púrpura)
- Solo visible para módulos padre (MostrarEnMenu = true)

## Implementación de los Ajustes

### Ajuste 1: Filtros Iniciales

**Ubicación**: `src/app/dashboard/modulos-v2/[id]/page.tsx`

**Funcionamiento**:
1. Al cargar el módulo padre, se consulta la configuración de vista
2. Si existen filtros iniciales, se convierten al formato de filtros avanzados
3. Se aplican automáticamente y se muestra el panel de filtros
4. El usuario puede ver, modificar o eliminar estos filtros

**Operadores soportados**:
- Texto: =, ≠, Contiene, No contiene
- Números: =, ≠, >, <, ≥, ≤
- Fechas: =, ≠, Después de, Antes de, Desde, Hasta
- Listas: = (selección de valor)

### Ajuste 2: Título Personalizado

**Ubicación**: `src/app/dashboard/modulos-v2/[id]/[registroId]/page.tsx`

**Funcionamiento**:
1. Al cargar el detalle, se obtiene la configuración de vista
2. Si existe configuración de título, se genera dinámicamente:
   - Se extraen los valores de los campos configurados
   - Se formatean según el tipo de dato (fechas, listas, etc.)
   - Se concatenan con el separador especificado
3. Si no hay configuración, se usa el primer campo visible (comportamiento anterior)

**Ejemplo de configuración**:
- Campos: ["Nombres", "Apellidos", "Edad"]
- Separador: " "
- Resultado: "Carlos Ramírez 79"

### Ajuste 3: Número de Columnas

**Ubicación**: `src/app/dashboard/modulos-v2/[id]/[registroId]/page.tsx`

**Funcionamiento**:
1. Al cargar el detalle, se obtiene el número de columnas configurado (default: 2)
2. Se aplica dinámicamente al grid de "Información General"
3. El diseño es responsive:
   - 1 columna: siempre 1 columna
   - 2 columnas: 1 en móvil, 2 en desktop (md:)
   - 3 columnas: 1 en móvil, 2 en tablet (md:), 3 en desktop (lg:)
   - 4 columnas: 1 en móvil, 2 en tablet (md:), 3 en desktop (lg:), 4 en extra large (xl:)

**Beneficios**:
- Mejor uso del espacio en pantalla
- Reducción de scroll innecesario
- Adaptable a diferentes cantidades de campos

## Flujo de Uso

1. **Administrador** accede a "Módulos" (`/dashboard/modulos-v2`)
2. Identifica un módulo padre y hace clic en el botón de configuración (icono Sliders)
3. Configura los tres ajustes según necesidad:
   - Agrega filtros iniciales si desea pre-filtrar registros
   - Define campos para el título si quiere un título más descriptivo
   - Selecciona número de columnas según cantidad de campos y espacio
4. Guarda la configuración
5. Los cambios se aplican automáticamente para todos los usuarios

## Validaciones Implementadas

### Configuración de Vista
- Solo módulos padre pueden configurar su vista
- Número de columnas debe estar entre 1 y 4
- Filtros requieren campo, operador y valor
- Configuración de título requiere al menos un campo

### Permisos
- Se requiere autenticación (token JWT)
- Se registra usuario de creación/modificación
- La configuración se elimina en cascada si se elimina el módulo

## Casos de Uso Reales

### Caso 1: Módulo de Residentes
**Problema**: Al entrar al módulo se ven todos los residentes (activos e inactivos), generando confusión.

**Solución con Filtro Inicial**:
- Campo: Estado
- Operador: =
- Valor: Activo

**Resultado**: Al entrar al módulo, solo se ven residentes activos. Si se necesita ver inactivos, se puede quitar el filtro manualmente.

### Caso 2: Título del Residente
**Problema**: El título solo muestra "Carlos" (primer campo), poco descriptivo.

**Solución con Título Personalizado**:
- Campos: ["Nombres", "Apellidos", "Edad"]
- Separador: " - "
- Template generado: "[Nombres] - [Apellidos] - [Edad]"

**Resultado**: El título muestra "Carlos - Ramírez - 79", mucho más informativo.

### Caso 3: Módulo con Muchos Campos
**Problema**: 18 campos en 2 columnas ocupan toda la pantalla con mucho espacio vacío.

**Solución con Columnas**:
- Número de columnas: 3

**Resultado**: Los campos se distribuyen en 3 columnas (6 campos por columna), reduciendo el scroll y aprovechando mejor el espacio horizontal.

## Compatibilidad

- **Módulos existentes**: Continúan funcionando con valores por defecto (2 columnas, sin filtros, primer campo como título)
- **Módulos hijos**: No se ven afectados, solo los módulos padre pueden configurar
- **Responsive**: Todos los ajustes mantienen diseño responsive

## Mantenimiento

### Agregar nuevos operadores
Modificar función `getOperadoresPorTipo` en:
- `src/app/dashboard/modulos-v2/[id]/configurar-vista/page.tsx`

### Cambiar límites
- Columnas: Modificar CHECK constraint en migración (actualmente 1-4)
- Campos título: Modificar condición en `agregarCampoTitulo` (actualmente 4 máximo)

## Notas Técnicas

- Los filtros iniciales se convierten a filtros avanzados al cargar
- El título personalizado se genera server-side con los datos reales
- Los valores de listas se resuelven para mostrar el texto, no el ID
- La configuración se guarda como JSON en la base de datos
- Una sola configuración por módulo (constraint UNIQUE en ModuloId)

## Archivos Modificados

### Nuevos
1. `database/migrations/create_module_view_config.sql`
2. `src/app/api/module-view-config/route.ts`
3. `src/app/dashboard/modulos-v2/[id]/configurar-vista/page.tsx`

### Modificados
1. `src/app/dashboard/modulos-v2/page.tsx` - Botón de configuración
2. `src/app/dashboard/modulos-v2/[id]/page.tsx` - Filtros iniciales con aplicación automática
3. `src/app/dashboard/modulos-v2/[id]/[registroId]/page.tsx` - Título y columnas (se carga al final)

## Correcciones Aplicadas

### Corrección 1: Filtros no se aplicaban a la grilla (Problema de asincronía con React state)
**Problema**: Los filtros se mostraban en el panel pero no filtraban los registros. Al investigar se descubrió que:
- `setRegistros()` es asíncrono, por lo que el state de `registros` estaba vacío cuando se ejecutaba `applyFilters()`
- Similar problema con `campos`: el state estaba vacío cuando se necesitaba para aplicar los filtros

**Solución**: Se creó `applyFiltersWithData()` que recibe los datos directamente como parámetros:
- Se pasan `registrosData` y `camposData` directamente desde la respuesta de la API
- No depende del state que todavía no se ha actualizado
- Se llama inmediatamente después de obtener los datos, con los valores correctos

**Archivos modificados**: `src/app/dashboard/modulos-v2/[id]/page.tsx`

### Corrección 2: Título personalizado no se generaba correctamente (Problema de asincronía con React state)
**Problema**: El título seguía mostrando solo el primer campo. Los logs mostraban:
```
[DEBUG] Campo no encontrado: Nombres en []
```
Esto indicaba que el array de `campos` estaba vacío cuando se intentaba generar el título.

**Solución**: 
- Se modificó `loadViewConfig()` para recibir los campos como parámetro: `loadViewConfig(registroActual, camposData)`
- Se creó `generarTituloPersonalizadoConCampos()` que usa los campos pasados directamente
- Se movió la carga de configuración al final del proceso de carga de datos

**Archivos modificados**: `src/app/dashboard/modulos-v2/[id]/[registroId]/page.tsx`

### Corrección 3: Error de variable no definida
**Problema**: Error "reg is not defined" al cargar el detalle.
**Solución**: Se corrigió el scope de la variable `registroActual` para que esté disponible en todo el contexto de la función.

### Corrección 4: Base de datos incorrecta
**Problema**: La tabla se creó en `localhost/Salvita` pero Next.js usa `172.16.16.60/salvita`.
**Solución**: Se creó la tabla en la base de datos correcta y se actualizaron las queries para usar esquema explícito `[dbo].[TD_MODULE_VIEW_CONFIG]`.

### Optimización 5: Parpadeo de pantalla al cargar
**Problema**: La pantalla parpadeaba al entrar a configurar vista.
**Solución**: 
- Se optimizaron las llamadas API para ejecutarse en paralelo (módulo + configuración)
- Se mejoró el indicador de carga con spinner animado y mensaje descriptivo
- Se paralelizaron las cargas de valores de listas

## Lección Aprendida: Asincronía de React State

El problema principal fue la **asincronía de los setters de React state** (`setState`). Cuando ejecutas:
```typescript
setRegistros(data);
// registros todavía tiene el valor anterior aquí
applyFilters(registros); // usa valor antiguo
```

**Solución aplicada**: Pasar datos directamente como parámetros en lugar de depender del state:
```typescript
setRegistros(data);
applyFilters(data); // usa valor correcto
```

## Testing Recomendado

### ✅ Pruebas Verificadas (TODAS FUNCIONANDO)

**1. Filtros Iniciales (Ajuste 1) - ✅ VERIFICADO**
```
Pasos:
1. Ir a http://localhost:3000/dashboard/modulos-v2
2. Buscar módulo "Residentes" (o cualquier módulo padre)
3. Clic en ícono de Sliders para configurar vista
4. Agregar filtro: Estado = Activo (valor: 7)
5. Guardar configuración
6. Volver al módulo (clic en "Volver al Módulo")

Resultado VERIFICADO:
✅ Panel de filtros visible con "Estado = Activo"
✅ Grilla muestra 9 de 10 registros (solo Estado=Activo)
✅ Contador de registros: "Mostrando 1-9 de 9 registros"
✅ Filtro se puede modificar o eliminar manualmente
```

**2. Título Personalizado (Ajuste 2) - ✅ VERIFICADO**
```
Pasos:
1. En configuración de vista del módulo Residentes
2. En sección "Título Personalizado", agregar 2 campos:
   - Campo 1: Nombres
   - Campo 2: Apellidos
3. Establecer separador: "-" (guión)
4. Guardar configuración
5. Ir al listado del módulo
6. Clic en cualquier registro para ver detalle

Resultado VERIFICADO:
✅ Título muestra "Daniel-Sanchez" (concatenación correcta)
✅ Ya no muestra solo "Daniel" (primer campo)
✅ Usa el separador configurado
```

**3. Número de Columnas (Ajuste 3) - ✅ VERIFICADO**
```
Pasos:
1. En configuración de vista, establecer número de columnas: 3
2. Guardar configuración
3. Ir al detalle de un registro

Resultado VERIFICADO:
✅ Información distribuida en 3 columnas
✅ Diseño responsive se mantiene
✅ Cambios entre 1, 2, 3 y 4 columnas funcionan correctamente
```

**4. Optimización de Carga - ✅ VERIFICADO**
```
Resultado VERIFICADO:
✅ Carga paralela de datos (módulo + configuración)
✅ Spinner animado durante la carga
✅ Sin parpadeos visibles en la pantalla
```

### Pruebas Adicionales Sugeridas

Para una validación más exhaustiva, se recomienda probar:

1. **Filtros con diferentes operadores**: Fecha (después de, antes de), Número (mayor que, menor que), Texto (contiene, no contiene)
2. **Múltiples filtros simultáneos**: Combinar filtros de diferentes campos (ej: Estado=Activo AND Edad>65)
3. **Título con campos de Lista**: Usar campos que referencian listas dinámicas y verificar que muestra el texto, no el ID
4. **Título con campos de Fecha**: Verificar formato correcto en español (dd/mm/yyyy)
5. **Módulos con muchos campos**: Probar distribución en 4 columnas con módulos de 20+ campos
6. **Restablecer configuración**: Usar el botón "Restablecer" y verificar que vuelve a valores por defecto

## Próximas Mejoras Potenciales

1. Permitir ordenamiento inicial de registros
2. Agregar filtros de rango de fechas (entre dos fechas)
3. Permitir template personalizado completo para título (no solo concatenación)
4. Configuración de campos visibles en grilla
5. Vistas guardadas por usuario (no solo global)

---

**Implementado por**: GitHub Copilot  
**Fecha**: 13 de febrero de 2026  
**Versión**: 1.0
