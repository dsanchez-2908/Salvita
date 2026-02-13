-- =============================================
-- Migración: Crear tabla TD_MODULE_VIEW_CONFIG
-- Fecha: 2026-02-13
-- Descripción: Almacena la configuración de vista de módulos padre
-- =============================================

USE salvita;
GO

-- =============================================
-- TABLA: TD_MODULE_VIEW_CONFIG
-- Descripción: Configuración de visualización de módulos padre
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TD_MODULE_VIEW_CONFIG]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[TD_MODULE_VIEW_CONFIG] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [ModuloId] INT NOT NULL,
        
        -- Configuración de filtros iniciales (Ajuste 1)
        [FiltrosIniciales] NVARCHAR(MAX) NULL, -- JSON: [{campo, operador, valor}, ...]
        
        -- Configuración de título (Ajuste 2)
        [ConfigTitulo] NVARCHAR(MAX) NULL, -- JSON: {campos: ["Nombres", "Apellidos"], separador: " ", template: "[Nombres] [Apellidos] (Edad: [Edad])"}
        
        -- Configuración de columnas en detalle (Ajuste 3)
        [NumeroColumnas] INT DEFAULT 2 CHECK ([NumeroColumnas] BETWEEN 1 AND 4), -- 1, 2, 3 o 4 columnas
        
        -- Metadatos
        [FechaCreacion] DATETIME DEFAULT GETDATE(),
        [FechaModificacion] DATETIME DEFAULT GETDATE(),
        [UsuarioCreacion] VARCHAR(100),
        [UsuarioModificacion] VARCHAR(100),
        
        -- Constraints
        CONSTRAINT FK_TD_MODULE_VIEW_CONFIG_Modulo FOREIGN KEY ([ModuloId]) 
            REFERENCES [dbo].[TD_MODULOS]([Id]) ON DELETE CASCADE,
        CONSTRAINT UQ_TD_MODULE_VIEW_CONFIG_Modulo UNIQUE ([ModuloId])
    );
    
    PRINT 'Tabla TD_MODULE_VIEW_CONFIG creada exitosamente';
END
ELSE
BEGIN
    PRINT 'La tabla TD_MODULE_VIEW_CONFIG ya existe';
END
GO

-- Índice para búsquedas por módulo
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_TD_MODULE_VIEW_CONFIG_ModuloId' AND object_id = OBJECT_ID('TD_MODULE_VIEW_CONFIG'))
BEGIN
    CREATE INDEX IX_TD_MODULE_VIEW_CONFIG_ModuloId ON [dbo].[TD_MODULE_VIEW_CONFIG] ([ModuloId]);
    PRINT 'Índice IX_TD_MODULE_VIEW_CONFIG_ModuloId creado exitosamente';
END
GO

PRINT 'Migración completada exitosamente';
