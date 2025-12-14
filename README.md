# 🏥 Salvita - Sistema de Gestión para Geriátricos

Sistema web completo y altamente parametrizable para la gestión integral de residencias geriátricas, desarrollado con Next.js 14, TypeScript y SQL Server.

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![SQL Server](https://img.shields.io/badge/SQL%20Server-Express%202025-red)](https://www.microsoft.com/sql-server)
[![License](https://img.shields.io/badge/License-Private-yellow.svg)](LICENSE)

## 🌟 Características Principales

- 🔧 **Sistema de módulos dinámicos**: Crea entidades personalizadas sin programar
- 👥 **Gestión completa de usuarios y roles** con permisos granulares
- 🔐 **Autenticación segura** con JWT y bcrypt
- 🎨 **Interfaz moderna y responsive** con Tailwind CSS y Shadcn UI
- ⚡ **CRUD automático** para todas las entidades creadas
- 🔗 **Relaciones padre-hijo** entre módulos (ej: Residentes → Familiares)
- 🔍 **Búsqueda y paginación** en todas las grillas
- 🗑️ **Soft delete** (eliminación lógica con posibilidad de restauración)
- 📄 **Integración con gestor documental** Aditus
- 📋 **Listas parametrizables** para campos desplegables personalizados

## 📋 Requisitos Previos

- **Node.js** 18 o superior
- **SQL Server Express** 2025 o superior
- **Git** (instalación automática disponible via winget)
- **Windows** 10/11 (probado en este entorno)

## 🚀 Instalación Rápida

```bash
# Clonar el repositorio
git clone https://github.com/dsanchez-2908/Salvita.git
cd Salvita

# Instalar dependencias
npm install

# Configurar base de datos
# 1. Ejecutar database/schema.sql en SQL Server
# 2. Actualizar .env.local con tus credenciales
# 3. Inicializar usuario admin
node scripts/init-db.js

# Iniciar aplicación en modo desarrollo
npm run dev
```

Accede a `http://localhost:3000` con:
- 👤 **Usuario**: `admin`
- 🔑 **Contraseña**: `123`

> 💡 **Nota**: Para una guía de instalación completa y detallada, consulta [INSTALACION.md](INSTALACION.md)

## 📁 Estructura del Proyecto

```
Salvita/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── api/                  # API Routes
│   │   │   ├── auth/            # Autenticación
│   │   │   ├── usuarios/        # Gestión de usuarios
│   │   │   ├── roles/           # Gestión de roles
│   │   │   ├── listas/          # Listas parametrizables
│   │   │   └── modulos/         # Módulos dinámicos
│   │   ├── dashboard/           # Páginas principales
│   │   │   ├── modulos/         # CRUD dinámico
│   │   │   │   └── [id]/        # Vista de registros
│   │   │   │       └── [registroId]/  # Detalle con secundarios
│   │   │   ├── usuarios/
│   │   │   ├── roles/
│   │   │   └── listas/
│   │   └── login/               # Página de login
│   ├── components/ui/           # Componentes Shadcn UI
│   ├── lib/                     # Utilidades y configuración
│   │   ├── db.ts               # Conexión SQL Server
│   │   ├── auth.ts             # JWT y bcrypt
│   │   └── document-manager.ts # Cliente Aditus
│   └── types/                   # Tipos TypeScript
├── database/                    # Scripts SQL
│   └── schema.sql              # Schema completo
├── scripts/                    # Scripts de utilidad
│   └── init-db.js             # Inicialización
└── [documentación]/           # Archivos .md

```

## 🛠️ Stack Tecnológico

### Frontend
- **Framework**: Next.js 14.2 (App Router)
- **Language**: TypeScript 5.3
- **UI Library**: React 18
- **Styling**: Tailwind CSS 3
- **Components**: Shadcn UI
- **Icons**: Lucide React

### Backend
- **API**: Next.js API Routes
- **Database**: SQL Server Express 2025
- **Driver**: mssql (Tedious)
- **Authentication**: JWT + bcrypt
- **Validation**: Zod (en desarrollo)

### Development
- **Package Manager**: npm
- **Linting**: ESLint
- **Code Style**: Prettier (configurado)

## ✨ Funcionalidades

### ✅ Implementado

#### Módulo de Seguridad
- ✓ Login con JWT
- ✓ Gestión de usuarios (CRUD completo)
- ✓ Gestión de roles con permisos granulares
- ✓ Hash de contraseñas con bcrypt
- ✓ Protección de rutas

#### Módulo de Configuración
- ✓ Listas parametrizables con valores
- ✓ Creación dinámica de módulos (Principal/Secundario)
- ✓ 7 tipos de datos: Texto, Número, Fecha, FechaHora, Lista, Descripción, Archivo
- ✓ Configuración de campos obligatorios y visibilidad
- ✓ Iconos personalizables para módulos

#### Módulo de Datos
- ✓ CRUD automático para módulos dinámicos
- ✓ Formularios generados según configuración
- ✓ Validación de campos obligatorios
- ✓ Búsqueda en tiempo real
- ✓ Paginación (10 registros por página)
- ✓ Relaciones padre-hijo (ej: Residentes → Familiares)
- ✓ Vista de detalle con módulos secundarios inline

#### UX/UI
- ✓ Interfaz responsive
- ✓ Mensajes de confirmación amigables
- ✓ Toasts de notificación
- ✓ Botón "Volver" en páginas de detalle
- ✓ Indicadores de carga

### 🚧 En Desarrollo

- ⏳ Dashboard con estadísticas
- ⏳ Exportación a Excel
- ⏳ Sistema de permisos aplicado en UI
- ⏳ Gestión documental integrada
- ⏳ Ordenamiento por columnas
- ⏳ Filtros avanzados
- ⏳ Reportes personalizados
- ⏳ Auditoría completa

## 📚 Documentación

| Documento | Descripción |
|-----------|-------------|
| [INSTALACION.md](INSTALACION.md) | Guía completa de instalación paso a paso |
| [ARQUITECTURA.md](ARQUITECTURA.md) | Arquitectura del sistema y decisiones de diseño |
| [COMANDOS_UTILES.md](COMANDOS_UTILES.md) | Comandos frecuentes para desarrollo |
| [PROXIMOS_PASOS.md](PROXIMOS_PASOS.md) | Roadmap y funcionalidades planificadas |
| [RESUMEN_EJECUTIVO.md](RESUMEN_EJECUTIVO.md) | Resumen para stakeholders |

## 🎯 Casos de Uso

### Ejemplo: Gestión de Residentes

1. **Crear módulo "Residentes"** (Principal)
   - Campos: Nombre Completo, Fecha Ingreso, Sexo, Fecha Nacimiento
   
2. **Crear módulo "Familiares"** (Secundario de Residentes)
   - Campos: Nombre, Parentesco, Teléfono, Email

3. **Cargar residentes** usando el CRUD automático

4. **Ver detalle de residente** y agregar familiares inline

5. **Buscar y filtrar** residentes según necesidad

Todo sin escribir una línea de código! 🎉

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea tu rama de feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add: nueva funcionalidad increíble'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

### Convención de Commits

- `Add:` Nueva funcionalidad
- `Fix:` Corrección de bugs
- `Update:` Actualización de código existente
- `Docs:` Cambios en documentación
- `Style:` Cambios de formato (no afectan lógica)
- `Refactor:` Refactorización de código
- `Test:` Agregar o modificar tests

## 🐛 Reportar Issues

¿Encontraste un bug? [Abre un issue](https://github.com/dsanchez-2908/Salvita/issues) con:
- Descripción clara del problema
- Pasos para reproducirlo
- Comportamiento esperado vs. actual
- Screenshots si aplica
- Versión del sistema operativo y navegador

## 📝 Licencia

Este proyecto es privado y confidencial.

## 👨‍💻 Autor

**Diego Sánchez** ([@dsanchez-2908](https://github.com/dsanchez-2908))

---

<div align="center">

**¿Preguntas? ¿Sugerencias?**  
[Abrir un Issue](https://github.com/dsanchez-2908/Salvita/issues) · [Ver Documentación](INSTALACION.md)

---

⭐ Si este proyecto te resulta útil, considera darle una estrella

**Última actualización**: Diciembre 14, 2025 | **Versión**: 0.1.0 (Beta)

</div>
