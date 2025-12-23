-- Agregar parámetro para URL de modificación de documentos en el gestor documental
IF NOT EXISTS (SELECT 1 FROM TD_PARAMETROS WHERE Parametro = 'URL BASE Modificar Documento')
BEGIN
    INSERT INTO TD_PARAMETROS (Parametro, Valor)
    VALUES ('URL BASE Modificar Documento', 'http://172.16.16.60:8093/documents');
    PRINT 'Parámetro URL BASE Modificar Documento agregado exitosamente';
END
ELSE
BEGIN
    PRINT 'El parámetro URL BASE Modificar Documento ya existe';
END
GO
