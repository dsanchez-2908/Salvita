const sql = require('mssql');

(async () => {
  try {
    const pool = await sql.connect({
      server: '172.16.16.60',
      database: 'salvita',
      user: 'sa',
      password: 'Lpa1234$',
      options: {
        encrypt: false,
        trustServerCertificate: true
      }
    });
    
    await pool.request().query(`
      INSERT INTO TD_PARAMETROS (Parametro, Valor) 
      VALUES ('URL BASE Modificar Documento', 'http://172.16.16.60:8093/documents')
    `);
    
    console.log('✅ Parámetro "URL BASE Modificar Documento" agregado correctamente');
    
    await pool.close();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
