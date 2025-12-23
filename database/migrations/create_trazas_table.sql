-- Crear tabla de trazas/auditoría
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TD_TRAZAS')
BEGIN
    CREATE TABLE TD_TRAZAS (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        FechaHora DATETIME NOT NULL DEFAULT GETDATE(),
        UsuarioId INT NOT NULL,
        Usuario NVARCHAR(100) NOT NULL,
        Accion NVARCHAR(50) NOT NULL, -- 'Agregar', 'Modificar', 'Eliminar'
        Proceso NVARCHAR(100) NOT NULL, -- 'Roles', 'Usuarios', 'Módulos', 'Lista: Nombre', 'Módulo: Nombre'
        Detalle NVARCHAR(MAX) NOT NULL, -- Descripción detallada de lo que se hizo
        FOREIGN KEY (UsuarioId) REFERENCES TD_USUARIOS(Id)
    );
    
    CREATE INDEX IX_TD_TRAZAS_FechaHora ON TD_TRAZAS(FechaHora);
    CREATE INDEX IX_TD_TRAZAS_UsuarioId ON TD_TRAZAS(UsuarioId);
    CREATE INDEX IX_TD_TRAZAS_Proceso ON TD_TRAZAS(Proceso);
    
    PRINT 'Tabla TD_TRAZAS creada exitosamente';
END
ELSE
BEGIN
    PRINT 'La tabla TD_TRAZAS ya existe';
END
GO
