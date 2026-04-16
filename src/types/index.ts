// Tipos de datos para campos
export type TipoDato = 'Texto' | 'Descripcion' | 'Numero' | 'Decimal' | 'Fecha' | 'FechaHora' | 'Lista' | 'Archivo' | 'IDInterno';

// Tipos de módulos
export type TipoModulo = 'Principal' | 'Secundario' | 'Independiente';

// Estados
export type EstadoGeneral = 'Activo' | 'Inactivo';
export type EstadoUsuario = 'Activo' | 'Baja';

// Usuario
export interface Usuario {
  Id: number;
  Nombre: string;
  Usuario: string;
  Clave?: string;
  Estado: EstadoUsuario;
  FechaAlta: Date;
  FechaModificacion?: Date;
  UsuarioCreacion?: string;
  UsuarioModificacion?: string;
  Roles?: Rol[];
}

// Rol
export interface Rol {
  Id: number;
  Nombre: string;
  Descripcion?: string;
  Estado: EstadoGeneral;
  FechaCreacion: Date;
  FechaModificacion?: Date;
  UsuarioCreacion?: string;
  UsuarioModificacion?: string;
  Permisos?: RolModuloPermiso[];
}

// Módulo
export interface Modulo {
  Id: number;
  Nombre: string;
  NombreTabla: string;
  Tipo: TipoModulo;
  ModuloPrincipalId?: number;
  ModuloPrincipal?: Modulo;
  Estado: EstadoGeneral;
  Icono?: string;
  Orden: number;
  FechaCreacion: Date;
  FechaModificacion?: Date;
  UsuarioCreacion?: string;
  UsuarioModificacion?: string;
  Campos?: Campo[];
  ModulosSecundarios?: Modulo[];
}

// Módulo V2 (con soporte para relaciones N:N)
export interface ModuloV2 {
  Id: number;
  Nombre: string;
  NombreTabla: string;
  MostrarEnMenu: boolean;
  Estado: EstadoGeneral;
  Icono?: string;
  Orden: number;
  FechaCreacion: Date;
  FechaModificacion?: Date;
  UsuarioCreacion?: string;
  UsuarioModificacion?: string;
  Campos?: Campo[];
  ModulosRelacionados?: ModuloRelacion[]; // Relaciones tipo "Hijo" - para crear registros
  ModulosParaAsociar?: ModuloRelacion[];  // Relaciones tipo "Asociar" - para asociar registros existentes
}

// Tipo de relación entre módulos
export type TipoRelacionModulo = 'Hijo' | 'Asociar';

// Relación entre módulos
export interface ModuloRelacion {
  Id: number;
  ModuloPadreId: number;
  ModuloHijoId: number;
  ModuloHijo?: ModuloV2;
  TipoRelacion: TipoRelacionModulo; // 'Hijo' = crear registros, 'Asociar' = asociar existentes
  Orden: number;
  FechaCreacion: Date;
  UsuarioCreacion?: string;
}

// Campo
export interface Campo {
  Id: number;
  ModuloId: number;
  Nombre: string;
  NombreColumna: string;
  TipoDato: TipoDato;
  Largo?: number;
  ListaId?: number;
  Lista?: Lista;
  Orden: number;
  Visible: boolean;
  VisibleEnGrilla: boolean;
  Obligatorio: boolean;
  FechaCreacion: Date;
  UsuarioCreacion?: string;
}

// Lista
export interface Lista {
  Id: number;
  Nombre: string;
  Descripcion?: string;
  Estado: EstadoGeneral;
  FechaCreacion: Date;
  FechaModificacion?: Date;
  UsuarioCreacion?: string;
  UsuarioModificacion?: string;
  Valores?: ValorLista[];
}

// Valor de Lista
export interface ValorLista {
  Id: number;
  ListaId: number;
  Valor: string;
  Orden: number;
  Estado: EstadoGeneral;
  FechaCreacion: Date;
  UsuarioCreacion?: string;
}

// Relación Usuario-Rol
export interface UsuarioRol {
  Id: number;
  UsuarioId: number;
  RolId: number;
  FechaAsignacion: Date;
  UsuarioAsignacion?: string;
}

// Permiso Rol-Módulo
export interface RolModuloPermiso {
  Id: number;
  RolId: number;
  ModuloId: number;
  Modulo?: Modulo;
  PermisoAgregar: boolean;
  PermisoModificar: boolean;
  PermisoEliminar: boolean;
  PermisoVer: boolean;
  FechaAsignacion: Date;
  UsuarioAsignacion?: string;
}

// Documento
export interface Documento {
  Id: number;
  DocumentoId: string;
  NombreArchivo: string;
  ContentType?: string;
  ModuloId: number;
  RegistroId: number;
  CampoId: number;
  FechaCreacion: Date;
  UsuarioCreacion?: string;
}

// Parámetro
export interface Parametro {
  Id: number;
  Parametro: string;
  Valor: string;
  FechaCreacion: Date;
  FechaModificacion?: Date;
}

// Tipos para API
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface LoginRequest {
  usuario: string;
  clave: string;
}

export interface LoginResponse {
  token: string;
  usuario: {
    Id: number;
    Nombre: string;
    Usuario: string;
    Roles: string[];
    Permisos?: any[];
  };
}

export interface CreateModuloRequest {
  Nombre: string;
  Tipo: TipoModulo;
  ModuloPrincipalId?: number;
  Icono?: string;
  Orden?: number;
  Campos: CreateCampoRequest[];
}

// Request para crear módulos V2
export interface CreateModuloV2Request {
  Nombre: string;
  MostrarEnMenu: boolean;
  Icono?: string;
  Orden?: number;
  Campos: CreateCampoRequest[];
  ModulosRelacionados?: number[];  // IDs de módulos relacionados tipo "Hijo" (crear registros)
  ModulosParaAsociar?: number[];   // IDs de módulos para asociar registros existentes
}

export interface CreateCampoRequest {
  Nombre: string;
  TipoDato: TipoDato;
  Largo?: number;
  ListaId?: number;
  Orden?: number;
  Visible?: boolean;
  VisibleEnGrilla?: boolean;
  Obligatorio?: boolean;
}

export interface CreateListaRequest {
  Nombre: string;
  Descripcion?: string;
  Valores: CreateValorListaRequest[];
}

export interface CreateValorListaRequest {
  Valor: string;
  Orden?: number;
}

export interface CreateRolRequest {
  Nombre: string;
  Descripcion?: string;
  Permisos?: CreateRolPermisoRequest[];
  AccesoTrazas?: boolean;
  PermisosTareas?: {
    HabilitarTareas: boolean;
    PuedeCrearTareas: boolean;
    PuedeAdministracionTareas: boolean;
    AdministracionBandejas: boolean;
    PuedeConsultarTareas: boolean;
    PuedeVerMonitorTareas: boolean;
  };
  PermisosConfig?: {
    HabilitarMenuConfig: boolean;
    PermisosRoles: boolean;
    PermisosUsuarios: boolean;
    PermisosListas: boolean;
    PermisosModulos: boolean;
    PermisosParametros: boolean;
    PermisosDashboard: boolean;
    PermisosParametrosAV: boolean;
    PermisosReportes: boolean;
  };
  Reportes?: number[];
}

export interface CreateRolPermisoRequest {
  ModuloId: number;
  ModuloPadreId?: number;
  PermisoAgregar: boolean;
  PermisoModificar: boolean;
  PermisoEliminar: boolean;
  PermisoVer: boolean;
  PermisoVerAgrupado?: boolean;
  PermisoVerRelacionado?: boolean;
}

export interface CreateUsuarioRequest {
  Nombre: string;
  Usuario: string;
  Clave: string;
  Roles: number[];
}

export interface UpdateUsuarioRequest {
  Nombre?: string;
  Usuario?: string;
  Estado?: EstadoUsuario;
  Roles?: number[];
}

// Tipos para entidades dinámicas
export interface DynamicEntityRecord {
  [key: string]: any;
}

export interface DynamicEntityFilter {
  campo: string;
  valor: any;
  operador?: 'igual' | 'contiene' | 'mayor' | 'menor' | 'entre';
  valorHasta?: any; // Para operador 'entre' en fechas
}
