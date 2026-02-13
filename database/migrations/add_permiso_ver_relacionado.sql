-- =============================================
-- Migración: Agregar columna PermisoVerRelacionado
-- Descripción: Permite controlar si un rol puede ver las relaciones inversas de un registro
-- Fecha: 2026-02-13
-- =============================================

USE Salvita;
GO

-- Verificar si la columna ya existe
IF NOT EXISTS (
    SELECT 1 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'TR_ROL_MODULO_PERMISO' 
    AND COLUMN_NAME = 'PermisoVerRelacionado'
)
BEGIN
    PRINT 'Agregando columna PermisoVerRelacionado a TR_ROL_MODULO_PERMISO...';
    
    ALTER TABLE TR_ROL_MODULO_PERMISO
    ADD PermisoVerRelacionado BIT NOT NULL DEFAULT 0;
    
    PRINT '✓ Columna PermisoVerRelacionado agregada exitosamente';
END
ELSE
BEGIN
    PRINT 'La columna PermisoVerRelacionado ya existe';
END
GO

-- Actualizar permisos del rol Administrador para tener permiso de Ver Relacionado en todos los módulos principales
PRINT 'Actualizando permisos del rol Administrador...';

UPDATE TR_ROL_MODULO_PERMISO
SET PermisoVerRelacionado = 1
WHERE RolId IN (SELECT Id FROM TD_ROLES WHERE Nombre = 'Administrador')
  AND ModuloPadreId IS NULL; -- Solo para módulos principales

PRINT '✓ Permisos del rol Administrador actualizados';
GO

PRINT '✓ Migración completada exitosamente';
GO
