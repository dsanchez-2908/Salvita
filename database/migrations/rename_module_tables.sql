-- Migración: Renombrar tablas de módulos con nueva nomenclatura
-- TD_MODULO_I_[Nombre] para módulos Principales
-- TD_MODULO_II_[Nombre] para módulos Secundarios
-- TD_MODULO_[Nombre] para módulos Independientes

USE Salvita;
GO

-- Renombrar tablas de módulos según su tipo
DECLARE @ModuloId INT;
DECLARE @Tipo VARCHAR(20);
DECLARE @NombreTablaActual VARCHAR(255);
DECLARE @NombreTablaDetalle VARCHAR(255);
DECLARE @NombreTablaIdeal VARCHAR(255);
DECLARE @Prefijo VARCHAR(20);
DECLARE @SQL NVARCHAR(MAX);

DECLARE modulo_cursor CURSOR FOR
SELECT Id, Tipo, NombreTabla
FROM TD_MODULOS
WHERE Estado = 'Activo';

OPEN modulo_cursor;
FETCH NEXT FROM modulo_cursor INTO @ModuloId, @Tipo, @NombreTablaActual;

WHILE @@FETCH_STATUS = 0
BEGIN
    -- Determinar prefijo según tipo
    SET @Prefijo = CASE 
        WHEN @Tipo = 'Principal' THEN 'TD_MODULO_I_'
        WHEN @Tipo = 'Secundario' THEN 'TD_MODULO_II_'
        WHEN @Tipo = 'Independiente' THEN 'TD_MODULO_'
        ELSE 'TD_MODULO_'
    END;

    -- Extraer el nombre sin prefijo
    SET @NombreTablaDetalle = @NombreTablaActual;
    
    -- Quitar prefijos existentes
    IF LEFT(@NombreTablaActual, 14) = 'TD_MODULO_II_'
        SET @NombreTablaDetalle = SUBSTRING(@NombreTablaActual, 15, LEN(@NombreTablaActual));
    ELSE IF LEFT(@NombreTablaActual, 13) = 'TD_MODULO_I_'
        SET @NombreTablaDetalle = SUBSTRING(@NombreTablaActual, 14, LEN(@NombreTablaActual));
    ELSE IF LEFT(@NombreTablaActual, 10) = 'TD_MODULO_'
        SET @NombreTablaDetalle = SUBSTRING(@NombreTablaActual, 11, LEN(@NombreTablaActual));
    
    -- Construir nombre ideal
    SET @NombreTablaIdeal = @Prefijo + @NombreTablaDetalle;

    -- Si el nombre actual no coincide con el ideal, renombrar
    IF @NombreTablaActual <> @NombreTablaIdeal
    BEGIN
        -- Verificar que la tabla existe
        IF EXISTS (SELECT * FROM sys.tables WHERE name = @NombreTablaActual)
        BEGIN
            PRINT 'Renombrando: ' + @NombreTablaActual + ' -> ' + @NombreTablaIdeal;
            
            -- Renombrar tabla
            SET @SQL = 'EXEC sp_rename ''' + @NombreTablaActual + ''', ''' + @NombreTablaIdeal + '''';
            EXEC sp_executesql @SQL;
            
            -- Actualizar registro en TD_MODULOS
            UPDATE TD_MODULOS 
            SET NombreTabla = @NombreTablaIdeal
            WHERE Id = @ModuloId;
            
            PRINT 'Tabla renombrada exitosamente';
        END
        ELSE
        BEGIN
            PRINT 'ADVERTENCIA: Tabla ' + @NombreTablaActual + ' no existe en la base de datos';
        END
    END
    ELSE
    BEGIN
        PRINT 'Tabla ' + @NombreTablaActual + ' ya tiene el nombre correcto';
    END

    FETCH NEXT FROM modulo_cursor INTO @ModuloId, @Tipo, @NombreTablaActual;
END

CLOSE modulo_cursor;
DEALLOCATE modulo_cursor;

PRINT '';
PRINT 'Migración completada';
PRINT 'Resumen de tablas actuales:';
SELECT 
    Tipo,
    Nombre,
    NombreTabla,
    CASE 
        WHEN EXISTS (SELECT * FROM sys.tables WHERE name = NombreTabla) THEN 'Existe'
        ELSE 'NO EXISTE'
    END AS EstadoTabla
FROM TD_MODULOS
WHERE Estado = 'Activo'
ORDER BY Tipo, Nombre;

GO
