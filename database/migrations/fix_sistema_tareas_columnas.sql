-- =============================================
-- Script de Corrección: Sistema de Tareas
-- Descripción: Ajusta columnas de tablas creadas
-- Fecha: 2026-02-24
-- =============================================

USE Salvita;
GO

PRINT '=============================================';
PRINT 'Iniciando corrección: Sistema de Tareas';
PRINT '=============================================';
GO

-- =============================================
-- 1. Agregar columna Activo a TD_BANDEJAS
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[TD_BANDEJAS]') AND name = 'Activo')
BEGIN
    ALTER TABLE [dbo].[TD_BANDEJAS]
    ADD [Activo] BIT NOT NULL DEFAULT 1;
    
    -- Actualizar según el campo Estado existente
    UPDATE [dbo].[TD_BANDEJAS]
    SET [Activo] = CASE WHEN [Estado] = 'Activa' THEN 1 ELSE 0 END
    WHERE [Activo] = 1;
    
    PRINT '✓ Columna Activo agregada a TD_BANDEJAS';
END
ELSE
BEGIN
    PRINT '⚠ Columna Activo ya existe en TD_BANDEJAS';
END
GO

-- =============================================
-- 2. Actualizar TD_TAREAS - Agregar columnas faltantes
-- =============================================

-- Agregar columna PlantillaId (alias de PlantillaTareaId)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[TD_TAREAS]') AND name = 'PlantillaId')
BEGIN
    ALTER TABLE [dbo].[TD_TAREAS]
    ADD [PlantillaId] INT NULL;
    
    -- Copiar valores si hay datos
    IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[TD_TAREAS]') AND name = 'PlantillaTareaId')
    BEGIN
        UPDATE [dbo].[TD_TAREAS]
        SET [PlantillaId] = [PlantillaTareaId];
    END
    
    PRINT '✓ Columna PlantillaId agregada a TD_TAREAS';
END
ELSE
BEGIN
    PRINT '⚠ Columna PlantillaId ya existe en TD_TAREAS';
END
GO

-- Agregar columna ModuloId para tareas
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[TD_TAREAS]') AND name = 'ModuloId')
BEGIN
    ALTER TABLE [dbo].[TD_TAREAS]
    ADD [ModuloId] INT NULL;
    
    PRINT '✓ Columna ModuloId agregada a TD_TAREAS';
END
ELSE
BEGIN
    PRINT '⚠ Columna ModuloId ya existe en TD_TAREAS';
END
GO

-- Agregar columna CreadoPor
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[TD_TAREAS]') AND name = 'CreadoPor')
BEGIN
    ALTER TABLE [dbo].[TD_TAREAS]
    ADD [CreadoPor] INT NULL;
    
    PRINT '✓ Columna CreadoPor agregada a TD_TAREAS';
END
ELSE
BEGIN
    PRINT '⚠ Columna CreadoPor ya existe en TD_TAREAS';
END
GO

-- Agregar columna Activo
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[TD_TAREAS]') AND name = 'Activo')
BEGIN
    ALTER TABLE [dbo].[TD_TAREAS]
    ADD [Activo] BIT DEFAULT 1;
    
    -- Actualizar registros existentes
    UPDATE [dbo].[TD_TAREAS]
    SET [Activo] = 1;
    
    PRINT '✓ Columna Activo agregada a TD_TAREAS';
END
ELSE
BEGIN
    PRINT '⚠ Columna Activo ya existe en TD_TAREAS';
END
GO

-- Agregar columnas TomoId y FechaTomo (aliases)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[TD_TAREAS]') AND name = 'TomoId')
BEGIN
    ALTER TABLE [dbo].[TD_TAREAS]
    ADD [TomoId] INT NULL;
    
    -- Copiar valores existentes si hay
    IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[TD_TAREAS]') AND name = 'UsuarioTomadaPorId')
    BEGIN
        UPDATE [dbo].[TD_TAREAS]
        SET [TomoId] = [UsuarioTomadaPorId];
    END
    
    PRINT '✓ Columna TomoId agregada a TD_TAREAS';
END
ELSE
BEGIN
    PRINT '⚠ Columna TomoId ya existe en TD_TAREAS';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[TD_TAREAS]') AND name = 'FechaTomo')
BEGIN
    ALTER TABLE [dbo].[TD_TAREAS]
    ADD [FechaTomo] DATETIME NULL;
    
    -- Copiar valores existentes si hay
    IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[TD_TAREAS]') AND name = 'FechaTomada')
    BEGIN
        UPDATE [dbo].[TD_TAREAS]
        SET [FechaTomo] = [FechaTomada];
    END
    
    PRINT '✓ Columna FechaTomo agregada a TD_TAREAS';
END
ELSE
BEGIN
    PRINT '⚠ Columna FechaTomo ya existe en TD_TAREAS';
END
GO

-- =============================================
-- 3. Actualizar CHECK constraint de Estado en TD_TAREAS
-- =============================================

-- Eliminar constraint existente si hay
DECLARE @ConstraintName NVARCHAR(200);
SELECT @ConstraintName = name 
FROM sys.check_constraints 
WHERE parent_object_id = OBJECT_ID(N'[dbo].[TD_TAREAS]') 
  AND COL_NAME(parent_object_id, parent_column_id) = 'Estado';

IF @ConstraintName IS NOT NULL
BEGIN
    DECLARE @SQL NVARCHAR(500);
    SET @SQL = 'ALTER TABLE [dbo].[TD_TAREAS] DROP CONSTRAINT ' + @ConstraintName;
    EXEC sp_executesql @SQL;
    PRINT '✓ Constraint de Estado eliminado';
END
GO

-- Crear nuevo constraint con estados correctos
IF NOT EXISTS (
    SELECT * FROM sys.check_constraints 
    WHERE parent_object_id = OBJECT_ID(N'[dbo].[TD_TAREAS]') 
      AND name = 'CHK_TD_TAREAS_Estado'
)
BEGIN
    ALTER TABLE [dbo].[TD_TAREAS]
    ADD CONSTRAINT CHK_TD_TAREAS_Estado 
        CHECK ([Estado] IN ('Pendiente', 'EnProceso', 'Finalizada', 'Rechazada'));
    
    PRINT '✓ Nuevo constraint de Estado creado';
END
GO

-- =============================================
-- 4. Actualizar TD_TAREA_HISTORIAL - Agregar columnas compatibles
-- =============================================

-- Agregar columna Comentario (alias de Detalle)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[TD_TAREA_HISTORIAL]') AND name = 'Comentario')
BEGIN
    ALTER TABLE [dbo].[TD_TAREA_HISTORIAL]
    ADD [Comentario] VARCHAR(MAX);
    
    -- Copiar valores si hay
    IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[TD_TAREA_HISTORIAL]') AND name = 'Detalle')
    BEGIN
        UPDATE [dbo].[TD_TAREA_HISTORIAL]
        SET [Comentario] = [Detalle];
    END
    
    PRINT '✓ Columna Comentario agregada a TD_TAREA_HISTORIAL';
END
ELSE
BEGIN
    PRINT '⚠ Columna Comentario ya existe en TD_TAREA_HISTORIAL';
END
GO

-- Agregar columna FechaAccion (alias de FechaHora)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[TD_TAREA_HISTORIAL]') AND name = 'FechaAccion')
BEGIN
    ALTER TABLE [dbo].[TD_TAREA_HISTORIAL]
    ADD [FechaAccion] DATETIME DEFAULT GETDATE();
    
    -- Copiar valores si hay
    IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[TD_TAREA_HISTORIAL]') AND name = 'FechaHora')
    BEGIN
        UPDATE [dbo].[TD_TAREA_HISTORIAL]
        SET [FechaAccion] = [FechaHora];
    END
    
    PRINT '✓ Columna FechaAccion agregada a TD_TAREA_HISTORIAL';
END
ELSE
BEGIN
    PRINT '⚠ Columna FechaAccion ya existe en TD_TAREA_HISTORIAL';
END
GO

-- =============================================
-- 5. Actualizar constraint CHECK de Accion en TD_TAREA_HISTORIAL
-- =============================================

-- Eliminar constraint existente
DECLARE @ConstraintName2 NVARCHAR(200);
SELECT @ConstraintName2 = name 
FROM sys.check_constraints 
WHERE parent_object_id = OBJECT_ID(N'[dbo].[TD_TAREA_HISTORIAL]') 
  AND COL_NAME(parent_object_id, parent_column_id) = 'Accion';

IF @ConstraintName2 IS NOT NULL
BEGIN
    DECLARE @SQL2 NVARCHAR(500);
    SET @SQL2 = 'ALTER TABLE [dbo].[TD_TAREA_HISTORIAL] DROP CONSTRAINT ' + @ConstraintName2;
    EXEC sp_executesql @SQL2;
    PRINT '✓ Constraint de Accion eliminado';
END
GO

-- Crear nuevo constraint con acciones correctas
IF NOT EXISTS (
    SELECT * FROM sys.check_constraints 
    WHERE parent_object_id = OBJECT_ID(N'[dbo].[TD_TAREA_HISTORIAL]') 
      AND name = 'CHK_TD_TAREA_HISTORIAL_Accion'
)
BEGIN
    ALTER TABLE [dbo].[TD_TAREA_HISTORIAL]
    ADD CONSTRAINT CHK_TD_TAREA_HISTORIAL_Accion 
        CHECK ([Accion] IN ('Creacion', 'Inicio', 'Tomar', 'Finalizar', 'Rechazar', 'Reasignar', 'Comentar', 'ActualizarRegistro'));
    
    PRINT '✓ Nuevo constraint de Accion creado con acciones correctas';
END
GO

-- =============================================
-- 6. Actualizar TR_TAREA_REGISTRO - Agregar FechaAsociacion
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[TR_TAREA_REGISTRO]') AND name = 'FechaAsociacion')
BEGIN
    ALTER TABLE [dbo].[TR_TAREA_REGISTRO]
    ADD [FechaAsociacion] DATETIME DEFAULT GETDATE();
    
    -- Actualizar registros existentes con FechaCreacion
    IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[TR_TAREA_REGISTRO]') AND name = 'FechaCreacion')
    BEGIN
        UPDATE [dbo].[TR_TAREA_REGISTRO]
        SET [FechaAsociacion] = [FechaCreacion]
        WHERE [FechaAsociacion] IS NULL;
    END
    
    PRINT '✓ Columna FechaAsociacion agregada a TR_TAREA_REGISTRO';
END
ELSE
BEGIN
    PRINT '⚠ Columna FechaAsociacion ya existe en TR_TAREA_REGISTRO';
END
GO

-- =============================================
-- 7. Agregar columna Instrucciones a TD_PLANTILLA_TAREAS (alias de Indicaciones)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[TD_PLANTILLA_TAREAS]') AND name = 'Instrucciones')
BEGIN
    ALTER TABLE [dbo].[TD_PLANTILLA_TAREAS]
    ADD [Instrucciones] VARCHAR(MAX);
    
    -- Copiar valores si hay
    IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[TD_PLANTILLA_TAREAS]') AND name = 'Indicaciones')
    BEGIN
        UPDATE [dbo].[TD_PLANTILLA_TAREAS]
        SET [Instrucciones] = [Indicaciones];
    END
    
    PRINT '✓ Columna Instrucciones agregada a TD_PLANTILLA_TAREAS';
END
ELSE
BEGIN
    PRINT '⚠ Columna Instrucciones ya existe en TD_PLANTILLA_TAREAS';
END
GO

-- =============================================
-- 8. Agregar columna Activo a TD_PLANTILLA_TAREAS
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[TD_PLANTILLA_TAREAS]') AND name = 'Activo')
BEGIN
    ALTER TABLE [dbo].[TD_PLANTILLA_TAREAS]
    ADD [Activo] BIT DEFAULT 1;
    
    -- Actualizar según el campo Estado existente
    IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[TD_PLANTILLA_TAREAS]') AND name = 'Estado')
    BEGIN
        UPDATE [dbo].[TD_PLANTILLA_TAREAS]
        SET [Activo] = CASE WHEN [Estado] = 'Activo' THEN 1 ELSE 0 END;
    END
    ELSE
    BEGIN
        UPDATE [dbo].[TD_PLANTILLA_TAREAS]
        SET [Activo] = 1;
    END
    
    PRINT '✓ Columna Activo agregada a TD_PLANTILLA_TAREAS';
END
ELSE
BEGIN
    PRINT '⚠ Columna Activo ya existe en TD_PLANTILLA_TAREAS';
END
GO

PRINT '=============================================';
PRINT 'Corrección completada exitosamente';
PRINT '=============================================';
GO
