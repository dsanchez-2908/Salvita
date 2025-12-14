const sql = require('mssql');

const config = {
  server: 'localhost',
  port: 1433,
  database: 'Salvita',
  authentication: {
    type: 'default',
    options: {
      userName: 'salvita_user',
      password: 'Salvita2024!'
    }
  },
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

async function testConnection() {
  try {
    console.log('Intentando conectar con msnodesqlv8...');
    const pool = await sql.connect(config);
    console.log('✓ Conexión exitosa!');
    
    const result = await pool.request().query('SELECT @@VERSION AS Version');
    console.log('SQL Server Version:', result.recordset[0].Version.substring(0, 100));
    
    const result2 = await pool.request().query('SELECT COUNT(*) as Count FROM TD_USUARIOS');
    console.log('Usuarios en BD:', result2.recordset[0].Count);
    
    await pool.close();
    console.log('✓ Test completado!');
  } catch (err) {
    console.error('✗ Error:', err.message);
    console.error('Stack:', err.stack);
  }
}

testConnection();
