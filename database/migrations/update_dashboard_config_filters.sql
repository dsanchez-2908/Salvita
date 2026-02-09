-- =============================================
-- Migración: Actualizar TD_DASHBOARD_CONFIG para filtros avanzados
-- Fecha: 2026-02-08
-- Descripción: Agregar campos para filtros opcionales con operadores y nuevo tipo Totalizado
-- =============================================

USE Salvita;
GO

-- Agregar campo FiltroOperador
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TD_DASHBOARD_CONFIG') AND name = 'FiltroOperador')
BEGIN
    ALTER TABLE TD_DASHBOARD_CONFIG ADD [FiltroOperador] VARCHAR(10) NULL 
    CHECK ([FiltroOperador] IN ('=', '<>', '<', '>', '<=', '>=', 'LIKE'));
    PRINT 'Campo FiltroOperador agregado a TD_DASHBOARD_CONFIG';
END
GO

-- Agregar campo FiltroActivo
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TD_DASHBOARD_CONFIG') AND name = 'FiltroActivo')
BEGIN
    ALTER TABLE TD_DASHBOARD_CONFIG ADD [FiltroActivo] BIT NOT NULL DEFAULT 0;
    PRINT 'Campo FiltroActivo agregado a TD_DASHBOARD_CONFIG';
END
GO

-- Actualizar CHECK constraint de TipoVisualizacion para incluir Totalizado
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

-- Agregar nuevo CHECK constraint con Totalizado
ALTER TABLE TD_DASHBOARD_CONFIG 
ADD CONSTRAINT CK_TD_DASHBOARD_CONFIG_TipoVisualizacion 
CHECK ([TipoVisualizacion] IN ('Agrupamiento', 'DetalleFiltrado', 'Totalizado'));
PRINT 'Nuevo CHECK constraint agregado para TipoVisualizacion (incluye Totalizado)';
GO

PRINT 'Migración completada: Dashboard config actualizado para filtros avanzados';
GO
