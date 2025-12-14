# Salvita - Sistema de Gestión para Geriátrico

Sistema parametrizable de gestión para geriátrico con módulos dinámicos, autenticación basada en roles y integración con gestor documental.

## Características Principales

- **Autenticación y Roles**: Sistema completo de usuarios y roles con permisos granulares
- **Módulos Parametrizables**: Creación dinámica de entidades con campos configurables
- **Gestión Documental**: Integración con API de Aditus para almacenamiento de documentos
- **Entidades Relacionadas**: Soporte para entidades principales, secundarias e independientes
- **UI Moderna**: Interfaz construida con Next.js 14 y Shadcn UI

## Tecnologías Utilizadas

- **Frontend & Backend**: Next.js 14 (React 18)
- **Base de Datos**: Microsoft SQL Server
- **UI Components**: Shadcn UI (Radix UI + Tailwind CSS)
- **Autenticación**: JWT + bcryptjs
- **Gestión Documental**: API Aditus (integración propia)

## Requisitos Previos

- Node.js 18+ 
- SQL Server (Express o superior)
- npm o yarn

## Instalación

### 1. Clonar el repositorio

```bash
cd c:\Repo\Salvita
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar Base de Datos

Ejecutar el script de creación de la base de datos en SQL Server:

```bash
# Abrir SQL Server Management Studio y ejecutar:
# c:\Repo\Salvita\database\schema.sql
```

### 4. Configurar variables de entorno

El archivo `.env.local` ya está creado con la configuración por defecto:

```env
DB_SERVER=localhost\SQLEXPRESS
DB_NAME=Salvita
DB_USER=sa
DB_PASSWORD=123
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=true

JWT_SECRET=salvita_secret_key_change_in_production_2024
```

**IMPORTANTE**: Ajusta estos valores según tu configuración de SQL Server.

### 5. Inicializar Base de Datos

Ejecutar el script de inicialización para crear el usuario admin con la contraseña hasheada:

```bash
node scripts/init-db.js
```

Este script:
- Verifica la conexión a la base de datos
- Crea el usuario admin con contraseña hasheada
- Muestra las credenciales de acceso

### 6. Iniciar la aplicación

```bash
npm run dev
```

La aplicación estará disponible en: http://localhost:3000

## Credenciales Iniciales

- **Usuario**: admin
- **Contraseña**: 123

## Estructura del Proyecto

```
c:\Repo\Salvita\
├── database/                  # Scripts SQL
│   ├── schema.sql            # Esquema completo de la BD
│   └── update-admin-password.sql
├── scripts/                   # Scripts de utilidad
│   └── init-db.js            # Inicialización de BD
├── src/
│   ├── app/                  # Rutas de Next.js
│   │   ├── api/              # API Routes
│   │   │   ├── auth/         # Autenticación
│   │   │   ├── usuarios/     # Gestión de usuarios
│   │   │   ├── roles/        # Gestión de roles
│   │   │   ├── listas/       # Gestión de listas
│   │   │   ├── modulos/      # Gestión de módulos
│   │   │   └── parametros/   # Parámetros del sistema
│   │   ├── dashboard/        # Panel principal
│   │   ├── login/            # Página de login
│   │   ├── globals.css       # Estilos globales
│   │   └── layout.tsx        # Layout principal
│   ├── components/           # Componentes React
│   │   └── ui/               # Componentes de UI (Shadcn)
│   ├── lib/                  # Librerías y utilidades
│   │   ├── db.ts             # Conexión a base de datos
│   │   ├── auth.ts           # Autenticación JWT
│   │   ├── document-manager.ts # Cliente gestor documental
│   │   └── utils.ts          # Utilidades
│   └── types/                # Tipos TypeScript
│       └── index.ts          # Definiciones de tipos
├── .env.local                # Variables de entorno
├── package.json              # Dependencias
├── tailwind.config.ts        # Configuración Tailwind
└── tsconfig.json             # Configuración TypeScript
```

## Módulos del Sistema

### Seguridad y Autenticación

#### Módulo de Roles
- CRUD completo de roles
- Asignación de permisos por módulo (Agregar, Modificar, Eliminar, Ver)
- Rol "Administrador" con acceso completo

#### Módulo de Usuarios
- CRUD de usuarios con encriptación de contraseñas
- Asignación de múltiples roles por usuario
- Estados: Activo/Baja

### Configuración

#### Módulo de Listas
- Creación de listas maestras para campos tipo "Lista"
- Gestión de valores de cada lista
- Usado en campos parametrizables

#### Módulo de Administración de Módulos
- Creación dinámica de módulos/entidades
- Tipos de módulos:
  - **Principal**: Entidad principal con secundarias asociadas
  - **Secundario**: Entidad relacionada a una principal
  - **Independiente**: Entidad autónoma
- Configuración de campos:
  - Tipos: Texto, Descripción, Número, Fecha, FechaHora, Lista, Archivo
  - Propiedades: Orden, Visible, Visible en grilla, Obligatorio

### Entidades Dinámicas

Las entidades creadas en el módulo de administración generan automáticamente:
- Tabla en la base de datos
- Pantalla de gestión con grilla
- Formularios de alta/modificación
- Filtros de búsqueda
- Exportación a Excel
- Integración con gestor documental para campos tipo "Archivo"

## Gestor Documental

### Configuración

Los parámetros del gestor documental se configuran en la tabla `TD_PARAMETROS`:

- **URL Token**: Endpoint para autenticación
- **Usuario Token**: Usuario del servicio
- **Clave Token**: Contraseña del servicio
- **URL BASE Agregar Documento**: Endpoint para subir archivos
- **URL BASE Visor**: URL base del visor de documentos
- **Codigo libreria**: ID de la librería en Aditus
- **Codigo de clase**: ID de la clase de documento

### Uso

Los campos tipo "Archivo" en los módulos:
1. Permiten seleccionar un archivo
2. Lo convierten a Base64
3. Lo envían a la API de Aditus
4. Guardan el ID del documento en la base de datos
5. Permiten visualizar el documento a través del visor

## Desarrollo

### Agregar un nuevo componente UI

```bash
# Los componentes de Shadcn ya están configurados en src/components/ui/
# Para agregar más componentes, copiar de https://ui.shadcn.com/
```

### Crear una nueva API Route

```typescript
// src/app/api/mi-ruta/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
  }
  
  // Tu lógica aquí
  const result = await query('SELECT * FROM MiTabla');
  return NextResponse.json({ success: true, data: result });
}
```

## Base de Datos

### Nomenclatura de Tablas

- **TD_**: Tablas de datos
- **TR_**: Tablas de relación
- **TMP_**: Tablas temporales
- **SP_**: Stored Procedures
- **VW_**: Vistas

### Tablas Dinámicas de Módulos

Cuando se crea un módulo, se genera automáticamente una tabla con el formato:
```
TD_MODULO_[NOMBRE_MODULO]
```

Incluye campos de auditoría:
- FechaCreacion
- FechaModificacion
- UsuarioCreacion
- UsuarioModificacion

## Próximos Pasos

### Funcionalidades Pendientes

1. **Pantallas de Gestión Completas**:
   - Pantalla de gestión de usuarios (CRUD completo)
   - Pantalla de gestión de roles (CRUD completo)
   - Pantalla de gestión de listas (CRUD completo)
   - Pantalla de administración de módulos (CRUD completo)

2. **Entidades Dinámicas**:
   - Pantallas automáticas para entidades principales
   - Pantallas automáticas para entidades secundarias
   - Pantallas automáticas para entidades independientes
   - Sistema de filtros dinámicos
   - Exportación a Excel

3. **Permisos**:
   - Implementación completa del sistema de permisos por rol
   - Validación de permisos en cada operación
   - Ocultación de opciones según permisos

4. **Mejoras**:
   - Migración a Keycloak para autenticación
   - Paginación en grillas
   - Búsqueda avanzada
   - Auditoría completa de cambios
   - Reportes personalizados

## Soporte

Para reportar problemas o sugerencias, contacta al equipo de desarrollo.

## Licencia

Uso interno - Salvita Geriátrico

---

Desarrollado con ❤️ para Salvita
