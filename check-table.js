const sql = require('mssql');

const config = {
  user: 'Salvita_User',
  password: 'Salvita2024!',
  server: 'localhost',
  database: 'Salvita',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

(async () => {
  try {
    await sql.connect(config);
    console.log('Conectado a la base de datos');
    
    const result = await sql.query(`
      SELECT * FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'TD_MODULE_VIEW_CONFIG'
    `);
    
    if (result.recordset.length > 0) {
      console.log('✓ La tabla TD_MODULE_VIEW_CONFIG existe');
    } else {
      console.log('✗ La tabla TD_MODULE_VIEW_CONFIG NO existe');
    }
    
    await sql.close();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
