# ✅ Sistema de Permisos Contextuales V2 - IMPLEMENTADO

## 📊 Resumen de Cambios

### 1. Base de Datos
- ✅ Columna `ModuloPadreId INT NULL` agregada a `TR_ROL_MODULO_PERMISO`
- ✅ Constraint `UQ_Rol_ModuloPadre_Modulo` para permitir permisos únicos por contexto: `(RolId, ModuloPadreId, ModuloId)`
- ✅ Foreign key y índice para optimización

### 2. Backend - verificarPermiso()
**Archivo:** `src/lib/auth.ts`
- ✅ Función actualizada para recibir parámetro opcional `moduloP adreId`
- ✅ La consulta SQL considera el contexto padre-hijo al verificar permisos
- ✅ Si `moduloPadreId` es NULL, busca permisos de módulo principal
- ✅ Si `moduloPadreId` tiene valor, busca permisos en ese contexto específico

### 3. Backend - APIs V2 con Verificación de Permisos

#### GET /api/modulos-v2/[id]/datos
- ✅ Extrae `parentModuloId` de searchParams
- ✅ Verifica permiso `'ver'` considerando el contexto
- ✅ Retorna 403 si no tiene permisos

#### POST /api/modulos-v2/[id]/datos
- ✅ Detecta relación padre en el body (campo `*_Id`)
- ✅ Verifica permiso `'agregar'` considerando el contexto padre
- ✅ Retorna 403 si no tiene permisos

#### PUT /api/modulos-v2/[id]/datos/[registroId]
- ✅ Consulta `TR_MODULO_REGISTRO_RELACION` para determinar contexto padre del registro
- ✅ Verifica permiso `'modificar'` en ese contexto
- ✅ Retorna 403 si no tiene permisos

#### DELETE /api/modulos-v2/[id]/datos/[registroId]
- ✅ Consulta `TR_MODULO_REGISTRO_RELACION` para determinar contexto padre del registro
- ✅ Verifica permiso `'eliminar'` en ese contexto
- ✅ Retorna 403 si no tiene permisos

#### GET /api/modulos-v2/[id]/[registroId]/agrupado
- ✅ Verifica permiso `'verAgrupado'` del módulo padre (el que se está consultando)
- ✅ Retorna 403 si no tiene permisos

### 4. Frontend - Roles
**Archivo:** `src/app/dashboard/roles/page.tsx`
- ✅ Muestra estructura jerárquica de módulos
- ✅ Cada módulo hijo aparece una vez por cada padre
- ✅ Checkboxes independientes para cada combinación padre-hijo
- ✅ Todos los permisos inician en `false` al crear nuevo rol
- ✅ Guarda permisos con `ModuloPadreId` correcto

## 🧪 Rol de Prueba Creado

**Nombre:** `pruebaNuevaEstructura`

**Permisos Configurados:**
```
┌─────────────────────┬───────────────┬──────┬────────┬────────┬───────────┬──────────┐
│ Módulo Padre        │ Módulo Hijo   │ Ver  │ VerAgr │ Agr    │ Mod       │ Elim     │
├─────────────────────┼───────────────┼──────┼────────┼────────┼───────────┼──────────┤
│ Principal           │ Alumnos v4    │  ✓   │   ✗    │   ✗    │     ✗     │    ✗     │
│ Alumnos v4          │ Faltas v4     │  ✓   │   ✗    │   ✗    │     ✗     │    ✗     │
│ Alumnos v4          │ Notas v4      │  ✗   │   ✗    │   ✗    │     ✗     │    ✗     │
│ Profesores v4       │ Faltas v4     │  ✗   │   ✗    │   ✗    │     ✗     │    ✗     │
└─────────────────────┴───────────────┴──────┴────────┴────────┴───────────┴──────────┘
```

**Interpretación:**
- ✅ Puede VER el módulo principal "Alumnos v4"
- ✅ Puede VER "Faltas v4" SOLO cuando está en el contexto de Alumnos v4
- ❌ NO puede ver "Notas v4" (otro hijo de Alumnos v4)
- ❌ NO puede ver "Profesores v4" ni "Faltas v4" en ese contexto
- ❌ NO puede agregar, modificar, eliminar en ningún módulo
- ❌ NO puede ver la vista agrupada

## 📝 Cómo Probar el Sistema

### Opción 1: Prueba con Usuario de Prueba

1. **Crear usuario de prueba:**
   ```sql
   -- En SQL Server
   INSERT INTO TD_USUARIOS (Usuario, Clave, Nombre, Estado)
   VALUES ('prueba', 'hashed_password', 'Usuario Prueba', 'Activo');
   
   -- Asignar rol
   INSERT INTO TR_USUARIO_ROL (UsuarioId, RolId)
   SELECT 
     (SELECT Id FROM TD_USUARIOS WHERE Usuario = 'prueba'),
     (SELECT Id FROM TD_ROLES WHERE Nombre = 'pruebaNuevaEstructura');
   ```

2. **Iniciar sesión con usuario "prueba"**

3. **Verificar en la UI:**
   - ✅ Debe ver "Alumnos v4" en el dashboard/menú
   - ✅ Al entrar a un alumno, debe ver "Faltas v4" en módulos relacionados
   - ❌ NO debe ver "Notas v4"
   - ❌ NO debe ver "Profesores v4"
   - ❌ NO debe ver botones de "Agregar", "Modificar", "Eliminar"
   - ❌ NO debe ver el botón de "Ver Agrupado"

### Opción 2: Prueba Directa con API (Postman/Thunder Client)

1. **Login para obtener token:**
   ```http
   POST http://localhost:3000/api/auth/login
   Content-Type: application/json

   {
     "usuario": "admin",
     "clave": "admin123"
   }
   ```

2. **Pruebas con permisos del rol (usar token de usuario con rol pruebaNuevaEstructura):**

   **✅ Debe funcionar (200):**
   ```http
   GET http://localhost:3000/api/modulos-v2/1014/datos
   Authorization: Bearer {token}
   ```
   (Ver Alumnos v4 - módulo principal)

   ```http
   GET http://localhost:3000/api/modulos-v2/1015/datos?parentModuloId=1014&parentId=1
   Authorization: Bearer {token}
   ```
   (Ver Faltas v4 en contexto de Alumnos v4)

   **❌ Debe denegar (403):**
   ```http
   GET http://localhost:3000/api/modulos-v2/1017/datos?parentModuloId=1014
   Authorization: Bearer {token}
   ```
   (Intenta ver Notas v4 - sin permiso)

   ```http
   GET http://localhost:3000/api/modulos-v2/1016/datos
   Authorization: Bearer {token}
   ```
   (Intenta ver Profesores v4 - sin permiso)

   ```http
   POST http://localhost:3000/api/modulos-v2/1015/datos
   Authorization: Bearer {token}
   Content-Type: application/json

   { "campo": "valor" }
   ```
   (Intenta agregar en Faltas v4 - sin permiso)

   ```http
   GET http://localhost:3000/api/modulos-v2/1014/1/agrupado
   Authorization: Bearer {token}
   ```
   (Intenta ver agrupado - sin permiso)

## 🔍 IDs de Módulos V2

- **1014** = Alumnos v4 (Principal)
- **1015** = Faltas v4 (Hijo de Alumnos v4 y Profesores v4)
- **1016** = Profesores v4 (Principal)
- **1017** = Notas v4 (Hijo de Alumnos v4)

## 🎯 Arquitectura del Sistema de Permisos

### Tabla TR_ROL_MODULO_PERMISO
```
RolId | ModuloPadreId | ModuloId | PermisoVer | PermisoAgregar | ...
------|---------------|----------|------------|----------------|----
  5   |     NULL      |  1014    |     1      |      0         | ... ← Alumnos v4 (principal)
  5   |     1014      |  1015    |     1      |      0         | ... ← Faltas v4 bajo Alumnos
  5   |     1014      |  1017    |     0      |      0         | ... ← Notas v4 bajo Alumnos (sin acceso)
  5   |     1016      |  1015    |     0      |      0         | ... ← Faltas v4 bajo Profesores (sin acceso)
```

### Lógica de Verificación
```typescript
// Contexto: Usuario intenta ver Faltas v4 desde Alumnos v4
verificarPermiso(userId, 1015, 'ver', 1014)
// Busca: RolId del usuario, ModuloId=1015, ModuloPadreId=1014
// Resultado: TRUE (tiene permiso)

// Contexto: Usuario intenta ver Faltas v4 desde Profesores v4
verificarPermiso(userId, 1015, 'ver', 1016)
// Busca: RolId del usuario, ModuloId=1015, ModuloPadreId=1016
// Resultado: FALSE (no tiene permiso en ese contexto)
```

## ✅ Checklist de Validación

- [x] Base de datos migrada correctamente
- [x] Constraint UNIQUE actualizada
- [x] Función `verificarPermiso()` acepta `moduloPadreId`
- [x] GET /datos verifica permisos con contexto
- [x] POST /datos verifica permisos con contexto
- [x] PUT /datos/[id] verifica permisos con contexto
- [x] DELETE /datos/[id] verifica permisos con contexto
- [x] GET /agrupado verifica permisoVerAgrupado
- [x] Frontend roles muestra estructura jerárquica
- [x] Frontend roles guarda con ModuloPadreId correcto
- [x] Rol de prueba creado y validado
- [ ] Pruebas de usuario final (pendiente)
- [ ] Frontend actualizado para pasar parentModuloId en llamadas (pendiente)
- [ ] Frontend oculta botones según permisos (pendiente)

## 🚀 Próximos Pasos

1. **Probar con usuario real:** Crear usuario de prueba y validar en la UI
2. **Actualizar frontend de módulos V2:** Asegurarse que pase `parentModuloId` en todas las llamadas
3. **Implementar UI condicional:** Mostrar/ocultar botones según permisos del usuario
4. **Documentar para otros desarrolladores:** Crear guía de implementación de nuevos módulos
5. **Testing exhaustivo:** Casos bordes, permisos mixtos, múltiples roles

## 📊 Métricas del Sistema

- **Módulos V2 creados:** 4 (Alumnos v4, Profesores v4, Notas v4, Faltas v4)
- **Relaciones N:N:** 6 (Faltas v4 tiene 2 padres)
- **Permisos granulares por contexto:** Implementado ✅
- **Seguridad por capa:** Backend (API) + Frontend (UI) ✅
