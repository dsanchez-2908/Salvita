-- =====================================================================
-- Migración: Cambiar terminología de Finalizada a Completada
-- Fecha: 2026-02-27
-- Objetivo: Renombrar columnas y actualizar constraints y datos
-- =====================================================================

USE [Salvita];
GO

PRINT '=================================================================';
PRINT 'Iniciando migración de Finalizada → Completada';
PRINT '=================================================================';

BEGIN TRANSACTION;

BEGIN TRY
    -- =====================================================================
    -- 1. ACTUALIZAR TABLA TD_TAREAS
    -- =====================================================================
    PRINT 'Paso 1: Actualizando tabla TD_TAREAS...';
    
    -- 1.1: Verificar si existe la columna FechaFinalizacion
    IF EXISTS (
        SELECT 1 FROM sys.columns 
        WHERE object_id = OBJECT_ID('[dbo].[TD_TAREAS]') 
        AND name = 'FechaFinalizacion'
    )
    BEGIN
        PRINT '  - Renombrando columna FechaFinalizacion → FechaCompletado';
        EXEC sp_rename 'dbo.TD_TAREAS.FechaFinalizacion', 'FechaCompletado', 'COLUMN';
    END
    ELSE
    BEGIN
        PRINT '  - Columna FechaCompletado ya existe o FechaFinalizacion no existe';
    END
    
    -- 1.2: Eliminar constraint antiguo de Estado en TD_TAREAS
    IF EXISTS (
        SELECT 1 FROM sys.check_constraints 
        WHERE parent_object_id = OBJECT_ID('[dbo].[TD_TAREAS]')
        AND name LIKE 'CK__TD_TAREAS__Estad%'
    )
    BEGIN
        PRINT '  - Eliminando constraint antiguo de Estado';
        DECLARE @ConstraintName1 NVARCHAR(200);
        SELECT @ConstraintName1 = name 
        FROM sys.check_constraints 
        WHERE parent_object_id = OBJECT_ID('[dbo].[TD_TAREAS]')
        AND name LIKE 'CK__TD_TAREAS__Estad%';
        
        EXEC('ALTER TABLE [dbo].[TD_TAREAS] DROP CONSTRAINT ' + @ConstraintName1);
    END
    
    -- 1.3: Actualizar datos existentes en TD_TAREAS
    PRINT '  - Actualizando registros con Estado = Finalizada → Completada';
    UPDATE [dbo].[TD_TAREAS] 
    SET [Estado] = 'Completada' 
    WHERE [Estado] = 'Finalizada';
    
    PRINT CONCAT('    Registros actualizados: ', @@ROWCOUNT);
    
    -- 1.4: Crear nuevo constraint de Estado con Completada
    PRINT '  - Creando nuevo constraint de Estado con Completada';
    ALTER TABLE [dbo].[TD_TAREAS] 
    ADD CONSTRAINT CK_TD_TAREAS_Estado 
    CHECK ([Estado] IN ('Pendiente', 'Tomada', 'Completada', 'Rechazada'));

    -- =====================================================================
    -- 2. ACTUALIZAR TABLA TR_TAREA_REGISTRO
    -- =====================================================================
    PRINT 'Paso 2: Actualizando tabla TR_TAREA_REGISTRO...';
    
    -- 2.1: Verificar si existe la columna FechaFinalizacion
    IF EXISTS (
        SELECT 1 FROM sys.columns 
        WHERE object_id = OBJECT_ID('[dbo].[TR_TAREA_REGISTRO]') 
        AND name = 'FechaFinalizacion'
    )
    BEGIN
        PRINT '  - Renombrando columna FechaFinalizacion → FechaCompletado';
        EXEC sp_rename 'dbo.TR_TAREA_REGISTRO.FechaFinalizacion', 'FechaCompletado', 'COLUMN';
    END
    ELSE
    BEGIN
        PRINT '  - Columna FechaCompletado ya existe o FechaFinalizacion no existe';
    END
    
    -- 2.2: Eliminar constraint antiguo de Estado en TR_TAREA_REGISTRO
    IF EXISTS (
        SELECT 1 FROM sys.check_constraints 
        WHERE parent_object_id = OBJECT_ID('[dbo].[TR_TAREA_REGISTRO]')
        AND name LIKE 'CK__TR_TAREA%Estad%'
    )
    BEGIN
        PRINT '  - Eliminando constraint antiguo de Estado';
        DECLARE @ConstraintName2 NVARCHAR(200);
        SELECT @ConstraintName2 = name 
        FROM sys.check_constraints 
        WHERE parent_object_id = OBJECT_ID('[dbo].[TR_TAREA_REGISTRO]')
        AND name LIKE 'CK__TR_TAREA%Estad%';
        
        EXEC('ALTER TABLE [dbo].[TR_TAREA_REGISTRO] DROP CONSTRAINT ' + @ConstraintName2);
    END
    
    -- 2.3: Actualizar datos existentes en TR_TAREA_REGISTRO
    PRINT '  - Actualizando registros con Estado = Finalizada → Completada';
    UPDATE [dbo].[TR_TAREA_REGISTRO] 
    SET [Estado] = 'Completada' 
    WHERE [Estado] = 'Finalizada';
    
    PRINT CONCAT('    Registros actualizados: ', @@ROWCOUNT);
    
    -- 2.4: Crear nuevo constraint de Estado con Completada
    PRINT '  - Creando nuevo constraint de Estado con Completada';
    ALTER TABLE [dbo].[TR_TAREA_REGISTRO] 
    ADD CONSTRAINT CK_TR_TAREA_REGISTRO_Estado 
    CHECK ([Estado] IN ('Pendiente', 'Completada', 'Rechazada'));

    -- =====================================================================
    -- 3. ACTUALIZAR TABLA TD_TAREA_HISTORIAL
    -- =====================================================================
    PRINT 'Paso 3: Actualizando tabla TD_TAREA_HISTORIAL...';
    
    -- 3.1: Eliminar constraint antiguo de Accion
    IF EXISTS (
        SELECT 1 FROM sys.check_constraints 
        WHERE parent_object_id = OBJECT_ID('[dbo].[TD_TAREA_HISTORIAL]')
        AND name LIKE 'CK__TD_TAREA%Accio%'
    )
    BEGIN
        PRINT '  - Eliminando constraint antiguo de Accion';
        DECLARE @ConstraintName3 NVARCHAR(200);
        SELECT @ConstraintName3 = name 
        FROM sys.check_constraints 
        WHERE parent_object_id = OBJECT_ID('[dbo].[TD_TAREA_HISTORIAL]')
        AND name LIKE 'CK__TD_TAREA%Accio%';
        
        EXEC('ALTER TABLE [dbo].[TD_TAREA_HISTORIAL] DROP CONSTRAINT ' + @ConstraintName3);
    END
    
    -- 3.2: Actualizar datos existentes en TD_TAREA_HISTORIAL
    PRINT '  - Actualizando registros con Accion = Finalizar → Completar';
    UPDATE [dbo].[TD_TAREA_HISTORIAL] 
    SET [Accion] = 'Completar' 
    WHERE [Accion] = 'Finalizar';
    
    PRINT CONCAT('    Registros actualizados: ', @@ROWCOUNT);
    
    -- 3.3: Crear nuevo constraint de Accion con Completar
    PRINT '  - Creando nuevo constraint de Accion con Completar';
    ALTER TABLE [dbo].[TD_TAREA_HISTORIAL] 
    ADD CONSTRAINT CK_TD_TAREA_HISTORIAL_Accion 
    CHECK ([Accion] IN ('Crear', 'Tomar', 'Completar', 'Rechazar', 'Reasignar', 'Comentar', 'ActualizarRegistro'));

    -- =====================================================================
    -- RESUMEN FINAL
    -- =====================================================================
    PRINT '=================================================================';
    PRINT 'Resumen de migración:';
    
    SELECT 
        'TD_TAREAS' as Tabla,
        COUNT(*) as TotalTareas,
        SUM(CASE WHEN Estado = 'Completada' THEN 1 ELSE 0 END) as Completadas
    FROM [dbo].[TD_TAREAS];
    
    SELECT 
        'TR_TAREA_REGISTRO' as Tabla,
        COUNT(*) as TotalRegistros,
        SUM(CASE WHEN Estado = 'Completada' THEN 1 ELSE 0 END) as Completados
    FROM [dbo].[TR_TAREA_REGISTRO];
    
    SELECT 
        'TD_TAREA_HISTORIAL' as Tabla,
        COUNT(*) as TotalHistorial,
        SUM(CASE WHEN Accion = 'Completar' THEN 1 ELSE 0 END) as AccionesCompletar
    FROM [dbo].[TD_TAREA_HISTORIAL];
    
    PRINT '=================================================================';
    PRINT 'Migración completada exitosamente';
    PRINT '=================================================================';
    
    COMMIT TRANSACTION;
    PRINT 'TRANSACTION COMMITTED';

END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    
    PRINT '=================================================================';
    PRINT 'ERROR en la migración:';
    PRINT CONCAT('Mensaje: ', ERROR_MESSAGE());
    PRINT CONCAT('Línea: ', ERROR_LINE());
    PRINT CONCAT('Procedimiento: ', ERROR_PROCEDURE());
    PRINT '=================================================================';
    PRINT 'TRANSACTION ROLLED BACK';
    
    -- Re-lanzar el error
    THROW;
END CATCH;
GO
