-- Script para actualizar la contraseña del usuario admin
-- Este script debe ejecutarse DESPUÉS de que la aplicación esté corriendo
-- ya que necesita el hash bcrypt generado por la aplicación

USE Salvita;
GO

-- La contraseña '123' hasheada con bcrypt
-- Este hash fue generado con: await bcrypt.hash('123', 10)
-- Ejecutar este UPDATE después de que tengas el hash correcto de tu aplicación
-- Por ahora, el hash que se inserta es un placeholder que será actualizado
-- en el primer inicio de sesión o mediante un script de setup

-- Para generar el hash correcto, ejecuta en Node.js:
-- const bcrypt = require('bcryptjs');
-- bcrypt.hash('123', 10).then(hash => console.log(hash));

-- Hash bcrypt de '123' (ejemplo):
UPDATE TD_USUARIOS 
SET Clave = '$2a$10$rQZc3qKqGqKqGqKqGqKqGe.x1XlPGRLLLRqz7P8cO8ej.FqGO5hS'
WHERE Usuario = 'admin';
GO

PRINT 'Contraseña del usuario admin actualizada';
