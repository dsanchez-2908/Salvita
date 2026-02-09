# Ajuste de Roles al Nuevo Sistema V2

## ✅ Cambios Implementados

### 1. Nuevo Endpoint API: `/api/modulos-v2/estructura`
- **Archivo**: `src/app/api/modulos-v2/estructura/route.ts`
- **Función**: Obtiene módulos activos con su estructura jerárquica basada en TR_MODULO_RELACION
- **Retorna**:
  ```json
  [{
    "Id": 1009,
    "Nombre": "Alumnos v3",
    "Tipo": "Principal",
    "TieneHijos": true,
    "ModulosHijos": [
      { "Id": 1010, "Nombre": "Notas v3", "Tipo": "Secundario", "ModuloPadreId": 1009 },
      { "Id": 1011, "Nombre": "Faltas v3", "Tipo": "Secundario", "ModuloPadreId": 1009 }
    ]
  }]
  ```

### 2. Pantalla de Roles Actualizada
- **Archivo**: `src/app/dashboard/roles/page.tsx`
- **Cambios**:
  1. Usa `/api/modulos-v2/estructura` en lugar de `/api/modulos`
  2. Aplana la estructura jerárquica para trabajar con array simple
  3. **"Ver Agrupado"**:
     - ✅ **CON checkbox**: Módulos principales que tienen hijos (ej: Alumnos v3)
     - ❌ **N/A (gris)**: Módulos principales sin hijos y todos los secundarios

### 3. Estructura Visual
```
📘 Principal: Alumnos v3
   [✓] Ver  [✓] Ver Agrupado  [✓] Agregar  [✓] Modificar  [✓] Eliminar
   
   └─ Secundario: Notas v3
      [✓] Ver  [N/A]  [✓] Agregar  [✓] Modificar  [✓] Eliminar
   
   └─ Secundario: Faltas v3
      [✓] Ver  [N/A]  [✓] Agregar  [✓] Modificar  [✓] Eliminar

📘 Principal: Residentes (sin hijos)
   [✓] Ver  [N/A]  [✓] Agregar  [✓] Modificar  [✓] Eliminar
```

## 🧪 Prueba la Pantalla

1. Ve a: http://localhost:3000/dashboard/roles
2. Click en **"Nuevo Rol"**
3. Verifica la sección **"Permisos por Módulo"**:
   - ✅ Módulos principales con badge azul "Principal"
   - ✅ Módulos hijos indentados con badge gris "Secundario"
   - ✅ "Ver Agrupado" solo para principales con hijos (4 módulos):
     * Alumnos v3 (Notas v3, Faltas v3)
     * Profesores v3 (Faltas)
     * Alumnos v4 (Notas v4, Faltas v4)
     * Profesores v4 (Faltas v4)
   - ✅ "N/A" para el resto

## 📋 Próximos Pasos: Seguridad

Ahora debemos implementar la verificación de permisos en cada API:

### APIs que necesitan seguridad:
1. **GET** `/api/modulos-v2/[id]/datos` - Verificar PermisoVer
2. **POST** `/api/modulos-v2/[id]/datos` - Verificar PermisoAgregar
3. **PUT** `/api/modulos-v2/[id]/datos/[registroId]` - Verificar PermisoModificar
4. **DELETE** `/api/modulos-v2/[id]/datos/[registroId]` - Verificar PermisoEliminar
5. **GET** `/api/modulos-v2/[id]/[registroId]/agrupado` - Verificar PermisoVerAgrupado

### Función helper existente:
`verificarPermiso(userId, moduloId, permiso)` en `src/lib/auth.ts`

Permiso puede ser: `'ver' | 'verAgrupado' | 'agregar' | 'modificar' | 'eliminar'`
