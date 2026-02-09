-- =====================================================
-- MIGRACIÓN: Ajustar permisos por relación padre-hijo
-- =====================================================
-- Problema: Permisos son por módulo, pero un módulo hijo puede 
-- tener múltiples padres y necesita permisos independientes por contexto
-- 
-- Solución: Agregar ModuloPadreId a TR_ROL_MODULO_PERMISO
-- =====================================================

USE salvita;
GO

-- 1. Verificar estructura actual de TR_ROL_MODULO_PERMISO
PRINT '=== ESTRUCTURA ACTUAL ===';
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'TR_ROL_MODULO_PERMISO'
ORDER BY ORDINAL_POSITION;
GO

-- 2. Agregar columna ModuloPadreId si no existe
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'[dbo].[TR_ROL_MODULO_PERMISO]') 
    AND name = 'ModuloPadreId'
)
BEGIN
    -- Agregar columna
    ALTER TABLE [dbo].[TR_ROL_MODULO_PERMISO]
    ADD [ModuloPadreId] INT NULL;
    
    PRINT '✓ Columna ModuloPadreId agregada a TR_ROL_MODULO_PERMISO';
    
    -- Agregar foreign key
    ALTER TABLE [dbo].[TR_ROL_MODULO_PERMISO]
    ADD CONSTRAINT FK_TR_ROL_MODULO_PERMISO_ModuloPadre
    FOREIGN KEY ([ModuloPadreId]) 
    REFERENCES [dbo].[TD_MODULOS]([Id]);
    
    PRINT '✓ Foreign key agregada';
    
    -- Crear índice para mejorar queries
    CREATE NONCLUSTERED INDEX IX_TR_ROL_MODULO_PERMISO_Padre_Hijo
    ON [dbo].[TR_ROL_MODULO_PERMISO] ([RolId], [ModuloPadreId], [ModuloId]);
    
    PRINT '✓ Índice creado';
END
ELSE
BEGIN
    PRINT '⚠ Columna ModuloPadreId ya existe';
END
GO

-- 3. Migrar datos existentes
-- Los permisos de módulos principales (sin padre) quedan con ModuloPadreId = NULL
-- Los permisos de módulos secundarios se deben duplicar para cada padre
PRINT '';
PRINT '=== DUPLICANDO PERMISOS PARA MÓDULOS CON MÚLTIPLES PADRES ===';

-- Encontrar módulos hijos que tienen múltiples padres
DECLARE @moduloHijoId INT;
DECLARE @cantidadPadres INT;

DECLARE modulos_cursor CURSOR FOR
SELECT 
    ModuloHijoId,
    COUNT(DISTINCT ModuloPadreId) as CantidadPadres
FROM TR_MODULO_RELACION
GROUP BY ModuloHijoId
HAVING COUNT(DISTINCT ModuloPadreId) > 1;

OPEN modulos_cursor;
FETCH NEXT FROM modulos_cursor INTO @moduloHijoId, @cantidadPadres;

WHILE @@FETCH_STATUS = 0
BEGIN
    DECLARE @nombreModulo NVARCHAR(200);
    SELECT @nombreModulo = Nombre FROM TD_MODULOS WHERE Id = @moduloHijoId;
    
    PRINT 'Procesando módulo: ' + @nombreModulo + ' (tiene ' + CAST(@cantidadPadres AS VARCHAR) + ' padres)';
    
    -- Para cada relación padre-hijo, crear un permiso específico
    DECLARE @moduloPadreId INT;
    DECLARE @rolId INT;
    
    DECLARE relaciones_cursor CURSOR FOR
    SELECT DISTINCT ModuloPadreId FROM TR_MODULO_RELACION WHERE ModuloHijoId = @moduloHijoId;
    
    OPEN relaciones_cursor;
    FETCH NEXT FROM relaciones_cursor INTO @moduloPadreId;
    
    WHILE @@FETCH_STATUS = 0
    BEGIN
        -- Para cada rol que tiene permisos sobre este módulo hijo
        DECLARE permisos_cursor CURSOR FOR
        SELECT RolId FROM TR_ROL_MODULO_PERMISO 
        WHERE ModuloId = @moduloHijoId AND ModuloPadreId IS NULL;
        
        OPEN permisos_cursor;
        FETCH NEXT FROM permisos_cursor INTO @rolId;
        
        WHILE @@FETCH_STATUS = 0
        BEGIN
            -- Verificar que no exista ya el permiso específico
            IF NOT EXISTS (
                SELECT 1 FROM TR_ROL_MODULO_PERMISO 
                WHERE RolId = @rolId 
                  AND ModuloPadreId = @moduloPadreId 
                  AND ModuloId = @moduloHijoId
            )
            BEGIN
                -- Duplicar el permiso con el ModuloPadreId específico
                INSERT INTO TR_ROL_MODULO_PERMISO 
                    (RolId, ModuloPadreId, ModuloId, PermisoAgregar, PermisoModificar, 
                     PermisoEliminar, PermisoVer, PermisoVerAgrupado, UsuarioAsignacion)
                SELECT 
                    RolId, 
                    @moduloPadreId as ModuloPadreId,
                    ModuloId,
                    PermisoAgregar,
                    PermisoModificar,
                    PermisoEliminar,
                    PermisoVer,
                    PermisoVerAgrupado,
                    UsuarioAsignacion
                FROM TR_ROL_MODULO_PERMISO
                WHERE RolId = @rolId AND ModuloId = @moduloHijoId AND ModuloPadreId IS NULL;
                
                PRINT '  ✓ Permiso duplicado para padre: ' + CAST(@moduloPadreId AS VARCHAR);
            END
            
            FETCH NEXT FROM permisos_cursor INTO @rolId;
        END
        
        CLOSE permisos_cursor;
        DEALLOCATE permisos_cursor;
        
        FETCH NEXT FROM relaciones_cursor INTO @moduloPadreId;
    END
    
    CLOSE relaciones_cursor;
    DEALLOCATE relaciones_cursor;
    
    -- Eliminar los permisos genéricos (sin ModuloPadreId)
    DELETE FROM TR_ROL_MODULO_PERMISO 
    WHERE ModuloId = @moduloHijoId AND ModuloPadreId IS NULL;
    
    PRINT '  ✓ Permisos genéricos eliminados';
    
    FETCH NEXT FROM modulos_cursor INTO @moduloHijoId, @cantidadPadres;
END

CLOSE modulos_cursor;
DEALLOCATE modulos_cursor;

PRINT '';
PRINT '=== MIGRACIÓN COMPLETADA ===';
PRINT 'Ahora los permisos son específicos por relación padre-hijo';
GO

-- 4. Mostrar estructura actualizada
PRINT '';
PRINT '=== ESTRUCTURA ACTUALIZADA ===';
SELECT 
    r.Nombre as Rol,
    mp.Nombre as ModuloPadre,
    mh.Nombre as ModuloHijo,
    p.PermisoVer,
    p.PermisoVerAgrupado,
    p.PermisoAgregar,
    p.PermisoModificar,
    p.PermisoEliminar
FROM TR_ROL_MODULO_PERMISO p
INNER JOIN TD_ROLES r ON p.RolId = r.Id
LEFT JOIN TD_MODULOS mp ON p.ModuloPadreId = mp.Id
INNER JOIN TD_MODULOS mh ON p.ModuloId = mh.Id
WHERE mh.Nombre LIKE '%v4'
ORDER BY r.Nombre, mp.Nombre, mh.Nombre;
GO
