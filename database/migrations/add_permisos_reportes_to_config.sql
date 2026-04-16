-- =============================================
-- Agregar columna PermisosReportes a TR_ROL_CONFIG_PERMISO
-- Fecha: 8 de abril de 2026
-- =============================================

USE Salvita;
GO

-- Agregar columna si no existe
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('TR_ROL_CONFIG_PERMISO') 
    AND name = 'PermisosReportes'
)
BEGIN
    ALTER TABLE TR_ROL_CONFIG_PERMISO
    ADD PermisosReportes BIT NOT NULL DEFAULT 0;
    
    PRINT 'Columna PermisosReportes agregada exitosamente';
END
ELSE
BEGIN
    PRINT 'Columna PermisosReportes ya existe';
END
GO

PRINT 'Actualización completada';
GO
