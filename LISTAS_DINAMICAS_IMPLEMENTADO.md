# Implementación de Listas Dinámicas

## Resumen

Se ha implementado la funcionalidad de **Listas Dinámicas** que permite crear listas que obtienen sus valores de campos de módulos V2, además de mantener las listas de valores fijos existentes.

## Tipos de Lista

### 1. Valores Fijos (existente)
- Funciona igual que antes
- Los valores se ingresan manualmente
- Se guardan en `TD_VALORES_LISTA`

### 2. Valores de un Módulo (NUEVO)
- Obtiene valores dinámicamente de un campo de un módulo V2
- Los valores se actualizan automáticamente cuando cambian en el módulo origen
- Permite aplicar filtros opcionales

### 3. Valores desde API (futuro)
- Preparado en la estructura pero no implementado aún

## Arquitectura Técnica

### Base de Datos

**Tabla TD_LISTAS** - Nuevos campos agregados:
```sql
TipoLista VARCHAR(20)         -- 'ValoresFijos', 'ValoresModulo', 'ValoresAPI'
ModuloOrigenId INT NULL       -- Módulo del cual obtener valores
CampoValorId INT NULL         -- Campo que se mostrará como valor
FiltroActivo BIT              -- Si aplica filtro al obtener valores
FiltroCampoId INT NULL        -- Campo para filtrar
FiltroOperador VARCHAR(10)    -- '=', '<>', '<', '>', '<=', '>=', 'LIKE'
FiltroValor VARCHAR(250)      -- Valor del filtro
```

**Foreign Keys:**
- `FK_TD_LISTAS_ModuloOrigen` → TD_MODULOS(Id)
- `FK_TD_LISTAS_CampoValor` → TD_CAMPOS(Id)
- `FK_TD_LISTAS_FiltroCampo` → TD_CAMPOS(Id)

### APIs

#### 1. `/api/listas` (actualizado)
- **GET**: Obtiene listas con información de módulo y campo origen
- **GET con ID**: Retorna valores dinámicos según TipoLista
  - ValoresFijos: Desde TD_VALORES_LISTA
  - ValoresModulo: Query dinámico a la tabla del módulo
- **POST**: Acepta nuevos campos para listas dinámicas
- **PUT**: Actualiza configuración de listas dinámicas

#### 2. `/api/modulos-campos` (nuevo)
- **GET**: Lista módulos activos para selector
- **GET ?moduloId=X**: Lista campos de un módulo específico

### Frontend

**Página `/dashboard/listas`** actualizada con:
- Selector de "Tipo de Lista"
- Selectores condicionales cuando TipoLista = 'ValoresModulo':
  - Módulo Origen
  - Campo Valor
  - Filtro Activo (checkbox)
  - Configuración de filtro (campo, operador, valor)
- Tabla actualizada mostrando tipo y origen de cada lista
- Íconos visuales: Database para módulo, List para fijos

## Cómo Usar

### Crear Lista de Valores Fijos (como antes)
1. Ir a http://localhost:3000/dashboard/listas
2. Clic en "Nueva Lista"
3. Tipo de Lista: "Valores Fijos"
4. Agregar valores manualmente
5. Guardar

### Crear Lista Dinámica desde Módulo
1. Ir a http://localhost:3000/dashboard/listas
2. Clic en "Nueva Lista"
3. Nombre: "Lista Profesores Activos" (ejemplo)
4. Tipo de Lista: "Valores de un Módulo"
5. Módulo Origen: Seleccionar "Profesores v4"
6. Campo Valor: Seleccionar "Nombre Completo"
7. **(Opcional)** Activar filtro:
   - ☑ Aplicar filtro a los valores
   - Campo para filtrar: "Estado"
   - Operador: "="
   - Valor: "Activo"
8. Guardar

## Manejo de IDs (Solución Implementada)

### Problema
Los campos de tipo Lista en módulos guardan IDs (INT). Con listas dinámicas, ¿qué ID guardar?

### Solución: IDs Contextualizados
- **Para ValoresFijos**: Se guarda el ID de TD_VALORES_LISTA
- **Para ValoresModulo**: Se guarda el ID del registro del módulo origen
- **El contexto está en TD_LISTAS**: El campo TipoLista y ModuloOrigenId definen qué significa ese ID

**Ejemplo:**
```
Campo "Profesor" en módulo "Clases" tiene valor: 15

Si la lista "Profesores" es tipo ValoresModulo:
  → 15 es el Id del registro en la tabla de Profesores v4
  
Si la lista fuera tipo ValoresFijos:
  → 15 sería el Id en TD_VALORES_LISTA
```

## Filtros Soportados

| Operador | Descripción | Ejemplo |
|----------|-------------|---------|
| = | Igual | Estado = "Activo" |
| <> | Distinto | Estado <> "Baja" |
| < | Menor que | Edad < 18 |
| > | Mayor que | Promedio > 7 |
| <= | Menor o igual | Cantidad <= 100 |
| >= | Mayor o igual | Sueldo >= 50000 |
| LIKE | Contiene | Nombre LIKE "Juan" |

## Pruebas Recomendadas

### Caso de Prueba 1: Lista de Profesores
1. Crear lista "Profesores Activos"
2. Tipo: Valores de un Módulo
3. Módulo: Profesores v4
4. Campo Valor: Nombre Completo
5. Filtro: Estado = "Activo"
6. Usar esta lista en un campo de otro módulo
7. Verificar que solo muestra profesores activos

### Caso de Prueba 2: Sin Filtro
1. Crear lista "Todos los Alumnos"
2. Tipo: Valores de un Módulo
3. Módulo: Alumnos v4
4. Campo Valor: Nombre Completo
5. NO activar filtro
6. Verificar que muestra todos los alumnos

### Caso de Prueba 3: Compatibilidad con Valores Fijos
1. Editar una lista existente de valores fijos
2. Verificar que funciona igual que antes
3. Crear un campo que use esa lista
4. Confirmar que guarda y muestra correctamente

## Consideraciones Futuras

### Para Implementar "Valores desde API"
1. Agregar campo `URLApi` en TD_LISTAS
2. En GET de /api/listas, si TipoLista='ValoresAPI':
   - Hacer fetch a la URL configurada
   - Mapear respuesta a formato { Id, Valor }
3. Considerar caché para no llamar a la API en cada request

### Mejoras Posibles
- **Caché de valores dinámicos**: Para listas muy usadas, cachear resultados
- **Múltiples filtros**: Permitir AND/OR de varios filtros
- **Campo ID personalizable**: Opción de elegir qué campo usar como ID (ahora siempre usa "Id")
- **Validación de integridad**: Warning si un ID guardado ya no existe en el módulo origen

## Archivos Modificados

```
✅ database/migrations/add_dynamic_lists.sql (nuevo)
✅ scripts/run-migration-dynamic-lists.js (nuevo)
✅ src/app/api/listas/route.ts (actualizado)
✅ src/app/api/modulos-campos/route.ts (nuevo)
✅ src/app/dashboard/listas/page.tsx (actualizado)
```

## Estado Final

✅ Migración de BD ejecutada correctamente
✅ API actualizada para manejar listas dinámicas
✅ Endpoint nuevo para obtener módulos y campos
✅ UI completa con selectores y filtros
✅ Sin errores de compilación TypeScript
✅ Compatible con listas de valores fijos existentes
✅ Preparado para futuro: Valores desde API

---
**Implementado:** 2026-02-08  
**Sistema:** Salvita - Gestión de Módulos Dinámicos
