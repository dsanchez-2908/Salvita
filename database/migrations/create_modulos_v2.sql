-- =============================================
-- Migración: Módulos V2 - Sistema de relaciones N:N
-- Descripción: Agrega soporte para relaciones múltiples entre módulos
-- Fecha: 2026-02-03
-- =============================================

USE Salvita;
GO

-- =============================================
-- 1. Agregar columna MostrarEnMenu a TD_MODULOS
-- =============================================
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[TD_MODULOS]') 
    AND name = 'MostrarEnMenu'
)
BEGIN
    ALTER TABLE [dbo].[TD_MODULOS]
    ADD [MostrarEnMenu] BIT NOT NULL DEFAULT 1;
    
    PRINT 'Columna MostrarEnMenu agregada a TD_MODULOS';
END
ELSE
BEGIN
    PRINT 'Columna MostrarEnMenu ya existe en TD_MODULOS';
END
GO

-- =============================================
-- 2. Crear tabla TR_MODULO_RELACION
-- Descripción: Tabla de relaciones N:N entre módulos
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TR_MODULO_RELACION]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[TR_MODULO_RELACION] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [ModuloPadreId] INT NOT NULL,
        [ModuloHijoId] INT NOT NULL,
        [Orden] INT DEFAULT 0,
        [FechaCreacion] DATETIME DEFAULT GETDATE(),
        [UsuarioCreacion] VARCHAR(100),
        
        -- Foreign Keys
        CONSTRAINT FK_TR_MODULO_RELACION_Padre 
            FOREIGN KEY ([ModuloPadreId]) 
            REFERENCES [dbo].[TD_MODULOS]([Id]) 
            ON DELETE CASCADE,
            
        CONSTRAINT FK_TR_MODULO_RELACION_Hijo 
            FOREIGN KEY ([ModuloHijoId]) 
            REFERENCES [dbo].[TD_MODULOS]([Id]),
            
        -- Evitar relaciones duplicadas
        CONSTRAINT UQ_ModuloPadreHijo 
            UNIQUE ([ModuloPadreId], [ModuloHijoId]),
            
        -- Evitar auto-referencias
        CONSTRAINT CHK_NoAutoRelacion 
            CHECK ([ModuloPadreId] <> [ModuloHijoId])
    );
    
    -- Índices para mejorar performance
    CREATE INDEX IX_TR_MODULO_RELACION_Padre 
        ON [dbo].[TR_MODULO_RELACION]([ModuloPadreId]);
        
    CREATE INDEX IX_TR_MODULO_RELACION_Hijo 
        ON [dbo].[TR_MODULO_RELACION]([ModuloHijoId]);
    
    PRINT 'Tabla TR_MODULO_RELACION creada exitosamente';
END
ELSE
BEGIN
    PRINT 'Tabla TR_MODULO_RELACION ya existe';
END
GO

-- =============================================
-- 3. Actualizar módulos existentes (opcional)
-- =============================================
-- Los módulos con Tipo='Principal' se mostrarán en el menú
-- Los módulos con Tipo='Secundario' NO se mostrarán en el menú
UPDATE [dbo].[TD_MODULOS]
SET [MostrarEnMenu] = CASE 
    WHEN [Tipo] = 'Principal' OR [Tipo] = 'Independiente' THEN 1
    WHEN [Tipo] = 'Secundario' THEN 0
    ELSE 1
END
WHERE [MostrarEnMenu] IS NULL OR [MostrarEnMenu] = 1;

PRINT 'Módulos actualizados con valor de MostrarEnMenu';
GO

-- =============================================
-- 4. Vista para consultar relaciones fácilmente
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.views WHERE name = 'VW_MODULO_RELACIONES')
BEGIN
    EXEC('
    CREATE VIEW [dbo].[VW_MODULO_RELACIONES] AS
    SELECT 
        r.Id,
        r.ModuloPadreId,
        mPadre.Nombre AS ModuloPadreNombre,
        mPadre.MostrarEnMenu AS ModuloPadreMostrarEnMenu,
        r.ModuloHijoId,
        mHijo.Nombre AS ModuloHijoNombre,
        mHijo.MostrarEnMenu AS ModuloHijoMostrarEnMenu,
        r.Orden,
        r.FechaCreacion,
        r.UsuarioCreacion
    FROM [dbo].[TR_MODULO_RELACION] r
    INNER JOIN [dbo].[TD_MODULOS] mPadre ON r.ModuloPadreId = mPadre.Id
    INNER JOIN [dbo].[TD_MODULOS] mHijo ON r.ModuloHijoId = mHijo.Id
    ');
    
    PRINT 'Vista VW_MODULO_RELACIONES creada exitosamente';
END
ELSE
BEGIN
    PRINT 'Vista VW_MODULO_RELACIONES ya existe';
END
GO

PRINT '=============================================';
PRINT 'Migración completada exitosamente';
PRINT '=============================================';
GO
