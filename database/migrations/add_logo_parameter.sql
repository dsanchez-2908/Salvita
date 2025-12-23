-- Agregar parámetro para logo del sistema
IF NOT EXISTS (SELECT 1 FROM TD_PARAMETROS WHERE Parametro = 'Logo Sistema')
BEGIN
    INSERT INTO TD_PARAMETROS (Parametro, Valor, FechaCreacion)
    VALUES ('Logo Sistema', '', GETDATE());
END
GO
