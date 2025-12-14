# Comandos Útiles - Salvita

## Instalación Inicial

```bash
# Instalar todas las dependencias
npm install

# Inicializar base de datos (crear usuario admin)
npm run db:init
```

## Desarrollo

```bash
# Iniciar servidor de desarrollo
npm run dev

# Iniciar en puerto diferente
npx next dev -p 3001

# Limpiar caché de Next.js
rm -rf .next

# Verificar errores de TypeScript
npx tsc --noEmit
```

## Base de Datos

### Scripts SQL

```bash
# Crear estructura completa (ejecutar en SSMS o sqlcmd)
database/schema.sql

# Actualizar contraseña admin (si es necesario)
database/update-admin-password.sql
```

### Consultas Útiles

```sql
-- Ver todos los usuarios
SELECT u.*, STRING_AGG(r.Nombre, ', ') as Roles
FROM TD_USUARIOS u
LEFT JOIN TR_USUARIO_ROL ur ON u.Id = ur.UsuarioId
LEFT JOIN TD_ROLES r ON ur.RolId = r.Id
GROUP BY u.Id, u.Nombre, u.Usuario, u.Estado, u.FechaAlta

-- Ver todos los módulos con cantidad de campos
SELECT m.*, COUNT(c.Id) as CantidadCampos
FROM TD_MODULOS m
LEFT JOIN TD_CAMPOS c ON m.Id = c.ModuloId
GROUP BY m.Id, m.Nombre, m.NombreTabla, m.Tipo, m.Estado

-- Ver permisos de un rol específico
SELECT r.Nombre as Rol, m.Nombre as Modulo,
       p.PermisoVer, p.PermisoAgregar, p.PermisoModificar, p.PermisoEliminar
FROM TD_ROLES r
INNER JOIN TR_ROL_MODULO_PERMISO p ON r.Id = p.RolId
INNER JOIN TD_MODULOS m ON p.ModuloId = m.Id
WHERE r.Id = 1

-- Ver todas las listas con sus valores
SELECT l.Nombre as Lista, v.Valor, v.Orden
FROM TD_LISTAS l
INNER JOIN TD_VALORES_LISTA v ON l.Id = v.ListaId
WHERE l.Estado = 'Activo' AND v.Estado = 'Activo'
ORDER BY l.Nombre, v.Orden

-- Limpiar todo (¡CUIDADO! Borra todos los datos)
TRUNCATE TABLE TR_ROL_MODULO_PERMISO
TRUNCATE TABLE TR_USUARIO_ROL
DELETE FROM TD_CAMPOS
DELETE FROM TD_MODULOS
DELETE FROM TD_VALORES_LISTA
DELETE FROM TD_LISTAS
DELETE FROM TD_USUARIOS WHERE Usuario != 'admin'
DELETE FROM TD_ROLES WHERE Nombre != 'Administrador'
```

## Testing

### Probar APIs con curl

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usuario":"admin","clave":"123"}'

# Guardar el token recibido
TOKEN="eyJhbGc..."

# Obtener usuarios
curl http://localhost:3000/api/usuarios \
  -H "Authorization: Bearer $TOKEN"

# Crear un usuario
curl -X POST http://localhost:3000/api/usuarios \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "Nombre": "Juan Pérez",
    "Usuario": "jperez",
    "Clave": "123456",
    "Roles": [1]
  }'

# Crear una lista
curl -X POST http://localhost:3000/api/listas \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "Nombre": "Sexo",
    "Descripcion": "Lista de sexos",
    "Valores": [
      {"Valor": "Masculino", "Orden": 1},
      {"Valor": "Femenino", "Orden": 2}
    ]
  }'

# Crear un módulo
curl -X POST http://localhost:3000/api/modulos \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "Nombre": "Residentes",
    "Tipo": "Principal",
    "Orden": 1,
    "Campos": [
      {
        "Nombre": "Nombre Completo",
        "TipoDato": "Texto",
        "Largo": 200,
        "Orden": 1,
        "VisibleEnGrilla": true,
        "Obligatorio": true
      },
      {
        "Nombre": "DNI",
        "TipoDato": "Texto",
        "Largo": 20,
        "Orden": 2,
        "VisibleEnGrilla": true,
        "Obligatorio": true
      },
      {
        "Nombre": "Fecha Nacimiento",
        "TipoDato": "Fecha",
        "Orden": 3,
        "VisibleEnGrilla": true,
        "Obligatorio": false
      }
    ]
  }'
```

## Producción

```bash
# Build para producción
npm run build

# Iniciar en modo producción
npm start

# Verificar build
npm run build && npm start
```

## Debugging

### Logs SQL Server

```sql
-- Verificar conexiones activas
SELECT 
    session_id,
    login_name,
    host_name,
    program_name,
    login_time
FROM sys.dm_exec_sessions
WHERE is_user_process = 1

-- Ver queries en ejecución
SELECT 
    r.session_id,
    r.status,
    r.command,
    r.cpu_time,
    r.total_elapsed_time,
    t.text
FROM sys.dm_exec_requests r
CROSS APPLY sys.dm_exec_sql_text(r.sql_handle) t
```

### Limpiar localStorage en navegador

```javascript
// Abrir consola del navegador (F12) y ejecutar:
localStorage.clear()
location.reload()

// Ver token actual
console.log(localStorage.getItem('token'))

// Ver usuario actual
console.log(JSON.parse(localStorage.getItem('user')))
```

## Mantenimiento

### Backup Base de Datos

```sql
-- Backup completo
BACKUP DATABASE Salvita
TO DISK = 'C:\Backups\Salvita_Backup.bak'
WITH FORMAT, NAME = 'Full Backup of Salvita'

-- Restore
RESTORE DATABASE Salvita
FROM DISK = 'C:\Backups\Salvita_Backup.bak'
WITH REPLACE
```

### Limpiar tablas temporales

```sql
-- Si se crean tablas de prueba
DROP TABLE IF EXISTS TD_MODULO_PRUEBA
DELETE FROM TD_MODULOS WHERE Nombre = 'Prueba'
```

## Desarrollo de Nuevas Features

### Agregar una nueva API

1. Crear archivo en `src/app/api/[nombre]/route.ts`
2. Implementar métodos GET, POST, PUT, DELETE
3. Usar `getUserFromRequest` para validar autenticación
4. Usar `query` o `execute` para DB operations

```typescript
// src/app/api/mi-api/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { query } from '@/lib/db';
import { ApiResponse } from '@/types';

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'No autenticado' },
      { status: 401 }
    );
  }

  const data = await query('SELECT * FROM MiTabla');
  return NextResponse.json<ApiResponse>({
    success: true,
    data: data,
  });
}
```

### Agregar una nueva página

1. Crear archivo en `src/app/dashboard/[nombre]/page.tsx`
2. Usar componentes de `@/components/ui`
3. Implementar lógica con `useState` y `useEffect`
4. Llamar a APIs con fetch

```typescript
// src/app/dashboard/mi-pagina/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function MiPagina() {
  const [data, setData] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const token = localStorage.getItem("token");
    const response = await fetch("/api/mi-api", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await response.json();
    if (result.success) setData(result.data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mi Página</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Tu contenido aquí */}
      </CardContent>
    </Card>
  );
}
```

## Git (Próximamente)

```bash
# Inicializar repositorio
git init
git add .
git commit -m "Initial commit"

# Conectar con GitHub
git remote add origin https://github.com/usuario/salvita.git
git push -u origin main

# Workflow diario
git pull
# ... hacer cambios ...
git add .
git commit -m "Descripción del cambio"
git push
```

## Variables de Entorno

### Desarrollo (.env.local)
```env
DB_SERVER=localhost\SQLEXPRESS
DB_NAME=Salvita
DB_USER=sa
DB_PASSWORD=123
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=true
JWT_SECRET=salvita_secret_key_change_in_production_2024
```

### Producción (.env.production)
```env
DB_SERVER=servidor-produccion
DB_NAME=Salvita_Prod
DB_USER=salvita_user
DB_PASSWORD=contraseña_segura_aqui
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=false
JWT_SECRET=generar_nuevo_secret_largo_y_aleatorio
```

## Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| No conecta a SQL Server | Verificar servicio SQL Server corriendo |
| Error de autenticación | Ejecutar `npm run db:init` |
| Página en blanco | Verificar consola del navegador (F12) |
| API devuelve 401 | Token expirado, hacer login nuevamente |
| Error al crear módulo | Verificar que el nombre no exista |
| No aparece módulo en menú | Verificar Tipo (Principal o Independiente) |

---

**Tip**: Guarda este archivo como referencia rápida durante el desarrollo!
