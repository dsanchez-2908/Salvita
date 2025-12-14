# Arquitectura del Sistema Salvita

## Visión General

Salvita es una aplicación web full-stack construida con Next.js 14 que implementa el patrón de arquitectura **Monolito Modular**, donde el frontend y backend residen en la misma aplicación pero están claramente separados en capas lógicas.

## Diagrama de Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────────┐
│                       NAVEGADOR WEB                          │
│                     (Cliente React)                          │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS/HTTP
                       │ JWT Token
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                     NEXT.JS 14 SERVER                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              CAPA DE PRESENTACIÓN                    │   │
│  │  - Pages (App Router)                                │   │
│  │  - Components (React + Shadcn UI)                    │   │
│  │  - Layouts                                           │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              CAPA DE API (Backend)                   │   │
│  │  - Route Handlers (/api/*)                           │   │
│  │  - Middleware de Autenticación                       │   │
│  │  - Validación de Datos                               │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            CAPA DE LÓGICA DE NEGOCIO                 │   │
│  │  - Servicios (/lib)                                  │   │
│  │  - Utilidades                                        │   │
│  │  - Helpers                                           │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
         ▼                           ▼
┌──────────────────┐      ┌──────────────────────┐
│   SQL SERVER     │      │   API ADITUS         │
│   (Base Datos)   │      │   (Documentos)       │
└──────────────────┘      └──────────────────────┘
```

## Capas de la Aplicación

### 1. Capa de Presentación (Frontend)

**Ubicación**: `src/app/`, `src/components/`

**Responsabilidades**:
- Renderizar UI
- Manejar interacción del usuario
- Llamar a APIs
- Gestionar estado local

**Tecnologías**:
- React 18 (Server Components y Client Components)
- TypeScript
- Tailwind CSS
- Shadcn UI (Radix UI)

**Estructura**:
```
src/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx          # Página de login
│   ├── dashboard/
│   │   ├── layout.tsx              # Layout con sidebar
│   │   ├── page.tsx                # Dashboard principal
│   │   ├── usuarios/page.tsx       # CRUD Usuarios
│   │   ├── roles/page.tsx          # CRUD Roles
│   │   ├── listas/page.tsx         # CRUD Listas
│   │   └── modulos/page.tsx        # Admin Módulos
│   ├── layout.tsx                  # Layout raíz
│   └── globals.css                 # Estilos globales
└── components/
    └── ui/                         # Componentes reutilizables
        ├── button.tsx
        ├── input.tsx
        ├── card.tsx
        ├── table.tsx
        └── ...
```

### 2. Capa de API (Backend)

**Ubicación**: `src/app/api/`

**Responsabilidades**:
- Exponer endpoints REST
- Validar autenticación (JWT)
- Validar datos de entrada
- Orquestar lógica de negocio
- Retornar respuestas JSON

**Tecnologías**:
- Next.js Route Handlers (App Router)
- TypeScript
- JWT (jsonwebtoken)

**Estructura**:
```
src/app/api/
├── auth/
│   ├── login/route.ts              # POST /api/auth/login
│   └── me/route.ts                 # GET /api/auth/me
├── usuarios/route.ts               # CRUD /api/usuarios
├── roles/route.ts                  # CRUD /api/roles
├── listas/route.ts                 # CRUD /api/listas
├── modulos/route.ts                # CRUD /api/modulos
└── parametros/route.ts             # GET /api/parametros
```

**Patrón de Endpoint**:
```typescript
// GET - Listar/Obtener
// POST - Crear
// PUT - Actualizar
// DELETE - Eliminar

export async function GET(request: NextRequest) {
  // 1. Validar autenticación
  // 2. Extraer parámetros
  // 3. Llamar a servicios
  // 4. Retornar respuesta
}
```

### 3. Capa de Lógica de Negocio

**Ubicación**: `src/lib/`

**Responsabilidades**:
- Lógica de negocio reutilizable
- Acceso a base de datos
- Integración con servicios externos
- Utilidades comunes

**Módulos**:

#### `db.ts` - Gestión de Base de Datos
```typescript
// Pool de conexiones a SQL Server
// Query parametrizadas
// Prevención de SQL Injection
export async function query<T>(sql: string, params?: any): Promise<T[]>
export async function execute(sql: string, params?: any): Promise<any>
```

#### `auth.ts` - Autenticación
```typescript
// Hash de contraseñas con bcrypt
// Generación y verificación de JWT
// Extracción de usuario desde token
export function hashPassword(password: string): Promise<string>
export function generateToken(payload: JWTPayload): string
export function getUserFromRequest(req: NextRequest): JWTPayload | null
```

#### `document-manager.ts` - Gestor Documental
```typescript
// Cliente API Aditus
// Generación de tokens
// Subida de archivos
// Generación de URLs de visor
export class DocumentManagerClient {
  async uploadDocument(file, fileName, type, module): Promise<string>
  async getViewerUrl(documentId): Promise<string>
}
```

#### `utils.ts` - Utilidades
```typescript
// Helpers generales
// Formateo de fechas
// Sanitización de nombres
export function formatDate(date): string
export function sanitizeTableName(name): string
```

### 4. Capa de Datos

**Base de Datos**: Microsoft SQL Server

**Patrón**: Database First con Tablas Dinámicas

**Estructura**:

#### Tablas Estáticas (Sistema)
```
TD_PARAMETROS         - Configuración del sistema
TD_USUARIOS          - Usuarios
TD_ROLES             - Roles de acceso
TR_USUARIO_ROL       - N:M Usuarios-Roles
TD_MODULOS           - Definición de módulos
TD_CAMPOS            - Campos configurables de módulos
TD_LISTAS            - Listas maestras
TD_VALORES_LISTA     - Valores de listas
TR_ROL_MODULO_PERMISO - Permisos por rol y módulo
TD_DOCUMENTOS        - Referencias a documentos
```

#### Tablas Dinámicas (Generadas)
```
TD_MODULO_[NOMBRE]    - Una tabla por cada módulo creado
                      - Estructura según campos configurados
                      - FK automática si es secundario
                      - Campos de auditoría estándar
```

## Flujos de Datos Principales

### Flujo de Autenticación

```
1. Usuario ingresa credenciales
   └─> POST /api/auth/login

2. API valida usuario en BD
   └─> SELECT FROM TD_USUARIOS WHERE Usuario = ?

3. Verifica contraseña con bcrypt
   └─> bcrypt.compare(inputPassword, hashedPassword)

4. Obtiene roles del usuario
   └─> SELECT FROM TR_USUARIO_ROL JOIN TD_ROLES

5. Genera JWT con payload
   └─> jwt.sign({ userId, usuario, roles }, SECRET)

6. Retorna token al cliente
   └─> { success: true, token, usuario }

7. Cliente guarda token en localStorage
   └─> localStorage.setItem('token', token)

8. Todas las requests incluyen token
   └─> Authorization: Bearer {token}
```

### Flujo de Creación de Módulo

```
1. Admin envía definición de módulo
   └─> POST /api/modulos

2. API valida permisos (rol admin)
   └─> getUserFromRequest() → verifica rol

3. Valida datos del módulo
   └─> Nombre, Tipo, Campos requeridos

4. Genera nombre de tabla
   └─> TD_MODULO_[NOMBRE_SANITIZADO]

5. Inserta en TD_MODULOS
   └─> INSERT INTO TD_MODULOS (...)

6. Crea tabla física en BD
   └─> CREATE TABLE [nombre] (...)

7. Inserta campos en TD_CAMPOS
   └─> INSERT INTO TD_CAMPOS (...)

8. Si es secundario, crea FK
   └─> ALTER TABLE ADD CONSTRAINT FK_...

9. Retorna ID del módulo creado
   └─> { success: true, data: { Id: 1 } }

10. Cliente recarga lista de módulos
    └─> Aparece en sidebar automáticamente
```

### Flujo de Subida de Documento

```
1. Usuario selecciona archivo en campo tipo Archivo
   └─> <input type="file" />

2. Frontend convierte a Base64
   └─> FileReader.readAsDataURL()

3. Envía a API con metadata
   └─> POST /api/modulos/[id]/registros
   └─> { campo: base64, fileName, contentType }

4. API solicita token a Aditus
   └─> documentManager.getToken()
   └─> POST [URL_TOKEN] { username, password }

5. Sube documento a Aditus
   └─> documentManager.uploadDocument()
   └─> POST [URL_DOCUMENTO] { json, content, fileName }

6. Aditus retorna ID documento
   └─> { id: "fa85f64-5717-4562-b3fc-2c963f66afa6" }

7. Guarda ID en campo de la tabla
   └─> UPDATE TD_MODULO_[NOMBRE] SET [campo] = ?

8. Registra en TD_DOCUMENTOS
   └─> INSERT INTO TD_DOCUMENTOS (...)

9. Para visualizar, genera URL
   └─> documentManager.getViewerUrl(docId)
   └─> URL con token y parámetros codificados
```

## Seguridad

### Autenticación

**Método**: JWT (JSON Web Tokens)

**Flujo**:
1. Login genera token válido por 8 horas
2. Token contiene: userId, usuario, roles
3. Token se firma con JWT_SECRET
4. Cliente guarda token en localStorage
5. Cada request incluye token en header Authorization

**Implementación**:
```typescript
// Generar token
const token = jwt.sign(
  { userId, usuario, roles },
  JWT_SECRET,
  { expiresIn: '8h' }
);

// Validar token
const user = jwt.verify(token, JWT_SECRET);

// Middleware
const user = getUserFromRequest(request);
if (!user) return Response(401);
```

### Autorización

**Modelo**: RBAC (Role-Based Access Control)

**Niveles**:
1. **Administrador**: Acceso completo
2. **Roles personalizados**: Permisos por módulo

**Permisos Granulares**:
- Ver (PermisoVer)
- Agregar (PermisoAgregar)
- Modificar (PermisoModificar)
- Eliminar (PermisoEliminar)

**Almacenamiento**:
```sql
TR_ROL_MODULO_PERMISO
- RolId
- ModuloId
- PermisoVer (BIT)
- PermisoAgregar (BIT)
- PermisoModificar (BIT)
- PermisoEliminar (BIT)
```

### Protección de Datos

**Contraseñas**:
- Hasheadas con bcrypt (10 rounds)
- Nunca se almacenan en texto plano
- Nunca se retornan en APIs

**SQL Injection**:
- Queries parametrizadas (mssql)
- Validación de entrada
- Sanitización de nombres de tabla/columna

**XSS**:
- React escapa por defecto
- Validación de entrada
- Content Security Policy (recomendado)

## Patrones de Diseño

### 1. Repository Pattern (Implícito)

Acceso a datos centralizado en `lib/db.ts`:
```typescript
// En lugar de:
connection.query("SELECT * FROM Users WHERE id = " + id)

// Usar:
query("SELECT * FROM TD_USUARIOS WHERE Id = @id", { id })
```

### 2. Service Layer

Lógica de negocio en servicios (`lib/*`):
- `auth.ts`: Servicios de autenticación
- `document-manager.ts`: Servicios de documentos
- Separación de concerns

### 3. API First

- Backend expone APIs REST
- Frontend consume APIs
- Desacoplamiento frontend-backend
- Facilita testing

### 4. Convention over Configuration

- Nomenclatura estándar de tablas (TD_, TR_)
- Estructura predecible de módulos
- Campos de auditoría automáticos
- Reduce configuración manual

## Escalabilidad

### Horizontal (Agregar más servidores)

**Preparado**:
- ✅ API stateless (JWT)
- ✅ Sin sesiones en servidor
- ✅ Pool de conexiones DB

**Requiere**:
- ❌ Load balancer
- ❌ Shared storage para uploads
- ❌ Cache distribuido (Redis)

### Vertical (Más recursos al servidor)

**Escalabilidad actual**:
- Pool de conexiones configurable
- Next.js optimizado para performance
- SQL Server puede escalar recursos

## Performance

### Frontend
- Server Components (reducen JavaScript)
- Lazy loading de componentes
- Optimización de imágenes (next/image)
- CSS optimizado (Tailwind purge)

### Backend
- Pool de conexiones persistente
- Queries parametrizadas (prepared statements)
- Índices en columnas frecuentes

### Base de Datos
- Índices en FK y columnas de búsqueda
- Normalización de datos
- Vistas para consultas complejas (futuro)

## Monitoreo y Logging

### Actual (Básico)
```typescript
console.log('Conectando a BD...');
console.error('Error:', error);
```

### Recomendado (Futuro)
- Winston o Pino para logging estructurado
- Application Insights (Azure)
- Sentry para errores
- Logs a archivos rotados

## Deployment

### Desarrollo
```bash
npm run dev
# Next.js dev server (hot reload)
# Puerto 3000
```

### Producción
```bash
npm run build  # Genera build optimizado
npm start      # Inicia servidor producción
```

### Opciones de Hosting

1. **Vercel** (Recomendado para Next.js)
   - Deploy automático desde Git
   - Edge functions
   - CDN global

2. **Azure App Service**
   - Integración con Azure SQL
   - Escalamiento automático

3. **Servidor propio (IIS / PM2)**
   - Control total
   - Configuración manual

## Tecnologías y Versiones

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Next.js | 14.2.0 | Framework principal |
| React | 18.2.0 | UI Library |
| TypeScript | 5.3.3 | Type safety |
| Tailwind CSS | 3.4.1 | Estilos |
| Radix UI | 1.x | Componentes accesibles |
| mssql | 10.0.2 | Cliente SQL Server |
| bcryptjs | 2.4.3 | Hash contraseñas |
| jsonwebtoken | 9.0.2 | JWT tokens |
| axios | 1.6.7 | HTTP client |

## Próximas Mejoras Arquitectónicas

1. **Separar API en microservicios**
   - Servicio de autenticación
   - Servicio de módulos
   - Servicio de documentos

2. **Implementar Cache**
   - Redis para datos frecuentes
   - Cache de parámetros
   - Cache de permisos

3. **Message Queue**
   - RabbitMQ o Azure Service Bus
   - Para operaciones asíncronas
   - Subida de documentos en background

4. **Event Sourcing**
   - Historial completo de cambios
   - Auditoría detallada
   - Posibilidad de replay

---

**Mantenido por**: Equipo de desarrollo Salvita  
**Última actualización**: Diciembre 2025
