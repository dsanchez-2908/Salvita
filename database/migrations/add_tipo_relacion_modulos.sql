-- =============================================
-- Migración: Agregar TipoRelacion a TR_MODULO_RELACION
-- Descripción: Diferencia entre relaciones Padre-Hijo y relaciones de Asociación de Registros
-- Fecha: 2026-02-12
-- =============================================

USE salvita;
GO

-- Agregar columna TipoRelacion a TR_MODULO_RELACION
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[TR_MODULO_RELACION]') 
    AND name = 'TipoRelacion'
)
BEGIN
    ALTER TABLE [dbo].[TR_MODULO_RELACION]
    ADD [TipoRelacion] VARCHAR(20) NOT NULL DEFAULT 'Hijo';
    
    PRINT '✓ Columna TipoRelacion agregada a TR_MODULO_RELACION';
    PRINT '  - Valores permitidos: "Hijo" (crear registros) o "Asociar" (asociar registros existentes)';
    PRINT '  - Todos los registros existentes se marcaron como "Hijo" por defecto';
END
ELSE
BEGIN
    PRINT '⚠ Columna TipoRelacion ya existe en TR_MODULO_RELACION';
END
GO

-- Agregar constraint para validar valores permitidos
IF NOT EXISTS (
    SELECT * FROM sys.check_constraints 
    WHERE name = 'CHK_TipoRelacion_Valores'
)
BEGIN
    ALTER TABLE [dbo].[TR_MODULO_RELACION]
    ADD CONSTRAINT CHK_TipoRelacion_Valores 
    CHECK ([TipoRelacion] IN ('Hijo', 'Asociar'));
    
    PRINT '✓ Constraint CHK_TipoRelacion_Valores agregado';
END
ELSE
BEGIN
    PRINT '⚠ Constraint CHK_TipoRelacion_Valores ya existe';
END
GO

-- Modificar constraint unique para incluir TipoRelacion
-- Esto permite que un módulo tenga relación Hijo y Asociar con el mismo módulo
IF EXISTS (
    SELECT * FROM sys.indexes 
    WHERE name = 'UQ_ModuloPadreHijo' 
    AND object_id = OBJECT_ID(N'[dbo].[TR_MODULO_RELACION]')
)
BEGIN
    ALTER TABLE [dbo].[TR_MODULO_RELACION]
    DROP CONSTRAINT UQ_ModuloPadreHijo;
    
    PRINT '✓ Constraint UQ_ModuloPadreHijo eliminado';
END
GO

IF NOT EXISTS (
    SELECT * FROM sys.indexes 
    WHERE name = 'UQ_ModuloPadreHijo_Tipo' 
    AND object_id = OBJECT_ID(N'[dbo].[TR_MODULO_RELACION]')
)
BEGIN
    ALTER TABLE [dbo].[TR_MODULO_RELACION]
    ADD CONSTRAINT UQ_ModuloPadreHijo_Tipo 
    UNIQUE ([ModuloPadreId], [ModuloHijoId], [TipoRelacion]);
    
    PRINT '✓ Constraint UQ_ModuloPadreHijo_Tipo agregado';
    PRINT '  - Ahora un módulo puede tener relación Hijo Y Asociar con el mismo módulo destino';
END
GO

-- Crear vista actualizada para consultar relaciones fácilmente
IF EXISTS (SELECT * FROM sys.views WHERE name = 'VW_MODULO_RELACIONES')
BEGIN
    DROP VIEW [dbo].[VW_MODULO_RELACIONES];
    PRINT '✓ Vista VW_MODULO_RELACIONES eliminada';
END
GO

CREATE VIEW [dbo].[VW_MODULO_RELACIONES] AS
SELECT 
    r.Id,
    r.ModuloPadreId,
    mPadre.Nombre AS ModuloPadreNombre,
    mPadre.MostrarEnMenu AS ModuloPadreMostrarEnMenu,
    r.ModuloHijoId,
    mHijo.Nombre AS ModuloHijoNombre,
    mHijo.MostrarEnMenu AS ModuloHijoMostrarEnMenu,
    r.TipoRelacion,
    r.Orden,
    r.FechaCreacion,
    r.UsuarioCreacion
FROM [dbo].[TR_MODULO_RELACION] r
INNER JOIN [dbo].[TD_MODULOS] mPadre ON r.ModuloPadreId = mPadre.Id
INNER JOIN [dbo].[TD_MODULOS] mHijo ON r.ModuloHijoId = mHijo.Id;
GO

PRINT '✓ Vista VW_MODULO_RELACIONES recreada con TipoRelacion';
GO

PRINT '';
PRINT '=============================================';
PRINT 'Migración completada exitosamente';
PRINT '=============================================';
PRINT 'RESUMEN:';
PRINT '- Campo TipoRelacion agregado (valores: "Hijo" o "Asociar")';
PRINT '- Relaciones existentes marcadas como "Hijo"';
PRINT '- Constraint actualizado para permitir ambos tipos con mismo módulo';
PRINT '- Vista VW_MODULO_RELACIONES actualizada';
GO
