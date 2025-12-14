# Guía de Instalación y Configuración - Salvita

## Estado del Proyecto

El proyecto ha sido creado con la estructura completa y las funcionalidades base implementadas.

### ✅ Completado

1. **Estructura del proyecto Next.js** con TypeScript
2. **Configuración de base de datos** SQL Server
3. **Sistema de autenticación** con JWT y bcrypt
4. **APIs REST completas** para:
   - Login y autenticación
   - Usuarios (CRUD)
   - Roles (CRUD con permisos)
   - Listas (CRUD con valores)
   - Módulos (Creación dinámica de entidades)
   - Parámetros del sistema
5. **Cliente del gestor documental** Aditus
6. **Pantallas de administración**:
   - Login
   - Dashboard principal
   - Gestión de Usuarios
   - Gestión de Roles
   - Gestión de Listas
7. **Componentes UI** de Shadcn (Button, Input, Card, Table, Toast, etc.)

### 🚧 Pendiente de Implementación Completa

1. Pantalla completa de administración de módulos (UI para crear módulos)
2. Pantallas dinámicas para entidades creadas
3. Sistema de permisos aplicado en UI
4. Exportación a Excel
5. Visor de documentos integrado

## Prerequisitos

Antes de comenzar, asegúrate de tener instalado:

### 1. Node.js (v18 o superior)

**Verificar si está instalado:**
```powershell
node --version
npm --version
```

**Si no está instalado:**
1. Descargar desde: https://nodejs.org/en/download
2. Instalar la versión **LTS** (Long Term Support)
3. Asegurarse de marcar "Add to PATH" durante la instalación
4. Reiniciar PowerShell después de instalar

**Alternativa con Winget:**
```powershell
winget install OpenJS.NodeJS.LTS
```

### 2. SQL Server Express

Si no lo tienes instalado:
1. Descargar desde: https://www.microsoft.com/es-es/sql-server/sql-server-downloads
2. Instalar SQL Server Express con las opciones por defecto
3. Instalar SQL Server Management Studio (SSMS) para gestionar la base de datos

## Pasos de Instalación

### 1. Instalar Dependencias del Proyecto

```powershell
cd c:\Repo\Salvita
npm install
```

**Nota**: Este paso puede tardar 5-10 minutos en completarse.

### 2. Configurar SQL Server

**Opción A: SQL Server Management Studio**

1. Abrir SQL Server Management Studio
2. Conectarse a `localhost\SQLEXPRESS` (o tu instancia)
3. Abrir el archivo `c:\Repo\Salvita\database\schema.sql`
4. Ejecutar el script completo (F5)
5. Verificar que la base de datos `Salvita` fue creada

**Opción B: Línea de comandos**

```bash
sqlcmd -S localhost\SQLEXPRESS -U sa -P 123 -i "c:\Repo\Salvita\database\schema.sql"
```

### 3. Verificar Variables de Entorno

Asegúrate de que el archivo `.env.local` tenga las configuraciones correctas:

```env
DB_SERVER=localhost\SQLEXPRESS
DB_NAME=Salvita
DB_USER=sa
DB_PASSWORD=123
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=true

JWT_SECRET=salvita_secret_key_change_in_production_2024
```

### 4. Inicializar Usuario Admin

Ejecutar el script que crea el usuario admin con la contraseña hasheada:

```bash
node scripts/init-db.js
```

Este script:
- Conecta a la base de datos
- Genera el hash bcrypt de la contraseña "123"
- Actualiza el usuario admin con la contraseña correcta
- Muestra las credenciales de acceso

**Salida esperada:**
```
Conectando a la base de datos...
Conexión exitosa!
Generando hash para la contraseña...
Hash generado: $2a$10$...
Actualizando contraseña del usuario admin...
✓ Usuario admin actualizado correctamente

Credenciales de acceso:
  Usuario: admin
  Contraseña: 123

Inicialización completada!
```

### 5. Iniciar la Aplicación

```bash
npm run dev
```

La aplicación estará disponible en: **http://localhost:3000**

### 6. Primer Acceso

1. Navega a http://localhost:3000
2. Serás redirigido automáticamente a `/login`
3. Ingresa las credenciales:
   - **Usuario**: `admin`
   - **Contraseña**: `123`
4. Accederás al dashboard principal

## Estructura de Menús

Una vez logueado como administrador, tendrás acceso a:

### Dashboard
- Vista principal con estadísticas del sistema

### Configuración (Solo Administradores)
- **Roles**: Gestión completa de roles con permisos por módulo
- **Usuarios**: Gestión de usuarios del sistema
- **Listas**: Creación de listas maestras
- **Módulos**: Administración de módulos dinámicos

## Uso del Sistema

### Crear un Rol

1. Ir a **Configuración > Roles**
2. Clic en "Nuevo Rol"
3. Completar:
   - Nombre del rol
   - Descripción (opcional)
   - Permisos por módulo (Ver, Agregar, Modificar, Eliminar)
4. Guardar

### Crear un Usuario

1. Ir a **Configuración > Usuarios**
2. Clic en "Nuevo Usuario"
3. Completar:
   - Nombre
   - Usuario
   - Contraseña
   - Seleccionar uno o más roles
4. Guardar

### Crear una Lista

1. Ir a **Configuración > Listas**
2. Clic en "Nueva Lista"
3. Completar:
   - Nombre de la lista (ej: "Sexo")
   - Descripción (opcional)
   - Agregar valores (ej: "Masculino", "Femenino")
4. Guardar

### Crear un Módulo (API)

Por el momento, los módulos se crean mediante la API. Ejemplo con Postman o curl:

```bash
POST http://localhost:3000/api/modulos
Authorization: Bearer {tu_token}
Content-Type: application/json

{
  "Nombre": "Residentes",
  "Tipo": "Principal",
  "Icono": "Users",
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
      "Nombre": "Fecha Ingreso",
      "TipoDato": "Fecha",
      "Orden": 2,
      "VisibleEnGrilla": true,
      "Obligatorio": true
    },
    {
      "Nombre": "Sexo",
      "TipoDato": "Lista",
      "ListaId": 1,
      "Orden": 3,
      "VisibleEnGrilla": true,
      "Obligatorio": true
    }
  ]
}
```

Este módulo:
- Creará automáticamente la tabla `TD_MODULO_RESIDENTES`
- Registrará los campos en `TD_CAMPOS`
- Aparecerá en el menú lateral

## Configuración del Gestor Documental

Los parámetros del gestor documental ya están configurados en la tabla `TD_PARAMETROS`:

```sql
SELECT * FROM TD_PARAMETROS
```

Si necesitas modificar algún parámetro:

```sql
UPDATE TD_PARAMETROS 
SET Valor = 'nuevo_valor'
WHERE Parametro = 'nombre_parametro'
```

## Próximos Desarrollos

### Prioridad Alta

1. **Interfaz de Administración de Módulos**
   - Formulario visual para crear módulos
   - Gestión de campos con drag & drop
   - Previsualización de estructura

2. **Pantallas Dinámicas de Entidades**
   - Generación automática de CRUD
   - Grillas con filtros dinámicos
   - Formularios según campos configurados

3. **Sistema de Permisos en UI**
   - Ocultar opciones según rol
   - Validación de permisos en cada acción
   - Mensajes de "sin permiso"

### Prioridad Media

4. **Exportación a Excel**
   - Botón en cada grilla
   - Exportar con filtros aplicados

5. **Visor de Documentos**
   - Modal para ver documentos
   - Integración completa con API Aditus

6. **Mejoras de UX**
   - Paginación en tablas
   - Búsqueda avanzada
   - Ordenamiento por columnas

### Prioridad Baja

7. **Migración a Keycloak**
8. **Reportes personalizados**
9. **Auditoría completa**
10. **Notificaciones en tiempo real**

## Solución de Problemas Comunes

### Error: Cannot connect to SQL Server

**Solución:**
1. Verificar que SQL Server esté corriendo
2. Verificar el nombre de la instancia (puede ser `.\SQLEXPRESS` o `localhost\SQLEXPRESS`)
3. Verificar credenciales en `.env.local`
4. Habilitar TCP/IP en SQL Server Configuration Manager

### Error: Login failed - Credenciales inválidas

**Solución:**
1. Ejecutar nuevamente `node scripts/init-db.js`
2. Verificar en la base de datos:
   ```sql
   SELECT Usuario, Clave FROM TD_USUARIOS WHERE Usuario = 'admin'
   ```
3. Si persiste, borrar el usuario y volver a ejecutar el script de inicialización

### Error: npm - La ejecución de scripts está deshabilitada

**Error completo:**
```
No se puede cargar el archivo C:\Program Files\nodejs\npm.ps1 porque la ejecución de scripts está deshabilitada en este sistema.
```

**Solución:**
1. Abrir PowerShell y ejecutar:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

2. Si no reconoce `npm` después, recargar el PATH:
```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```

3. Verificar:
```powershell
npm --version
```

### Error: ECONNREFUSED 127.0.0.1:1433

**Solución:**
SQL Server no está escuchando en el puerto por defecto. Verificar el puerto:
```sql
SELECT DISTINCT local_net_address, local_tcp_port 
FROM sys.dm_exec_connections 
WHERE local_net_address IS NOT NULL
```

Actualizar `.env.local` con el puerto correcto:
```env
DB_SERVER=localhost\SQLEXPRESS,{puerto}
```

### La página no carga después del login

**Solución:**
1. Abrir la consola del navegador (F12)
2. Verificar errores de JavaScript
3. Verificar que el token se guardó:
   ```javascript
   console.log(localStorage.getItem('token'))
   ```
4. Limpiar localStorage y volver a iniciar sesión:
   ```javascript
   localStorage.clear()
   ```

## Estructura de Archivos Importante

```
src/
├── app/
│   ├── api/                    # Endpoints de la API
│   │   ├── auth/
│   │   │   ├── login/route.ts  # POST /api/auth/login
│   │   │   └── me/route.ts     # GET /api/auth/me
│   │   ├── usuarios/route.ts   # CRUD usuarios
│   │   ├── roles/route.ts      # CRUD roles
│   │   ├── listas/route.ts     # CRUD listas
│   │   ├── modulos/route.ts    # CRUD módulos
│   │   └── parametros/route.ts # GET parámetros
│   ├── dashboard/              # Páginas del sistema
│   │   ├── layout.tsx          # Layout con sidebar
│   │   ├── page.tsx            # Dashboard principal
│   │   ├── usuarios/page.tsx   # Gestión de usuarios
│   │   ├── roles/page.tsx      # Gestión de roles
│   │   ├── listas/page.tsx     # Gestión de listas
│   │   └── modulos/page.tsx    # Gestión de módulos
│   └── login/page.tsx          # Página de login
├── components/ui/              # Componentes de Shadcn
├── lib/
│   ├── db.ts                   # Conexión a SQL Server
│   ├── auth.ts                 # JWT y bcrypt
│   ├── document-manager.ts     # Cliente Aditus
│   └── utils.ts                # Utilidades
└── types/index.ts              # Tipos TypeScript
```

## Contacto y Soporte

Para consultas sobre el desarrollo, contactar al equipo de desarrollo.

---

**Fecha de última actualización:** Diciembre 2025  
**Versión:** 0.1.0 (Beta)
