-- Agregar permiso para ver Trazas en TR_ROL_MODULO_PERMISO
USE Salvita;
GO

-- Obtener el ID del módulo de Trazas
DECLARE @TrazasModuloId INT;
SELECT @TrazasModuloId = Id FROM TD_MODULOS WHERE Nombre = 'Trazas' AND Tipo = 'Independiente';

IF @TrazasModuloId IS NOT NULL
BEGIN
    PRINT 'Módulo de Trazas encontrado con ID: ' + CAST(@TrazasModuloId AS VARCHAR);
    
    -- Mostrar todos los roles que NO tienen permiso para Trazas
    SELECT r.Id, r.Nombre
    FROM TD_ROLES r
    WHERE r.Estado = 'Activo'
    AND r.Id NOT IN (
        SELECT RolId 
        FROM TR_ROL_MODULO_PERMISO 
        WHERE ModuloId = @TrazasModuloId
    );
    
    PRINT 'Los roles listados arriba pueden ser configurados para acceder a Trazas desde la pantalla de Roles.';
END
ELSE
BEGIN
    PRINT 'No se encontró el módulo de Trazas. Ejecute primero el script add_trazas_module.sql';
END
GO
