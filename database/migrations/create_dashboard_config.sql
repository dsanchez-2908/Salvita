-- =============================================
-- Migración: Crear tabla TD_DASHBOARD_CONFIG
-- Fecha: 2025-12-26
-- Descripción: Almacena la configuración del dashboard por rol
-- =============================================

USE Salvita;
GO

-- =============================================
-- TABLA: TD_DASHBOARD_CONFIG
-- Descripción: Configuración de widgets del dashboard por rol
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TD_DASHBOARD_CONFIG]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[TD_DASHBOARD_CONFIG] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [RolId] INT NOT NULL,
        [ModuloId] INT NOT NULL,
        [TipoVisualizacion] VARCHAR(50) NOT NULL CHECK ([TipoVisualizacion] IN ('Agrupamiento', 'DetalleFiltrado')),
        [CampoAgrupamiento] VARCHAR(100) NULL, -- Para tipo Agrupamiento
        [CampoFiltro] VARCHAR(100) NULL, -- Para tipo DetalleFiltrado
        [ValorFiltro] VARCHAR(MAX) NULL, -- Para tipo DetalleFiltrado
        [Orden] INT DEFAULT 0,
        [FechaCreacion] DATETIME DEFAULT GETDATE(),
        [FechaModificacion] DATETIME DEFAULT GETDATE(),
        [UsuarioCreacion] VARCHAR(100),
        [UsuarioModificacion] VARCHAR(100),
        CONSTRAINT FK_TD_DASHBOARD_CONFIG_Rol FOREIGN KEY ([RolId]) REFERENCES [dbo].[TD_ROLES]([Id]) ON DELETE CASCADE,
        CONSTRAINT FK_TD_DASHBOARD_CONFIG_Modulo FOREIGN KEY ([ModuloId]) REFERENCES [dbo].[TD_MODULOS]([Id]) ON DELETE CASCADE
    );

    PRINT 'Tabla TD_DASHBOARD_CONFIG creada exitosamente';
END
ELSE
BEGIN
    PRINT 'La tabla TD_DASHBOARD_CONFIG ya existe';
END
GO

-- Crear índices para mejorar rendimiento
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_DASHBOARD_CONFIG_RolId')
BEGIN
    CREATE INDEX IX_DASHBOARD_CONFIG_RolId ON [dbo].[TD_DASHBOARD_CONFIG] ([RolId]);
    PRINT 'Índice IX_DASHBOARD_CONFIG_RolId creado';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_DASHBOARD_CONFIG_ModuloId')
BEGIN
    CREATE INDEX IX_DASHBOARD_CONFIG_ModuloId ON [dbo].[TD_DASHBOARD_CONFIG] ([ModuloId]);
    PRINT 'Índice IX_DASHBOARD_CONFIG_ModuloId creado';
END
GO
