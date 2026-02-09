-- =============================================
-- Migración: Agregar soporte para listas dinámicas
-- Descripción: Permite crear listas que obtienen valores de módulos o APIs
-- Fecha: 2026-02-08
-- =============================================

USE Salvita;
GO

-- Agregar campos a TD_LISTAS para listas dinámicas
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TD_LISTAS') AND name = 'TipoLista')
BEGIN
    ALTER TABLE TD_LISTAS ADD [TipoLista] VARCHAR(20) NOT NULL DEFAULT 'ValoresFijos' 
    CHECK ([TipoLista] IN ('ValoresFijos', 'ValoresModulo', 'ValoresAPI'));
    PRINT 'Campo TipoLista agregado a TD_LISTAS';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TD_LISTAS') AND name = 'ModuloOrigenId')
BEGIN
    ALTER TABLE TD_LISTAS ADD [ModuloOrigenId] INT NULL;
    PRINT 'Campo ModuloOrigenId agregado a TD_LISTAS';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TD_LISTAS') AND name = 'CampoValorId')
BEGIN
    ALTER TABLE TD_LISTAS ADD [CampoValorId] INT NULL;
    PRINT 'Campo CampoValorId agregado a TD_LISTAS';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TD_LISTAS') AND name = 'FiltroActivo')
BEGIN
    ALTER TABLE TD_LISTAS ADD [FiltroActivo] BIT NOT NULL DEFAULT 0;
    PRINT 'Campo FiltroActivo agregado a TD_LISTAS';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TD_LISTAS') AND name = 'FiltroCampoId')
BEGIN
    ALTER TABLE TD_LISTAS ADD [FiltroCampoId] INT NULL;
    PRINT 'Campo FiltroCampoId agregado a TD_LISTAS';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TD_LISTAS') AND name = 'FiltroOperador')
BEGIN
    ALTER TABLE TD_LISTAS ADD [FiltroOperador] VARCHAR(10) NULL 
    CHECK ([FiltroOperador] IN ('=', '<>', '<', '>', '<=', '>=', 'LIKE'));
    PRINT 'Campo FiltroOperador agregado a TD_LISTAS';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TD_LISTAS') AND name = 'FiltroValor')
BEGIN
    ALTER TABLE TD_LISTAS ADD [FiltroValor] VARCHAR(250) NULL;
    PRINT 'Campo FiltroValor agregado a TD_LISTAS';
END
GO

-- Agregar Foreign Keys
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_TD_LISTAS_ModuloOrigen')
BEGIN
    ALTER TABLE TD_LISTAS 
    ADD CONSTRAINT FK_TD_LISTAS_ModuloOrigen 
    FOREIGN KEY (ModuloOrigenId) REFERENCES TD_MODULOS(Id) ON DELETE SET NULL;
    PRINT 'Foreign Key FK_TD_LISTAS_ModuloOrigen agregada';
END
GO

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_TD_LISTAS_CampoValor')
BEGIN
    ALTER TABLE TD_LISTAS 
    ADD CONSTRAINT FK_TD_LISTAS_CampoValor 
    FOREIGN KEY (CampoValorId) REFERENCES TD_CAMPOS(Id) ON DELETE NO ACTION;
    PRINT 'Foreign Key FK_TD_LISTAS_CampoValor agregada';
END
GO

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_TD_LISTAS_FiltroCampo')
BEGIN
    ALTER TABLE TD_LISTAS 
    ADD CONSTRAINT FK_TD_LISTAS_FiltroCampo 
    FOREIGN KEY (FiltroCampoId) REFERENCES TD_CAMPOS(Id) ON DELETE NO ACTION;
    PRINT 'Foreign Key FK_TD_LISTAS_FiltroCampo agregada';
END
GO

PRINT 'Migración completada: Listas dinámicas configuradas correctamente';
GO
