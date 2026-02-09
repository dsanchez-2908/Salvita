-- =====================================================
-- MIGRACIÓN: Arreglar sistema de relaciones entre registros de módulos
-- =====================================================
-- Problema: Las columnas FK directas (ej: TD_MODULO_Alumnosv3_Id) 
-- no permiten que un módulo hijo tenga múltiples padres
-- 
-- Solución: Tabla intermedia TR_MODULO_REGISTRO_RELACION
-- =====================================================

USE salvita;
GO

-- 1. Crear tabla de relaciones entre registros de módulos
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TR_MODULO_REGISTRO_RELACION]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[TR_MODULO_REGISTRO_RELACION](
        [Id] [int] IDENTITY(1,1) NOT NULL,
        [ModuloPadreId] [int] NOT NULL,           -- ID del módulo padre (de TR_MODULO/TD_MODULOS)
        [RegistroPadreId] [int] NOT NULL,         -- ID del registro padre
        [ModuloHijoId] [int] NOT NULL,            -- ID del módulo hijo (de TR_MODULO/TD_MODULOS)
        [RegistroHijoId] [int] NOT NULL,          -- ID del registro hijo
        [FechaCreacion] [datetime] NULL DEFAULT GETDATE(),
        [UsuarioCreacion] [varchar](100) NULL,
        CONSTRAINT [PK_TR_MODULO_REGISTRO_RELACION] PRIMARY KEY CLUSTERED ([Id] ASC)
    ) ON [PRIMARY];

    -- Índices para mejorar performance
    CREATE NONCLUSTERED INDEX [IX_ModuloPadre_RegistroPadre] 
    ON [dbo].[TR_MODULO_REGISTRO_RELACION] ([ModuloPadreId], [RegistroPadreId]);
    
    CREATE NONCLUSTERED INDEX [IX_ModuloHijo_RegistroHijo] 
    ON [dbo].[TR_MODULO_REGISTRO_RELACION] ([ModuloHijoId], [RegistroHijoId]);

    PRINT '✓ Tabla TR_MODULO_REGISTRO_RELACION creada';
END
ELSE
BEGIN
    PRINT '⚠ Tabla TR_MODULO_REGISTRO_RELACION ya existe';
END
GO

-- 2. Migrar datos existentes de las columnas FK a la tabla de relaciones
-- Buscar todas las columnas que terminan en _Id en tablas TD_MODULO_*
DECLARE @sql NVARCHAR(MAX) = '';
DECLARE @tableName NVARCHAR(128);
DECLARE @columnName NVARCHAR(128);
DECLARE @moduloPadreNombre NVARCHAR(128);
DECLARE @moduloHijoNombre NVARCHAR(128);

PRINT '';
PRINT '=== MIGRANDO RELACIONES EXISTENTES ===';

DECLARE column_cursor CURSOR FOR
SELECT 
    t.TABLE_NAME,
    c.COLUMN_NAME,
    REPLACE(c.COLUMN_NAME, '_Id', '') as ModuloPadreNombre
FROM INFORMATION_SCHEMA.COLUMNS c
INNER JOIN INFORMATION_SCHEMA.TABLES t ON c.TABLE_NAME = t.TABLE_NAME
WHERE t.TABLE_NAME LIKE 'TD_MODULO_%'
  AND c.COLUMN_NAME LIKE 'TD_MODULO_%_Id'
  AND c.COLUMN_NAME NOT IN ('Id')
ORDER BY t.TABLE_NAME, c.COLUMN_NAME;

OPEN column_cursor;
FETCH NEXT FROM column_cursor INTO @tableName, @columnName, @moduloPadreNombre;

WHILE @@FETCH_STATUS = 0
BEGIN
    -- Obtener nombre del módulo hijo (quitar TD_MODULO_ y versión)
    SET @moduloHijoNombre = REPLACE(@tableName, 'TD_MODULO_', '');
    
    -- Construir y ejecutar INSERT para migrar datos existentes
    SET @sql = '
    INSERT INTO TR_MODULO_REGISTRO_RELACION 
        (ModuloPadreId, RegistroPadreId, ModuloHijoId, RegistroHijoId, FechaCreacion)
    SELECT 
        mp.Id as ModuloPadreId,
        hijo.[' + @columnName + '] as RegistroPadreId,
        mh.Id as ModuloHijoId,
        hijo.Id as RegistroHijoId,
        hijo.FechaCreacion
    FROM [' + @tableName + '] hijo
    CROSS JOIN TD_MODULOS mp
    CROSS JOIN TD_MODULOS mh
    WHERE hijo.[' + @columnName + '] IS NOT NULL
      AND mp.NombreTabla = ''' + @moduloPadreNombre + '''
      AND mh.NombreTabla = ''' + @tableName + '''
      AND NOT EXISTS (
          SELECT 1 FROM TR_MODULO_REGISTRO_RELACION r
          WHERE r.ModuloPadreId = mp.Id
            AND r.RegistroPadreId = hijo.[' + @columnName + ']
            AND r.ModuloHijoId = mh.Id
            AND r.RegistroHijoId = hijo.Id
      );';
    
    BEGIN TRY
        EXEC sp_executesql @sql;
        PRINT '✓ Migrados registros de ' + @tableName + '.' + @columnName;
    END TRY
    BEGIN CATCH
        PRINT '⚠ Error migrando ' + @tableName + '.' + @columnName + ': ' + ERROR_MESSAGE();
    END CATCH
    
    FETCH NEXT FROM column_cursor INTO @tableName, @columnName, @moduloPadreNombre;
END

CLOSE column_cursor;
DEALLOCATE column_cursor;

PRINT '';
PRINT '=== MIGRACIÓN COMPLETADA ===';
GO

-- 3. Verificación de datos migrados
SELECT 
    mp.Nombre as ModuloPadre,
    r.RegistroPadreId,
    mh.Nombre as ModuloHijo,
    r.RegistroHijoId,
    r.FechaCreacion
FROM TR_MODULO_REGISTRO_RELACION r
INNER JOIN TD_MODULOS mp ON r.ModuloPadreId = mp.Id
INNER JOIN TD_MODULOS mh ON r.ModuloHijoId = mh.Id
ORDER BY r.FechaCreacion DESC;

PRINT '';
PRINT '=== SIGUIENTE PASO ===';
PRINT 'Después de verificar que los datos se migraron correctamente,';
PRINT 'ejecutar el script: remove_old_fk_columns.sql';
PRINT 'para eliminar las columnas FK antiguas de las tablas.';
GO
