-- =============================================
-- Migración: Agregar soporte para gráficos y widgets de tareas
-- Fecha: 2026-04-08
-- Descripción: Agregar campos para gráficos y widgets de tareas al dashboard
-- =============================================

USE Salvita;
GO

-- Agregar campo Tipo para diferenciar entre Modulos y Tareas
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TD_DASHBOARD_CONFIG') AND name = 'Tipo')
BEGIN
    ALTER TABLE TD_DASHBOARD_CONFIG ADD [Tipo] VARCHAR(50) NOT NULL DEFAULT 'Modulos'
    CHECK ([Tipo] IN ('Modulos', 'Tareas'));
    PRINT 'Campo Tipo agregado a TD_DASHBOARD_CONFIG';
END
GO

-- Agregar campo TipoGrafico
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TD_DASHBOARD_CONFIG') AND name = 'TipoGrafico')
BEGIN
    ALTER TABLE TD_DASHBOARD_CONFIG ADD [TipoGrafico] VARCHAR(50) NULL
    CHECK ([TipoGrafico] IN ('Torta', 'Barras'));
    PRINT 'Campo TipoGrafico agregado a TD_DASHBOARD_CONFIG';
END
GO

-- Agregar campo TareasTipoVisualizacion
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TD_DASHBOARD_CONFIG') AND name = 'TareasTipoVisualizacion')
BEGIN
    ALTER TABLE TD_DASHBOARD_CONFIG ADD [TareasTipoVisualizacion] VARCHAR(50) NULL
    CHECK ([TareasTipoVisualizacion] IN ('PendientesPropios', 'PendientesTotales'));
    PRINT 'Campo TareasTipoVisualizacion agregado a TD_DASHBOARD_CONFIG';
END
GO

-- Agregar campo TareasCategoria
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TD_DASHBOARD_CONFIG') AND name = 'TareasCategoria')
BEGIN
    ALTER TABLE TD_DASHBOARD_CONFIG ADD [TareasCategoria] VARCHAR(50) NULL
    CHECK ([TareasCategoria] IN ('BandejaPersonal', 'BandejasGrupal'));
    PRINT 'Campo TareasCategoria agregado a TD_DASHBOARD_CONFIG';
END
GO

-- Agregar campo TareasMostrarComo
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TD_DASHBOARD_CONFIG') AND name = 'TareasMostrarComo')
BEGIN
    ALTER TABLE TD_DASHBOARD_CONFIG ADD [TareasMostrarComo] VARCHAR(50) NULL
    CHECK ([TareasMostrarComo] IN ('Cantidades', 'Grafico'));
    PRINT 'Campo TareasMostrarComo agregado a TD_DASHBOARD_CONFIG';
END
GO

-- Actualizar CHECK constraint de TipoVisualizacion para incluir Grafico
-- Primero eliminar el constraint anterior si existe
DECLARE @ConstraintName NVARCHAR(200);
SELECT @ConstraintName = name 
FROM sys.check_constraints 
WHERE parent_object_id = OBJECT_ID('TD_DASHBOARD_CONFIG') 
  AND col_name(parent_object_id, parent_column_id) = 'TipoVisualizacion';

IF @ConstraintName IS NOT NULL
BEGIN
    DECLARE @SQL NVARCHAR(MAX) = 'ALTER TABLE TD_DASHBOARD_CONFIG DROP CONSTRAINT ' + @ConstraintName;
    EXEC sp_executesql @SQL;
    PRINT 'Constraint anterior de TipoVisualizacion eliminado';
END
GO

-- Agregar nuevo CHECK constraint con Grafico
ALTER TABLE TD_DASHBOARD_CONFIG 
ADD CONSTRAINT CK_TD_DASHBOARD_CONFIG_TipoVisualizacion 
CHECK ([TipoVisualizacion] IN ('Agrupamiento', 'DetalleFiltrado', 'Totalizado', 'Grafico'));
PRINT 'Nuevo CHECK constraint agregado para TipoVisualizacion (incluye Grafico)';
GO

-- Hacer ModuloId nullable ya que widgets de Tareas no necesitan ModuloId
IF EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('TD_DASHBOARD_CONFIG') 
    AND name = 'ModuloId' 
    AND is_nullable = 0
)
BEGIN
    -- Eliminar FK constraint primero
    DECLARE @FKName NVARCHAR(200);
    SELECT @FKName = name 
    FROM sys.foreign_keys 
    WHERE parent_object_id = OBJECT_ID('TD_DASHBOARD_CONFIG') 
      AND referenced_object_id = OBJECT_ID('TD_MODULOS');

    IF @FKName IS NOT NULL
    BEGIN
        DECLARE @DropFKSQL NVARCHAR(MAX) = 'ALTER TABLE TD_DASHBOARD_CONFIG DROP CONSTRAINT ' + @FKName;
        EXEC sp_executesql @DropFKSQL;
        PRINT 'FK constraint de ModuloId eliminado';
    END

    -- Hacer ModuloId nullable
    ALTER TABLE TD_DASHBOARD_CONFIG ALTER COLUMN [ModuloId] INT NULL;
    PRINT 'Campo ModuloId ahora es nullable';

    -- Recrear FK constraint
    ALTER TABLE TD_DASHBOARD_CONFIG 
    ADD CONSTRAINT FK_TD_DASHBOARD_CONFIG_Modulo 
    FOREIGN KEY ([ModuloId]) REFERENCES [dbo].[TD_MODULOS]([Id]) ON DELETE CASCADE;
    PRINT 'FK constraint de ModuloId recreado';
END
GO

PRINT 'Migración completada: Dashboard config actualizado para gráficos y widgets de tareas';
GO
