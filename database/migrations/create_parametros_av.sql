-- =============================================
-- Migración: Parámetros Asistente Virtual
-- Descripción: Tabla para configurar el asistente virtual por módulo
-- Fecha: 2026-02-10
-- =============================================

USE Salvita;
GO

-- =============================================
-- TABLA: TD_PARAMETROS_AV
-- Descripción: Almacena configuración del Asistente Virtual por módulo
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TD_PARAMETROS_AV]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[TD_PARAMETROS_AV] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [ModuloId] INT NOT NULL,
        [Prompt] VARCHAR(MAX) NULL,
        [Temperatura] VARCHAR(MAX) NULL,
        [MaxTokens] VARCHAR(MAX) NULL,
        [Modelo] VARCHAR(MAX) NULL,
        [Estado] VARCHAR(20) DEFAULT 'Activo' CHECK ([Estado] IN ('Activo', 'Inactivo')),
        [FechaCreacion] DATETIME DEFAULT GETDATE(),
        [FechaModificacion] DATETIME DEFAULT GETDATE(),
        [UsuarioCreacion] VARCHAR(100),
        [UsuarioModificacion] VARCHAR(100),
        
        -- Foreign Key a TD_MODULOS
        CONSTRAINT FK_TD_PARAMETROS_AV_Modulo 
            FOREIGN KEY ([ModuloId]) 
            REFERENCES [dbo].[TD_MODULOS]([Id]) 
            ON DELETE CASCADE,
        
        -- Constraint: Una sola configuración por módulo
        CONSTRAINT UQ_ParametrosAV_Modulo 
            UNIQUE ([ModuloId])
    );
    
    -- Índice para optimizar búsquedas
    CREATE INDEX IX_TD_PARAMETROS_AV_Modulo 
        ON [dbo].[TD_PARAMETROS_AV]([ModuloId]);
    
    PRINT 'Tabla TD_PARAMETROS_AV creada exitosamente';
END
ELSE
BEGIN
    PRINT 'Tabla TD_PARAMETROS_AV ya existe';
END
GO

-- =============================================
-- Vista para consultar configuraciones fácilmente
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.views WHERE name = 'VW_PARAMETROS_AV')
BEGIN
    EXEC('
    CREATE VIEW [dbo].[VW_PARAMETROS_AV] AS
    SELECT 
        p.Id,
        p.ModuloId,
        m.Nombre AS ModuloNombre,
        m.Icono AS ModuloIcono,
        m.MostrarEnMenu,
        p.Prompt,
        p.Temperatura,
        p.MaxTokens,
        p.Modelo,
        p.Estado,
        p.FechaCreacion,
        p.FechaModificacion,
        p.UsuarioCreacion,
        p.UsuarioModificacion
    FROM TD_PARAMETROS_AV p
    INNER JOIN TD_MODULOS m ON p.ModuloId = m.Id
    ');
    
    PRINT 'Vista VW_PARAMETROS_AV creada exitosamente';
END
ELSE
BEGIN
    PRINT 'Vista VW_PARAMETROS_AV ya existe';
END
GO

PRINT 'Migración de Parámetros AV completada exitosamente';
GO
