-- =============================================
-- Migración: Sistema de Tareas y Workflow
-- Descripción: Implementa el sistema completo de gestión de tareas
-- Fecha: 2026-02-24
-- =============================================

USE Salvita;
GO

PRINT '=============================================';
PRINT 'Iniciando migración: Sistema de Tareas';
PRINT '=============================================';
GO

-- =============================================
-- 1. TABLA: TD_BANDEJAS
-- Descripción: Bandejas grupales que pueden ver uno o más usuarios
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TD_BANDEJAS]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[TD_BANDEJAS] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [Nombre] VARCHAR(100) NOT NULL,
        [Descripcion] VARCHAR(500),
        [Estado] VARCHAR(20) DEFAULT 'Activa' CHECK ([Estado] IN ('Activa', 'Inactiva')),
        [FechaCreacion] DATETIME DEFAULT GETDATE(),
        [FechaModificacion] DATETIME DEFAULT GETDATE(),
        [UsuarioCreacion] VARCHAR(100),
        [UsuarioModificacion] VARCHAR(100)
    );
    
    PRINT '✓ Tabla TD_BANDEJAS creada';
END
ELSE
BEGIN
    PRINT '⚠ Tabla TD_BANDEJAS ya existe';
END
GO

-- =============================================
-- 2. TABLA: TR_BANDEJA_USUARIO
-- Descripción: Relación N:N entre bandejas y usuarios
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TR_BANDEJA_USUARIO]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[TR_BANDEJA_USUARIO] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [BandejaId] INT NOT NULL,
        [UsuarioId] INT NOT NULL,
        [FechaAsignacion] DATETIME DEFAULT GETDATE(),
        [UsuarioAsignacion] VARCHAR(100),
        
        CONSTRAINT FK_TR_BANDEJA_USUARIO_Bandeja 
            FOREIGN KEY ([BandejaId]) 
            REFERENCES [dbo].[TD_BANDEJAS]([Id]) 
            ON DELETE CASCADE,
            
        CONSTRAINT FK_TR_BANDEJA_USUARIO_Usuario 
            FOREIGN KEY ([UsuarioId]) 
            REFERENCES [dbo].[TD_USUARIOS]([Id]) 
            ON DELETE CASCADE,
            
        CONSTRAINT UQ_Bandeja_Usuario 
            UNIQUE ([BandejaId], [UsuarioId])
    );
    
    CREATE INDEX IX_TR_BANDEJA_USUARIO_Usuario 
        ON [dbo].[TR_BANDEJA_USUARIO]([UsuarioId]);
    
    PRINT '✓ Tabla TR_BANDEJA_USUARIO creada';
END
ELSE
BEGIN
    PRINT '⚠ Tabla TR_BANDEJA_USUARIO ya existe';
END
GO

-- =============================================
-- 3. TABLA: TR_BANDEJA_ROL
-- Descripción: Relación N:N entre bandejas y roles
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TR_BANDEJA_ROL]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[TR_BANDEJA_ROL] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [BandejaId] INT NOT NULL,
        [RolId] INT NOT NULL,
        [FechaAsignacion] DATETIME DEFAULT GETDATE(),
        [UsuarioAsignacion] VARCHAR(100),
        
        CONSTRAINT FK_TR_BANDEJA_ROL_Bandeja 
            FOREIGN KEY ([BandejaId]) 
            REFERENCES [dbo].[TD_BANDEJAS]([Id]) 
            ON DELETE CASCADE,
            
        CONSTRAINT FK_TR_BANDEJA_ROL_Rol 
            FOREIGN KEY ([RolId]) 
            REFERENCES [dbo].[TD_ROLES]([Id]) 
            ON DELETE CASCADE,
            
        CONSTRAINT UQ_Bandeja_Rol 
            UNIQUE ([BandejaId], [RolId])
    );
    
    CREATE INDEX IX_TR_BANDEJA_ROL_Rol 
        ON [dbo].[TR_BANDEJA_ROL]([RolId]);
    
    PRINT '✓ Tabla TR_BANDEJA_ROL creada';
END
ELSE
BEGIN
    PRINT '⚠ Tabla TR_BANDEJA_ROL ya existe';
END
GO

-- =============================================
-- 4. TABLA: TD_PLANTILLA_TAREAS
-- Descripción: Plantillas/Tipos de tareas disponibles
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TD_PLANTILLA_TAREAS]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[TD_PLANTILLA_TAREAS] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [Nombre] VARCHAR(100) NOT NULL,
        [Indicaciones] VARCHAR(MAX),
        [Estado] VARCHAR(20) DEFAULT 'Activo' CHECK ([Estado] IN ('Activo', 'Inactivo')),
        [FechaCreacion] DATETIME DEFAULT GETDATE(),
        [FechaModificacion] DATETIME DEFAULT GETDATE(),
        [UsuarioCreacion] VARCHAR(100),
        [UsuarioModificacion] VARCHAR(100)
    );
    
    PRINT '✓ Tabla TD_PLANTILLA_TAREAS creada';
END
ELSE
BEGIN
    PRINT '⚠ Tabla TD_PLANTILLA_TAREAS ya existe';
END
GO

-- =============================================
-- 5. TABLA: TD_TAREAS
-- Descripción: Tareas creadas en el sistema
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TD_TAREAS]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[TD_TAREAS] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [PlantillaTareaId] INT NOT NULL,
        [Observaciones] VARCHAR(MAX),
        [FechaCreacion] DATETIME DEFAULT GETDATE(),
        [FechaVencimiento] DATETIME NULL,
        [Estado] VARCHAR(20) DEFAULT 'Pendiente' CHECK ([Estado] IN ('Pendiente', 'Tomada', 'Finalizada', 'Rechazada')),
        
        -- Asignación: puede ser a Usuario o a Bandeja
        [TipoAsignacion] VARCHAR(20) NOT NULL CHECK ([TipoAsignacion] IN ('Usuario', 'Bandeja')),
        [UsuarioAsignadoId] INT NULL,
        [BandejaAsignadaId] INT NULL,
        
        -- Usuario que tomó la tarea (solo para bandejas grupales)
        [UsuarioTomadaPorId] INT NULL,
        [FechaTomada] DATETIME NULL,
        
        -- Auditoría
        [UsuarioCreacion] VARCHAR(100),
        [FechaFinalizacion] DATETIME NULL,
        [FechaRechazo] DATETIME NULL,
        
        CONSTRAINT FK_TD_TAREAS_PlantillaTarea 
            FOREIGN KEY ([PlantillaTareaId]) 
            REFERENCES [dbo].[TD_PLANTILLA_TAREAS]([Id]),
            
        CONSTRAINT FK_TD_TAREAS_UsuarioAsignado 
            FOREIGN KEY ([UsuarioAsignadoId]) 
            REFERENCES [dbo].[TD_USUARIOS]([Id]),
            
        CONSTRAINT FK_TD_TAREAS_BandejaAsignada 
            FOREIGN KEY ([BandejaAsignadaId]) 
            REFERENCES [dbo].[TD_BANDEJAS]([Id]),
            
        CONSTRAINT FK_TD_TAREAS_UsuarioTomadaPor 
            FOREIGN KEY ([UsuarioTomadaPorId]) 
            REFERENCES [dbo].[TD_USUARIOS]([Id]),
            
        -- Validación: debe tener Usuario O Bandeja, no ambos ni ninguno
        CONSTRAINT CHK_Asignacion_Valida 
            CHECK (
                ([TipoAsignacion] = 'Usuario' AND [UsuarioAsignadoId] IS NOT NULL AND [BandejaAsignadaId] IS NULL) OR
                ([TipoAsignacion] = 'Bandeja' AND [BandejaAsignadaId] IS NOT NULL AND [UsuarioAsignadoId] IS NULL)
            )
    );
    
    CREATE INDEX IX_TD_TAREAS_Estado 
        ON [dbo].[TD_TAREAS]([Estado]);
    
    CREATE INDEX IX_TD_TAREAS_UsuarioAsignado 
        ON [dbo].[TD_TAREAS]([UsuarioAsignadoId]);
    
    CREATE INDEX IX_TD_TAREAS_BandejaAsignada 
        ON [dbo].[TD_TAREAS]([BandejaAsignadaId]);
    
    CREATE INDEX IX_TD_TAREAS_FechaCreacion 
        ON [dbo].[TD_TAREAS]([FechaCreacion]);
    
    PRINT '✓ Tabla TD_TAREAS creada';
END
ELSE
BEGIN
    PRINT '⚠ Tabla TD_TAREAS ya existe';
END
GO

-- =============================================
-- 6. TABLA: TR_TAREA_REGISTRO
-- Descripción: Registros de módulos asociados a una tarea
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TR_TAREA_REGISTRO]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[TR_TAREA_REGISTRO] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [TareaId] INT NOT NULL,
        [ModuloId] INT NOT NULL,
        [RegistroId] INT NOT NULL,
        [Estado] VARCHAR(20) DEFAULT 'Pendiente' CHECK ([Estado] IN ('Pendiente', 'Finalizada', 'Rechazada')),
        [Observaciones] VARCHAR(MAX),
        [FechaCreacion] DATETIME DEFAULT GETDATE(),
        [FechaFinalizacion] DATETIME NULL,
        
        CONSTRAINT FK_TR_TAREA_REGISTRO_Tarea 
            FOREIGN KEY ([TareaId]) 
            REFERENCES [dbo].[TD_TAREAS]([Id]) 
            ON DELETE CASCADE,
            
        CONSTRAINT FK_TR_TAREA_REGISTRO_Modulo 
            FOREIGN KEY ([ModuloId]) 
            REFERENCES [dbo].[TD_MODULOS]([Id])
    );
    
    CREATE INDEX IX_TR_TAREA_REGISTRO_Tarea 
        ON [dbo].[TR_TAREA_REGISTRO]([TareaId]);
    
    CREATE INDEX IX_TR_TAREA_REGISTRO_Modulo_Registro 
        ON [dbo].[TR_TAREA_REGISTRO]([ModuloId], [RegistroId]);
    
    PRINT '✓ Tabla TR_TAREA_REGISTRO creada';
END
ELSE
BEGIN
    PRINT '⚠ Tabla TR_TAREA_REGISTRO ya existe';
END
GO

-- =============================================
-- 7. TABLA: TD_TAREA_HISTORIAL
-- Descripción: Historial de acciones realizadas sobre tareas
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TD_TAREA_HISTORIAL]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[TD_TAREA_HISTORIAL] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [TareaId] INT NOT NULL,
        [UsuarioId] INT NOT NULL,
        [Usuario] VARCHAR(100) NOT NULL,
        [Accion] VARCHAR(50) NOT NULL CHECK ([Accion] IN ('Crear', 'Tomar', 'Finalizar', 'Rechazar', 'Reasignar', 'Comentar', 'ActualizarRegistro')),
        [Detalle] VARCHAR(MAX),
        [FechaHora] DATETIME DEFAULT GETDATE(),
        
        CONSTRAINT FK_TD_TAREA_HISTORIAL_Tarea 
            FOREIGN KEY ([TareaId]) 
            REFERENCES [dbo].[TD_TAREAS]([Id]) 
            ON DELETE CASCADE,
            
        CONSTRAINT FK_TD_TAREA_HISTORIAL_Usuario 
            FOREIGN KEY ([UsuarioId]) 
            REFERENCES [dbo].[TD_USUARIOS]([Id])
    );
    
    CREATE INDEX IX_TD_TAREA_HISTORIAL_Tarea 
        ON [dbo].[TD_TAREA_HISTORIAL]([TareaId]);
    
    CREATE INDEX IX_TD_TAREA_HISTORIAL_FechaHora 
        ON [dbo].[TD_TAREA_HISTORIAL]([FechaHora]);
    
    PRINT '✓ Tabla TD_TAREA_HISTORIAL creada';
END
ELSE
BEGIN
    PRINT '⚠ Tabla TD_TAREA_HISTORIAL ya existe';
END
GO

-- =============================================
-- 8. TABLA: TD_TAREA_COMENTARIOS
-- Descripción: Comentarios agregados a las tareas
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TD_TAREA_COMENTARIOS]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[TD_TAREA_COMENTARIOS] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [TareaId] INT NOT NULL,
        [UsuarioId] INT NOT NULL,
        [Usuario] VARCHAR(100) NOT NULL,
        [Comentario] VARCHAR(MAX) NOT NULL,
        [FechaHora] DATETIME DEFAULT GETDATE(),
        
        CONSTRAINT FK_TD_TAREA_COMENTARIOS_Tarea 
            FOREIGN KEY ([TareaId]) 
            REFERENCES [dbo].[TD_TAREAS]([Id]) 
            ON DELETE CASCADE,
            
        CONSTRAINT FK_TD_TAREA_COMENTARIOS_Usuario 
            FOREIGN KEY ([UsuarioId]) 
            REFERENCES [dbo].[TD_USUARIOS]([Id])
    );
    
    CREATE INDEX IX_TD_TAREA_COMENTARIOS_Tarea 
        ON [dbo].[TD_TAREA_COMENTARIOS]([TareaId]);
    
    CREATE INDEX IX_TD_TAREA_COMENTARIOS_FechaHora 
        ON [dbo].[TD_TAREA_COMENTARIOS]([FechaHora]);
    
    PRINT '✓ Tabla TD_TAREA_COMENTARIOS creada';
END
ELSE
BEGIN
    PRINT '⚠ Tabla TD_TAREA_COMENTARIOS ya existe';
END
GO

-- =============================================
-- 9. TABLA: TR_TAREA_TEMPORAL_REGISTROS
-- Descripción: Tabla temporal para selección de registros antes de crear tarea
-- NOTA: Se limpia después de crear tarea o al cerrar sesión
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TR_TAREA_TEMPORAL_REGISTROS]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[TR_TAREA_TEMPORAL_REGISTROS] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [UsuarioId] INT NOT NULL,
        [ModuloId] INT NOT NULL,
        [RegistroId] INT NOT NULL,
        [FechaAgregado] DATETIME DEFAULT GETDATE(),
        
        CONSTRAINT FK_TR_TAREA_TEMPORAL_REGISTROS_Usuario 
            FOREIGN KEY ([UsuarioId]) 
            REFERENCES [dbo].[TD_USUARIOS]([Id]) 
            ON DELETE CASCADE,
            
        CONSTRAINT FK_TR_TAREA_TEMPORAL_REGISTROS_Modulo 
            FOREIGN KEY ([ModuloId]) 
            REFERENCES [dbo].[TD_MODULOS]([Id]),
            
        CONSTRAINT UQ_Usuario_Modulo_Registro 
            UNIQUE ([UsuarioId], [ModuloId], [RegistroId])
    );
    
    CREATE INDEX IX_TR_TAREA_TEMPORAL_REGISTROS_Usuario 
        ON [dbo].[TR_TAREA_TEMPORAL_REGISTROS]([UsuarioId]);
    
    PRINT '✓ Tabla TR_TAREA_TEMPORAL_REGISTROS creada';
END
ELSE
BEGIN
    PRINT '⚠ Tabla TR_TAREA_TEMPORAL_REGISTROS ya existe';
END
GO

-- =============================================
-- 10. VISTA: VW_BANDEJAS_POR_USUARIO
-- Descripción: Vista para obtener todas las bandejas accesibles por un usuario
-- =============================================
IF EXISTS (SELECT * FROM sys.views WHERE name = 'VW_BANDEJAS_POR_USUARIO')
BEGIN
    DROP VIEW [dbo].[VW_BANDEJAS_POR_USUARIO];
    PRINT '⚠ Vista VW_BANDEJAS_POR_USUARIO eliminada para recrearla';
END
GO

CREATE VIEW [dbo].[VW_BANDEJAS_POR_USUARIO] AS
SELECT DISTINCT
    b.Id AS BandejaId,
    b.Nombre AS BandejaNombre,
    b.Descripcion AS BandejaDescripcion,
    b.Estado AS BandejaEstado,
    u.Id AS UsuarioId
FROM TD_BANDEJAS b
LEFT JOIN TR_BANDEJA_USUARIO bu ON b.Id = bu.BandejaId
LEFT JOIN TR_BANDEJA_ROL br ON b.Id = br.BandejaId
LEFT JOIN TR_USUARIO_ROL ur ON br.RolId = ur.RolId
LEFT JOIN TD_USUARIOS u ON (bu.UsuarioId = u.Id OR ur.UsuarioId = u.Id)
WHERE b.Estado = 'Activa' AND u.Id IS NOT NULL;
GO

PRINT '✓ Vista VW_BANDEJAS_POR_USUARIO creada';
GO

-- =============================================
-- 11. DATOS INICIALES (OPCIONAL)
-- =============================================
PRINT '';
PRINT '=== Datos iniciales ===';

-- Insertar plantilla de tarea de ejemplo (opcional)
IF NOT EXISTS (SELECT * FROM TD_PLANTILLA_TAREAS WHERE Nombre = 'Tarea General')
BEGIN
    INSERT INTO TD_PLANTILLA_TAREAS (Nombre, Indicaciones, Estado, UsuarioCreacion)
    VALUES ('Tarea General', 'Tarea de propósito general', 'Activo', 'Sistema');
    
    PRINT '✓ Plantilla de tarea "Tarea General" creada';
END
GO

PRINT '';
PRINT '=============================================';
PRINT 'Migración completada exitosamente';
PRINT '=============================================';
PRINT '';
PRINT 'RESUMEN:';
PRINT '- TD_BANDEJAS: Bandejas grupales';
PRINT '- TR_BANDEJA_USUARIO: Relación Bandeja-Usuario';
PRINT '- TR_BANDEJA_ROL: Relación Bandeja-Rol';
PRINT '- TD_PLANTILLA_TAREAS: Templates de tareas';
PRINT '- TD_TAREAS: Tareas creadas';
PRINT '- TR_TAREA_REGISTRO: Registros asociados a tareas';
PRINT '- TD_TAREA_HISTORIAL: Historial de acciones';
PRINT '- TD_TAREA_COMENTARIOS: Comentarios de tareas';
PRINT '- TR_TAREA_TEMPORAL_REGISTROS: Selección temporal';
PRINT '- VW_BANDEJAS_POR_USUARIO: Vista de bandejas por usuario';
PRINT '';
GO
