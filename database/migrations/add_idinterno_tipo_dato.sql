-- Migración: Agregar tipo de dato 'IDInterno' al CHECK constraint de TD_CAMPOS
-- Fecha: 2026-04-16
-- Descripción: Permite usar el tipo 'IDInterno' para exponer el ID del registro con un nombre personalizado

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

-- Crear nuevo constraint con 'IDInterno' incluido
ALTER TABLE TD_CAMPOS
ADD CONSTRAINT CK_TD_CAMPOS_TipoDato 
CHECK ([TipoDato] IN ('Texto', 'Descripcion', 'Numero', 'Decimal', 'Fecha', 'FechaHora', 'Lista', 'Archivo', 'IDInterno'));

PRINT 'Constraint creado con tipo IDInterno incluido';
GO
