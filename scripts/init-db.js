/**
 * Script de inicialización de la base de datos
 * Ejecutar con: node scripts/init-db.js
 * 
 * Este script:
 * 1. Crea el usuario admin con la contraseña hasheada correctamente
 * 2. Verifica la conexión a la base de datos
 */

const bcrypt = require('bcryptjs');
const sql = require('mssql');
require('dotenv').config({ path: '.env.local' });

const config = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'Salvita',
  // Si DB_USER está vacío, usar autenticación de Windows
  ...(process.env.DB_USER ? {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  } : {}),
  options: {
    ...((process.env.DB_USER ? {} : { trustedConnection: true })),
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    enableArithAbort: true,
    instanceName: 'SQLEXPRESS'
  },
};

async function initDatabase() {
  try {
    console.log('Conectando a la base de datos...');
    const pool = await sql.connect(config);
    console.log('Conexión exitosa!');

    // Generar hash de la contraseña '123'
    console.log('Generando hash para la contraseña...');
    const hashedPassword = await bcrypt.hash('123', 10);
    console.log('Hash generado:', hashedPassword);

    // Actualizar la contraseña del usuario admin
    console.log('Actualizando contraseña del usuario admin...');
    await pool.request()
      .input('clave', sql.VarChar, hashedPassword)
      .query(`UPDATE TD_USUARIOS SET Clave = @clave WHERE Usuario = 'admin'`);

    console.log('✓ Usuario admin actualizado correctamente');
    console.log('');
    console.log('Credenciales de acceso:');
    console.log('  Usuario: admin');
    console.log('  Contraseña: 123');
    console.log('');

    await pool.close();
    console.log('Inicialización completada!');
  } catch (error) {
    console.error('Error durante la inicialización:', error);
    process.exit(1);
  }
}

initDatabase();
