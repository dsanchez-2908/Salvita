-- Script para agregar la columna PermisoVerAgrupado a TR_ROL_MODULO_PERMISO
-- Este permiso permite a los usuarios ver todos los registros de módulos secundarios
-- agrupados en una sola vista ordenada por fecha de creación

USE [Salvita]
GO

-- Verificar si la columna ya existe
IF NOT EXISTS (
    SELECT 1 
    FROM sys.columns 
    WHERE object_id = OBJECT_ID('TR_ROL_MODULO_PERMISO') 
    AND name = 'PermisoVerAgrupado'
)
BEGIN
    -- Agregar la columna PermisoVerAgrupado
    ALTER TABLE TR_ROL_MODULO_PERMISO
    ADD PermisoVerAgrupado BIT NOT NULL DEFAULT 0;
    
    PRINT 'Columna PermisoVerAgrupado agregada exitosamente a TR_ROL_MODULO_PERMISO';
END
ELSE
BEGIN
    PRINT 'La columna PermisoVerAgrupado ya existe en TR_ROL_MODULO_PERMISO';
END
GO

-- Opcional: Actualizar permisos existentes para administradores
-- Descomentar si deseas que los administradores tengan este permiso por defecto
/*
UPDATE p
SET p.PermisoVerAgrupado = 1
FROM TR_ROL_MODULO_PERMISO p
INNER JOIN TD_ROLES r ON p.RolId = r.Id
INNER JOIN TD_MODULOS m ON p.ModuloId = m.Id
WHERE r.Nombre = 'Administrador' 
  AND m.Tipo = 'Principal';

PRINT 'Permisos actualizados para rol Administrador en módulos principales';
*/
GO
