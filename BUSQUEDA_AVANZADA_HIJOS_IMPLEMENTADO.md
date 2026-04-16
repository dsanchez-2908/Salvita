# Búsqueda Avanzada con Módulos Hijos - IMPLEMENTADO

## 📅 Fecha de implementación
16 de Abril, 2026

## 🎯 Objetivo
Implementar una búsqueda avanzada robusta que permita aplicar filtros no solo sobre el módulo padre, sino también sobre campos de módulos hijos relacionados a través de `TR_MODULO_REGISTRO_RELACION`.

## 📋 Ejemplo de Uso Real

### Caso: Pacientes
**URL:** http://localhost:3000/dashboard/modulos-v2/1061

**Consulta:** Encontrar todos los pacientes entre 50 a 60 años donde el registro de paciente tenga Año 2026 y Mes Abril.

**Filtros aplicados:**

1. **Filtro 1:**
   - Módulo: Paciente (padre)
   - Campo: Edad
   - Condición: Entre
   - Desde: 50
   - Hasta: 60

2. **Filtro 2:**
   - Módulo: Registro de Paciente (hijo)
   - Campo: Año
   - Condición: Igual
   - Valor (lista): 2026

3. **Filtro 3:**
   - Módulo: Registro de Paciente (hijo)
   - Campo: Mes
   - Condición: Igual
   - Valor (lista): Abril

**SQL Generado (simplificado):**
```sql
SELECT DISTINCT mt.*
FROM [TD_MODULO_Pacientes] mt
INNER JOIN TR_MODULO_REGISTRO_RELACION r1234 
  ON r1234.ModuloPadreId = 1061
  AND r1234.RegistroPadreId = mt.Id
  AND r1234.ModuloHijoId = 1234
INNER JOIN [TD_MODULO_RegistroDePaciente] mh1234 
  ON mh1234.Id = r1234.RegistroHijoId
WHERE 1=1
  AND mt.[Edad] BETWEEN 50 AND 60
  AND mh1234.[año_lista] = 2026
  AND mh1234.[mes_lista] = 4
ORDER BY mt.Id DESC
```

## 🏗️ Arquitectura de la Solución

### Componentes Modificados

#### 1. Frontend: `src/app/dashboard/modulos-v2/[id]/page.tsx`

**Interfaces Actualizadas:**
```typescript
interface AdvancedFilter {
  id: string;
  moduloId: number;        // NUEVO: ID del módulo (padre o hijo)
  moduloNombre: string;    // NUEVO: Nombre del módulo para UI
  campo: string;
  operador: "igual" | "contiene" | "noContiene" | "mayor" | "menor" | "mayorIgual" | "menorIgual" | "entre";
  valor: any;
  valorHasta?: any;
}

interface ModuloHijo {     // NUEVA interfaz
  Id: number;
  Nombre: string;
  NombreTabla: string;
  Campos: Campo[];
}
```

**Estados Agregados:**
```typescript
const [modulosHijos, setModulosHijos] = useState<ModuloHijo[]>([]);
```

**Funciones Nuevas:**
- `loadModulosHijos()` - Carga módulos hijos con permisos del usuario
- `getModulosDisponibles()` - Devuelve lista de módulos disponibles para filtrar
- `getCamposDisponibles(moduloId)` - Devuelve campos del módulo especificado

**Funciones Modificadas:**
- `addFilter()` - Incluye moduloId y moduloNombre por defecto (módulo padre)
- `updateFilter()` - Resetea campo/valor al cambiar de módulo
- `applyFilters()` - Detecta filtros de hijos y usa endpoint backend
- `loadAndApplyViewConfig()` - Agrega moduloId a filtros iniciales

**UI Actualizada:**
- Nuevo selector de módulo en cada filtro (col-span-3)
- Selector de campo actualizado (col-span-3)
- Selector de condición (col-span-2)
- Campo de valor (col-span-4 o col-span-3 para operador "entre")

#### 2. Backend: `src/app/api/modulos-v2/[id]/busqueda-avanzada/route.ts`

**Endpoint:** `POST /api/modulos-v2/[id]/busqueda-avanzada`

**Request Body:**
```typescript
{
  filters: AdvancedFilter[],
  searchTerm: string
}
```

**Proceso:**
1. Agrupa filtros por módulo
2. Identifica módulos hijos involucrados
3. Obtiene información y campos de cada módulo hijo
4. Construye query SQL dinámico con JOINs
5. Agrega condiciones WHERE para cada filtro
6. Ejecuta query y devuelve resultados

**Características:**
- ✅ Soporte para múltiples módulos hijos
- ✅ JOINs a través de `TR_MODULO_REGISTRO_RELACION`
- ✅ Todos los operadores soportados
- ✅ Búsqueda simple combinada con filtros
- ✅ Parámetros SQL para prevenir inyección
- ✅ Logs de query generado para debugging

## 🔄 Flujo de Ejecución

### Cuando el usuario agrega un filtro:

1. **Frontend:** Se crea un nuevo `AdvancedFilter` con:
   - `moduloId`: ID del módulo padre por defecto
   - `moduloNombre`: Nombre del módulo padre
   - `campo`: vacío (usuario lo selecciona)
   - `operador`: "igual" por defecto
   - `valor`: vacío

2. **Frontend:** Usuario selecciona módulo, campo, condición y valor

3. **Frontend:** Al cambiar búsqueda, se llama `applyFilters()`

4. **Frontend:** `applyFilters()` detecta si hay filtros de módulos hijos:
   ```typescript
   const tieneFiltrosHijos = filters.some(f => f.moduloId !== modulo?.Id);
   ```

5. **Frontend → Backend:** Si hay filtros de hijos, hace POST a `/busqueda-avanzada`

6. **Backend:** 
   - Agrupa filtros por módulo
   - Obtiene información de módulos
   - Construye SQL con JOINs
   - Ejecuta query
   - Devuelve registros filtrados

7. **Frontend:** Actualiza `registrosFiltrados` con resultados

## 🔐 Permisos

- Solo se muestran módulos hijos a los que el usuario tiene permiso de **ver**
- Los permisos se verifican usando `TR_ROL_MODULO_PERMISO` con contexto padre-hijo (`ModuloPadreId`)
- La carga de módulos hijos usa el endpoint `/api/modulos-v2?id=[moduloId]` que ya filtra por permisos

## 🗄️ Estructura de Base de Datos

### Tablas Involucradas:

**TD_MODULOS** - Definición de módulos
- Id, Nombre, NombreTabla, MostrarEnMenu, etc.

**TR_MODULO_RELACION** - Relaciones entre módulos
- ModuloPadreId, ModuloHijoId, TipoRelacion ('Hijo' o 'Asociar')

**TR_MODULO_REGISTRO_RELACION** - Relaciones entre registros
- ModuloPadreId, RegistroPadreId, ModuloHijoId, RegistroHijoId

**TR_ROL_MODULO_PERMISO** - Permisos por rol
- RolId, ModuloId, ModuloPadreId, PermisoVer, PermisoAgregar, etc.

## 📊 Ejemplo de Query Generado

Para los 3 filtros del ejemplo de Pacientes:

```sql
SELECT DISTINCT mt.*
FROM [TD_MODULO_Pacientes] mt
INNER JOIN TR_MODULO_REGISTRO_RELACION r1061 
  ON r1061.ModuloPadreId = @moduloId0
  AND r1061.RegistroPadreId = mt.Id
  AND r1061.ModuloHijo1234 = @moduloHijo1234
INNER JOIN [TD_MODULO_RegistroDePaciente] mh1234 
  ON mh1234.Id = r1061.RegistroHijoId
WHERE 1=1
  AND mt.[edad] BETWEEN @param0From AND @param0To
  AND mh1234.[año] = @param1
  AND mh1234.[mes] = @param2
ORDER BY mt.Id DESC
```

## ✅ Características Implementadas

- ✅ Selector de módulo en cada filtro (padre + hijos con permisos)
- ✅ Carga dinámica de campos según módulo seleccionado
- ✅ Soporte para todos los tipos de datos (Texto, Número, Fecha, Lista)
- ✅ Todos los operadores (=, >, <, >=, <=, contiene, no contiene, entre)
- ✅ Búsqueda simple combinable con filtros avanzados
- ✅ Construcción dinámica de SQL con JOINs múltiples
- ✅ Filtrado eficiente en backend para queries complejas
- ✅ Fallback a filtrado en cliente para filtros simples
- ✅ Respeto de permisos por rol y contexto padre-hijo
- ✅ Valores de listas cargadas para módulos padre e hijos
- ✅ Reseteo automático de campo/valor al cambiar módulo
- ✅ Interfaz responsive y clara

## 🧪 Pruebas

### Casos de prueba recomendados:

1. **Filtro simple en módulo padre**
   - Verificar que funciona sin llamar al backend

2. **Filtro en un módulo hijo**
   - Verificar JOIN y resultados correctos

3. **Filtros múltiples en el mismo hijo**
   - Verificar operador AND entre filtros

4. **Filtros en múltiples hijos**
   - Verificar múltiples JOINs

5. **Filtro con operador "entre"**
   - Verificar rango de valores

6. **Filtro con listas**
   - Verificar que se cargan y filtran correctamente

7. **Búsqueda simple + filtros avanzados**
   - Verificar combinación correcta

8. **Cambiar módulo en filtro existente**
   - Verificar reseteo de campo y valor

9. **Permisos**
   - Verificar que solo aparecen módulos con permisos

10. **Sin filtros de hijos**
    - Verificar que usa filtrado en cliente (más rápido)

## 🚀 Rendimiento

**Optimizaciones:**
- Filtrado en cliente cuando solo hay filtros del módulo padre (evita llamada al servidor)
- Query SQL con índices en `TR_MODULO_REGISTRO_RELACION` (IX_ModuloPadre_RegistroPadre, IX_ModuloHijo_RegistroHijo)
- Uso de parámetros SQL para reutilización de query plan
- Carga de campos de módulos hijos en paralelo
- Carga única de valores de listas (se cachean en el estado)

## 📝 Notas Importantes

1. Los filtros iniciales de la configuración de vista solo soportan campos del módulo padre (por ahora)
2. El campo debe existir en el módulo seleccionado para que el filtro sea aplicado
3. Los valores de listas se cargan automáticamente al cargar módulos hijos
4. La consulta SQL usa DISTINCT para evitar duplicados en caso de múltiples registros hijos
5. Los logs del query generado se pueden ver en la consola del servidor para debugging

## 🔧 Mantenimiento Futuro

### Posibles mejoras:

1. **Filtros iniciales con módulos hijos**
   - Permitir configurar filtros de módulos hijos en la vista del módulo

2. **Operadores adicionales**
   - "Empieza con", "Termina con", "Está vacío", "No está vacío"

3. **Guardar filtros frecuentes**
   - Permitir al usuario guardar combinaciones de filtros

4. **Exportar resultados filtrados**
   - Excel, PDF con los registros filtrados

5. **Visualización de query SQL**
   - Mostrar al usuario el SQL generado (modo debug)

6. **Filtros por agregación**
   - COUNT, SUM, AVG sobre módulos hijos

## 🐛 Solución de Problemas

### No aparecen módulos hijos:
- Verificar permisos del usuario en `TR_ROL_MODULO_PERMISO` con el `ModuloPadreId` correcto
- Verificar que existe relación en `TR_MODULO_RELACION`

### Los filtros no funcionan:
- Revisar consola del servidor para ver el query SQL generado
- Verificar que los nombres de columnas coinciden (usar `NombreColumna` en `TD_CAMPOS`)

### Resultados incorrectos:
- Verificar relaciones en `TR_MODULO_REGISTRO_RELACION`
- Probar el query SQL directamente en SQL Server

### Performance lenta:
- Verificar índices en `TR_MODULO_REGISTRO_RELACION`
- Considerar agregar índices en columnas frecuentemente filtradas

## 📚 Referencias

- [SISTEMA_PERMISOS_V2_IMPLEMENTADO.md](SISTEMA_PERMISOS_V2_IMPLEMENTADO.md) - Sistema de permisos por contexto padre-hijo
- [TR_MODULO_REGISTRO_RELACION](database/migrations/fix_modulo_registro_relaciones.sql) - Tabla de relaciones N:N
- [TR_MODULO_RELACION](database/migrations/create_modulos_v2.sql) - Definición de relaciones entre módulos

---

Implementado por: GitHub Copilot
Fecha: 16 de Abril, 2026
