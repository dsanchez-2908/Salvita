-- =============================================
-- Migración: Agregar tabla de permisos del menú de configuración
-- Descripción: Permite gestionar qué roles tienen acceso a cada opción del menú de configuración
-- Fecha: 2026-03-05
-- =============================================

-- Crear tabla TR_ROL_CONFIG_PERMISO si no existe
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TR_ROL_CONFIG_PERMISO]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[TR_ROL_CONFIG_PERMISO] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [RolId] INT NOT NULL,
        [HabilitarMenuConfig] BIT NOT NULL DEFAULT 0,
        [PermisosRoles] BIT NOT NULL DEFAULT 0,
        [PermisosUsuarios] BIT NOT NULL DEFAULT 0,
        [PermisosListas] BIT NOT NULL DEFAULT 0,
        [PermisosModulos] BIT NOT NULL DEFAULT 0,
        [PermisosParametros] BIT NOT NULL DEFAULT 0,
        [PermisosDashboard] BIT NOT NULL DEFAULT 0,
        [PermisosParametrosAV] BIT NOT NULL DEFAULT 0,
        [FechaCreacion] DATETIME DEFAULT GETDATE(),
        [FechaModificacion] DATETIME DEFAULT GETDATE(),
        [UsuarioCreacion] VARCHAR(100),
        [UsuarioModificacion] VARCHAR(100),
        CONSTRAINT FK_TR_ROL_CONFIG_PERMISO_Rol FOREIGN KEY ([RolId]) REFERENCES [dbo].[TD_ROLES]([Id]) ON DELETE CASCADE,
        CONSTRAINT UQ_TR_ROL_CONFIG_PERMISO_RolId UNIQUE ([RolId])
    );
    
    PRINT 'Tabla TR_ROL_CONFIG_PERMISO creada exitosamente';
END
ELSE
BEGIN
    PRINT 'La tabla TR_ROL_CONFIG_PERMISO ya existe';
END
GO

-- Asignar todos los permisos al rol Administrador
DECLARE @AdminRolId INT;
SELECT @AdminRolId = Id FROM TD_ROLES WHERE Nombre = 'Administrador';

IF @AdminRolId IS NOT NULL
BEGIN
    -- Verificar si el Administrador ya tiene permisos de configuración
    IF NOT EXISTS (SELECT 1 FROM TR_ROL_CONFIG_PERMISO WHERE RolId = @AdminRolId)
    BEGIN
        INSERT INTO TR_ROL_CONFIG_PERMISO (
            RolId, 
            HabilitarMenuConfig, 
            PermisosRoles, 
            PermisosUsuarios, 
            PermisosListas, 
            PermisosModulos, 
            PermisosParametros, 
            PermisosDashboard, 
            PermisosParametrosAV,
            UsuarioCreacion
        )
        VALUES (
            @AdminRolId,
            1, -- HabilitarMenuConfig
            1, -- PermisosRoles
            1, -- PermisosUsuarios
            1, -- PermisosListas
            1, -- PermisosModulos
            1, -- PermisosParametros
            1, -- PermisosDashboard
            1, -- PermisosParametrosAV
            'system'
        );
        
        PRINT 'Permisos de configuración asignados al rol Administrador';
    END
    ELSE
    BEGIN
        PRINT 'El rol Administrador ya tiene permisos de configuración';
    END
END
ELSE
BEGIN
    PRINT 'ADVERTENCIA: Rol Administrador no encontrado';
END
GO

-- Crear permisos deshabilitados para todos los demás roles existentes
INSERT INTO TR_ROL_CONFIG_PERMISO (
    RolId,
    HabilitarMenuConfig,
    PermisosRoles,
    PermisosUsuarios,
    PermisosListas,
    PermisosModulos,
    PermisosParametros,
    PermisosDashboard,
    PermisosParametrosAV,
    UsuarioCreacion
)
SELECT 
    r.Id,
    0, -- HabilitarMenuConfig deshabilitado
    0, -- PermisosRoles deshabilitado
    0, -- PermisosUsuarios deshabilitado
    0, -- PermisosListas deshabilitado
    0, -- PermisosModulos deshabilitado
    0, -- PermisosParametros deshabilitado
    0, -- PermisosDashboard deshabilitado
    0, -- PermisosParametrosAV deshabilitado
    'system'
FROM TD_ROLES r
WHERE r.Nombre != 'Administrador'
AND NOT EXISTS (
    SELECT 1 
    FROM TR_ROL_CONFIG_PERMISO cp 
    WHERE cp.RolId = r.Id
);

PRINT 'Permisos de configuración inicializados para todos los roles';
GO

PRINT '';
PRINT '==============================================';
PRINT 'Migración completada exitosamente';
PRINT '==============================================';
PRINT 'Tabla TR_ROL_CONFIG_PERMISO creada';
PRINT 'Permisos asignados al rol Administrador';
PRINT 'Permisos deshabilitados para los demás roles';
PRINT '==============================================';
