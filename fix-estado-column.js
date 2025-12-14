const sql = require('mssql');

const config = {
  server: 'localhost',
  port: 1433,
  database: 'Salvita',
  user: 'salvita_user',
  password: 'Salvita2024!',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
};

async function addEstadoColumn() {
  try {
    console.log('Conectando a SQL Server...');
    const pool = await sql.connect(config);

    console.log('Agregando columna Estado a TD_MODULO_RESIDENTES...');
    await pool.request().query(`
      ALTER TABLE TD_MODULO_RESIDENTES 
      ADD Estado VARCHAR(20) DEFAULT 'Activo'
    `);

    console.log('✓ Columna Estado agregada exitosamente');
    
    await pool.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

addEstadoColumn();
