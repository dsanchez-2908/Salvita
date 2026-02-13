-- Migración: Agregar tipo de dato 'Decimal' al CHECK constraint de TD_CAMPOS
-- Fecha: 2026-02-12
-- Descripción: Permite usar el tipo 'Decimal' en los campos de módulos

USE salvita;
GO

-- Obtener el nombre del constraint CHECK existente
DECLARE @ConstraintName NVARCHAR(200);
SELECT @ConstraintName = name 
FROM sys.check_constraints 
WHERE parent_object_id = OBJECT_ID('TD_CAMPOS') 
  AND COL_NAME(parent_object_id, parent_column_id) = 'TipoDato';

-- Eliminar el constraint existente
IF @ConstraintName IS NOT NULL
BEGIN
    DECLARE @SQL NVARCHAR(500);
    SET @SQL = 'ALTER TABLE TD_CAMPOS DROP CONSTRAINT ' + @ConstraintName;
    EXEC sp_executesql @SQL;
    PRINT 'Constraint eliminado: ' + @ConstraintName;
END

-- Crear nuevo constraint con 'Decimal' incluido
ALTER TABLE TD_CAMPOS
ADD CONSTRAINT CK_TD_CAMPOS_TipoDato 
CHECK ([TipoDato] IN ('Texto', 'Descripcion', 'Numero', 'Decimal', 'Fecha', 'FechaHora', 'Lista', 'Archivo'));

PRINT 'Constraint creado con tipo Decimal incluido';
GO
