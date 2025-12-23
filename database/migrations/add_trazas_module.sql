-- Agregar módulo de Consultas (Trazas de Auditoría)
USE Salvita;
GO

-- Verificar si ya existe el módulo de Trazas
IF NOT EXISTS (SELECT Id FROM TD_MODULOS WHERE Nombre = 'Trazas' AND Tipo = 'Independiente')
BEGIN
    -- Insertar el módulo de Trazas
    INSERT INTO TD_MODULOS (Nombre, Tipo, Icono, Orden, Estado, NombreTabla, FechaCreacion, UsuarioCreacion)
    VALUES ('Trazas', 'Independiente', 'FileText', 50, 'Activo', 'TD_TRAZAS', GETDATE(), 'Sistema');

    DECLARE @TrazasModuloId INT = SCOPE_IDENTITY();

    PRINT 'Módulo de Trazas creado con ID: ' + CAST(@TrazasModuloId AS VARCHAR);

    -- Obtener el rol de Administrador
    DECLARE @AdminRolId INT;
    SELECT @AdminRolId = Id FROM TD_ROLES WHERE Nombre = 'Administrador';

    -- Asignar permisos al rol de Administrador
    IF @AdminRolId IS NOT NULL
    BEGIN
        INSERT INTO TR_ROL_MODULO_PERMISO 
            (RolId, ModuloId, PermisoVer, PermisoVerAgrupado, PermisoAgregar, PermisoModificar, PermisoEliminar)
        VALUES 
            (@AdminRolId, @TrazasModuloId, 1, 0, 0, 0, 0);

        PRINT 'Permisos asignados al rol Administrador para el módulo Trazas';
    END
    ELSE
    BEGIN
        PRINT 'No se encontró el rol Administrador';
    END
END
ELSE
BEGIN
    PRINT 'El módulo de Trazas ya existe';
END
GO
