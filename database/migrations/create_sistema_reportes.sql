-- =============================================
-- Sistema de Reportes Dinámicos
-- Fecha: 8 de abril de 2026
-- Descripción: Creación de tablas para sistema de reportes dinámicos
-- =============================================

USE Salvita;
GO

-- =============================================
-- TABLA: TD_REPORTES
-- Descripción: Almacena los reportes dinámicos del sistema
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TD_REPORTES]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[TD_REPORTES] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [Nombre] VARCHAR(200) NOT NULL,
        [Tipo] VARCHAR(50) NOT NULL DEFAULT 'Query' CHECK ([Tipo] IN ('Query', 'StoreProcedure', 'API')),
        [Query] VARCHAR(MAX) NULL,
        [StoreProcedure] VARCHAR(200) NULL,
        [APIEndpoint] VARCHAR(500) NULL,
        [Estado] VARCHAR(20) DEFAULT 'Activo' CHECK ([Estado] IN ('Activo', 'Inactivo')),
        [Descripcion] VARCHAR(500) NULL,
        [FechaCreacion] DATETIME DEFAULT GETDATE(),
        [FechaModificacion] DATETIME DEFAULT GETDATE(),
        [UsuarioCreacion] VARCHAR(100),
        [UsuarioModificacion] VARCHAR(100)
    );

    PRINT 'Tabla TD_REPORTES creada exitosamente';
END
ELSE
BEGIN
    PRINT 'Tabla TD_REPORTES ya existe';
END
GO

-- =============================================
-- TABLA: TR_ROL_REPORTE
-- Descripción: Relación muchos a muchos entre roles y reportes
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TR_ROL_REPORTE]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[TR_ROL_REPORTE] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [RolId] INT NOT NULL,
        [ReporteId] INT NOT NULL,
        [FechaAsignacion] DATETIME DEFAULT GETDATE(),
        [UsuarioAsignacion] VARCHAR(100),
        CONSTRAINT FK_TR_ROL_REPORTE_Rol FOREIGN KEY ([RolId]) REFERENCES [dbo].[TD_ROLES]([Id]) ON DELETE CASCADE,
        CONSTRAINT FK_TR_ROL_REPORTE_Reporte FOREIGN KEY ([ReporteId]) REFERENCES [dbo].[TD_REPORTES]([Id]) ON DELETE CASCADE,
        CONSTRAINT UQ_TR_ROL_REPORTE UNIQUE ([RolId], [ReporteId])
    );

    PRINT 'Tabla TR_ROL_REPORTE creada exitosamente';
END
ELSE
BEGIN
    PRINT 'Tabla TR_ROL_REPORTE ya existe';
END
GO

-- =============================================
-- ÍNDICES
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_TD_REPORTES_Estado' AND object_id = OBJECT_ID('TD_REPORTES'))
BEGIN
    CREATE INDEX IX_TD_REPORTES_Estado ON TD_REPORTES(Estado);
    PRINT 'Índice IX_TD_REPORTES_Estado creado';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_TD_REPORTES_Tipo' AND object_id = OBJECT_ID('TD_REPORTES'))
BEGIN
    CREATE INDEX IX_TD_REPORTES_Tipo ON TD_REPORTES(Tipo);
    PRINT 'Índice IX_TD_REPORTES_Tipo creado';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_TR_ROL_REPORTE_RolId' AND object_id = OBJECT_ID('TR_ROL_REPORTE'))
BEGIN
    CREATE INDEX IX_TR_ROL_REPORTE_RolId ON TR_ROL_REPORTE(RolId);
    PRINT 'Índice IX_TR_ROL_REPORTE_RolId creado';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_TR_ROL_REPORTE_ReporteId' AND object_id = OBJECT_ID('TR_ROL_REPORTE'))
BEGIN
    CREATE INDEX IX_TR_ROL_REPORTE_ReporteId ON TR_ROL_REPORTE(ReporteId);
    PRINT 'Índice IX_TR_ROL_REPORTE_ReporteId creado';
END
GO

PRINT 'Migración de Sistema de Reportes completada exitosamente';
GO
