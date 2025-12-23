-- Agregar parámetro para descripción del login
IF NOT EXISTS (SELECT 1 FROM TD_PARAMETROS WHERE Parametro = 'Descripcion Login')
BEGIN
    INSERT INTO TD_PARAMETROS (Parametro, Valor, FechaCreacion)
    VALUES ('Descripcion Login', 'Sistema de Gestión para Geriátrico', GETDATE());
END
GO
