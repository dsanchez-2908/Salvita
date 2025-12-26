-- =============================================
-- Script de creación de base de datos Salvita
-- =============================================

USE master;
GO

-- Crear la base de datos si no existe
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'Salvita')
BEGIN
    CREATE DATABASE Salvita;
END
GO

USE Salvita;
GO

-- =============================================
-- TABLA: TD_PARAMETROS
-- Descripción: Almacena parámetros de configuración del sistema
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TD_PARAMETROS]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[TD_PARAMETROS] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [Parametro] VARCHAR(250) NOT NULL UNIQUE,
        [Valor] VARCHAR(MAX) NOT NULL,
        [FechaCreacion] DATETIME DEFAULT GETDATE(),
        [FechaModificacion] DATETIME DEFAULT GETDATE()
    );

    -- Insertar valores iniciales
    INSERT INTO [dbo].[TD_PARAMETROS] ([Parametro], [Valor]) VALUES
    ('Nombre Proyecto', 'Salvita'),
    ('URL Token', 'http://172.16.16.60:8981/realms/aditus/protocol/openid-connect/token'),
    ('Usuario Token', 'dsanchez'),
    ('Clave Token', '12345'),
    ('URL BASE Agregar Documento', 'http://172.16.16.60:8093/documents/base64'),
    ('URL BASE Visor', 'http://172.16.16.60:6095/LPAViewer/virtualviewer'),
    ('Codigo libreria', '32a76e80-1d2d-47fe-9b9d-d423cf644d73'),
    ('Codigo de clase', '7a6f0e1e-51e1-4ea1-b34c-804a72cbc994');
END
GO

-- =============================================
-- TABLA: TD_ROLES
-- Descripción: Almacena los roles del sistema
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TD_ROLES]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[TD_ROLES] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [Nombre] VARCHAR(100) NOT NULL UNIQUE,
        [Descripcion] VARCHAR(500),
        [Estado] VARCHAR(20) DEFAULT 'Activo' CHECK ([Estado] IN ('Activo', 'Inactivo')),
        [AccesoTrazas] BIT NOT NULL DEFAULT 0,
        [FechaCreacion] DATETIME DEFAULT GETDATE(),
        [FechaModificacion] DATETIME DEFAULT GETDATE(),
        [UsuarioCreacion] VARCHAR(100),
        [UsuarioModificacion] VARCHAR(100)
    );

    -- Insertar rol Administrador por defecto
    INSERT INTO [dbo].[TD_ROLES] ([Nombre], [Descripcion], [AccesoTrazas], [UsuarioCreacion]) 
    VALUES ('Administrador', 'Acceso completo al sistema', 1, 'system');
END
GO

-- =============================================
-- TABLA: TD_USUARIOS
-- Descripción: Almacena los usuarios del sistema
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TD_USUARIOS]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[TD_USUARIOS] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [Nombre] VARCHAR(200) NOT NULL,
        [Usuario] VARCHAR(100) NOT NULL UNIQUE,
        [Clave] VARCHAR(255) NOT NULL,
        [Estado] VARCHAR(20) DEFAULT 'Activo' CHECK ([Estado] IN ('Activo', 'Baja')),
        [FechaAlta] DATETIME DEFAULT GETDATE(),
        [FechaModificacion] DATETIME DEFAULT GETDATE(),
        [UsuarioCreacion] VARCHAR(100),
        [UsuarioModificacion] VARCHAR(100)
    );

    -- Insertar usuario administrador por defecto
    -- Clave: 123 (será hasheada en la aplicación)
    INSERT INTO [dbo].[TD_USUARIOS] ([Nombre], [Usuario], [Clave], [UsuarioCreacion]) 
    VALUES ('Administrador', 'admin', '$2a$10$rQZc3qKqGqKqGqKqGqKqGOe', 'system');
END
GO

-- =============================================
-- TABLA: TR_USUARIO_ROL
-- Descripción: Relación muchos a muchos entre usuarios y roles
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TR_USUARIO_ROL]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[TR_USUARIO_ROL] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [UsuarioId] INT NOT NULL,
        [RolId] INT NOT NULL,
        [FechaAsignacion] DATETIME DEFAULT GETDATE(),
        [UsuarioAsignacion] VARCHAR(100),
        CONSTRAINT FK_TR_USUARIO_ROL_Usuario FOREIGN KEY ([UsuarioId]) REFERENCES [dbo].[TD_USUARIOS]([Id]) ON DELETE CASCADE,
        CONSTRAINT FK_TR_USUARIO_ROL_Rol FOREIGN KEY ([RolId]) REFERENCES [dbo].[TD_ROLES]([Id]) ON DELETE CASCADE,
        CONSTRAINT UQ_Usuario_Rol UNIQUE ([UsuarioId], [RolId])
    );

    -- Asignar rol Administrador al usuario admin
    INSERT INTO [dbo].[TR_USUARIO_ROL] ([UsuarioId], [RolId], [UsuarioAsignacion]) 
    VALUES (1, 1, 'system');
END
GO

-- =============================================
-- TABLA: TD_MODULOS
-- Descripción: Almacena los módulos/entidades del sistema
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TD_MODULOS]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[TD_MODULOS] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [Nombre] VARCHAR(100) NOT NULL UNIQUE,
        [NombreTabla] VARCHAR(150) NOT NULL UNIQUE,
        [Tipo] VARCHAR(20) NOT NULL CHECK ([Tipo] IN ('Principal', 'Secundario', 'Independiente')),
        [ModuloPrincipalId] INT NULL,
        [Estado] VARCHAR(20) DEFAULT 'Activo' CHECK ([Estado] IN ('Activo', 'Inactivo')),
        [Icono] VARCHAR(50),
        [Orden] INT DEFAULT 0,
        [FechaCreacion] DATETIME DEFAULT GETDATE(),
        [FechaModificacion] DATETIME DEFAULT GETDATE(),
        [UsuarioCreacion] VARCHAR(100),
        [UsuarioModificacion] VARCHAR(100),
        CONSTRAINT FK_TD_MODULOS_ModuloPrincipal FOREIGN KEY ([ModuloPrincipalId]) REFERENCES [dbo].[TD_MODULOS]([Id])
    );
END
GO

-- =============================================
-- TABLA: TD_CAMPOS
-- Descripción: Almacena los campos configurables de cada módulo
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TD_CAMPOS]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[TD_CAMPOS] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [ModuloId] INT NOT NULL,
        [Nombre] VARCHAR(100) NOT NULL,
        [NombreColumna] VARCHAR(100) NOT NULL,
        [TipoDato] VARCHAR(50) NOT NULL CHECK ([TipoDato] IN ('Texto', 'Descripcion', 'Numero', 'Fecha', 'FechaHora', 'Lista', 'Archivo')),
        [Largo] INT NULL,
        [ListaId] INT NULL,
        [Orden] INT DEFAULT 0,
        [Visible] BIT DEFAULT 1,
        [VisibleEnGrilla] BIT DEFAULT 1,
        [Obligatorio] BIT DEFAULT 0,
        [FechaCreacion] DATETIME DEFAULT GETDATE(),
        [UsuarioCreacion] VARCHAR(100),
        CONSTRAINT FK_TD_CAMPOS_Modulo FOREIGN KEY ([ModuloId]) REFERENCES [dbo].[TD_MODULOS]([Id]) ON DELETE CASCADE,
        CONSTRAINT UQ_Campo_Modulo UNIQUE ([ModuloId], [NombreColumna])
    );
END
GO

-- =============================================
-- TABLA: TD_LISTAS
-- Descripción: Almacena las listas maestras para campos tipo lista
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TD_LISTAS]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[TD_LISTAS] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [Nombre] VARCHAR(100) NOT NULL UNIQUE,
        [Descripcion] VARCHAR(500),
        [Estado] VARCHAR(20) DEFAULT 'Activo' CHECK ([Estado] IN ('Activo', 'Inactivo')),
        [FechaCreacion] DATETIME DEFAULT GETDATE(),
        [FechaModificacion] DATETIME DEFAULT GETDATE(),
        [UsuarioCreacion] VARCHAR(100),
        [UsuarioModificacion] VARCHAR(100)
    );
END
GO

-- =============================================
-- TABLA: TD_VALORES_LISTA
-- Descripción: Almacena los valores de cada lista
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TD_VALORES_LISTA]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[TD_VALORES_LISTA] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [ListaId] INT NOT NULL,
        [Valor] VARCHAR(200) NOT NULL,
        [Orden] INT DEFAULT 0,
        [Estado] VARCHAR(20) DEFAULT 'Activo' CHECK ([Estado] IN ('Activo', 'Inactivo')),
        [FechaCreacion] DATETIME DEFAULT GETDATE(),
        [UsuarioCreacion] VARCHAR(100),
        CONSTRAINT FK_TD_VALORES_LISTA_Lista FOREIGN KEY ([ListaId]) REFERENCES [dbo].[TD_LISTAS]([Id]) ON DELETE CASCADE
    );
END
GO

-- =============================================
-- TABLA: TR_ROL_MODULO_PERMISO
-- Descripción: Relación entre roles, módulos y permisos
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TR_ROL_MODULO_PERMISO]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[TR_ROL_MODULO_PERMISO] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [RolId] INT NOT NULL,
        [ModuloId] INT NOT NULL,
        [PermisoAgregar] BIT DEFAULT 0,
        [PermisoModificar] BIT DEFAULT 0,
        [PermisoEliminar] BIT DEFAULT 0,
        [PermisoVer] BIT DEFAULT 1,
        [FechaAsignacion] DATETIME DEFAULT GETDATE(),
        [UsuarioAsignacion] VARCHAR(100),
        CONSTRAINT FK_TR_ROL_MODULO_PERMISO_Rol FOREIGN KEY ([RolId]) REFERENCES [dbo].[TD_ROLES]([Id]) ON DELETE CASCADE,
        CONSTRAINT FK_TR_ROL_MODULO_PERMISO_Modulo FOREIGN KEY ([ModuloId]) REFERENCES [dbo].[TD_MODULOS]([Id]) ON DELETE CASCADE,
        CONSTRAINT UQ_Rol_Modulo UNIQUE ([RolId], [ModuloId])
    );
END
GO

-- =============================================
-- TABLA: TD_DOCUMENTOS
-- Descripción: Almacena referencias a documentos en el gestor documental
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TD_DOCUMENTOS]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[TD_DOCUMENTOS] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [DocumentoId] VARCHAR(100) NOT NULL UNIQUE,
        [NombreArchivo] VARCHAR(500) NOT NULL,
        [ContentType] VARCHAR(100),
        [ModuloId] INT NOT NULL,
        [RegistroId] INT NOT NULL,
        [CampoId] INT NOT NULL,
        [FechaCreacion] DATETIME DEFAULT GETDATE(),
        [UsuarioCreacion] VARCHAR(100),
        CONSTRAINT FK_TD_DOCUMENTOS_Modulo FOREIGN KEY ([ModuloId]) REFERENCES [dbo].[TD_MODULOS]([Id]),
        CONSTRAINT FK_TD_DOCUMENTOS_Campo FOREIGN KEY ([CampoId]) REFERENCES [dbo].[TD_CAMPOS]([Id])
    );
END
GO

-- =============================================
-- ÍNDICES ADICIONALES
-- =============================================
CREATE NONCLUSTERED INDEX IX_TD_USUARIOS_Usuario ON [dbo].[TD_USUARIOS]([Usuario]);
CREATE NONCLUSTERED INDEX IX_TD_USUARIOS_Estado ON [dbo].[TD_USUARIOS]([Estado]);
CREATE NONCLUSTERED INDEX IX_TD_MODULOS_Tipo ON [dbo].[TD_MODULOS]([Tipo]);
CREATE NONCLUSTERED INDEX IX_TD_MODULOS_Estado ON [dbo].[TD_MODULOS]([Estado]);
CREATE NONCLUSTERED INDEX IX_TD_CAMPOS_ModuloId ON [dbo].[TD_CAMPOS]([ModuloId]);
CREATE NONCLUSTERED INDEX IX_TD_DOCUMENTOS_ModuloRegistro ON [dbo].[TD_DOCUMENTOS]([ModuloId], [RegistroId]);
GO

PRINT 'Base de datos Salvita creada exitosamente';
