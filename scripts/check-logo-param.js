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
    
    const result = await pool.request().query(`
      SELECT Id, Parametro, LEFT(Valor, 100) as ValorPreview, LEN(Valor) as ValorLength
      FROM TD_PARAMETROS 
      WHERE Id = 9 OR Parametro LIKE '%Logo%'
      ORDER BY Id
    `);
    
    console.log('\nParámetros relacionados con Logo:');
    console.log('='.repeat(80));
    result.recordset.forEach(param => {
      console.log(`ID: ${param.Id}`);
      console.log(`Parámetro: ${param.Parametro}`);
      console.log(`Valor (primeros 100 chars): ${param.ValorPreview}`);
      console.log(`Longitud total del valor: ${param.ValorLength}`);
      console.log('-'.repeat(80));
    });
    
    await pool.close();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
