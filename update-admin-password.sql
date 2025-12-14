UPDATE TD_USUARIOS 
SET Clave = '$2a$10$4b1xADp290IYY7Ak5WNE0eEn1piGJtElEJ10GeRVHp5rAoqF0ewc6' 
WHERE Usuario = 'admin';

SELECT Id, Usuario, Clave 
FROM TD_USUARIOS 
WHERE Usuario = 'admin';
