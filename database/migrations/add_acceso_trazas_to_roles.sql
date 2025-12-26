-- =============================================
-- Migración: Agregar campo AccesoTrazas a TD_ROLES
-- Fecha: 2025-12-26
-- Descripción: Permite controlar qué roles tienen acceso a la pantalla de Consultas/Auditoría
-- =============================================

USE Salvita;
GO

-- Verificar si la columna ya existe
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[TD_ROLES]') 
    AND name = 'AccesoTrazas'
)
BEGIN
    -- Agregar columna AccesoTrazas
    ALTER TABLE [dbo].[TD_ROLES]
    ADD [AccesoTrazas] BIT NOT NULL DEFAULT 0;

    PRINT 'Columna AccesoTrazas agregada exitosamente a TD_ROLES';
END
ELSE
BEGIN
    PRINT 'La columna AccesoTrazas ya existe en TD_ROLES';
END
GO

-- Habilitar el acceso a trazas para el rol Administrador
IF EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[TD_ROLES]') 
    AND name = 'AccesoTrazas'
)
BEGIN
    UPDATE [dbo].[TD_ROLES]
    SET [AccesoTrazas] = 1
    WHERE [Nombre] = 'Administrador';

    PRINT 'Acceso a trazas habilitado para rol Administrador';
END
GO
