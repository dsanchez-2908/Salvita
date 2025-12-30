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
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, CHARACTER_MAXIMUM_LENGTH
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'TD_DASHBOARD_CONFIG' 
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('\nColumnas de TD_DASHBOARD_CONFIG:');
    console.log('='.repeat(60));
    result.recordset.forEach(col => {
      console.log(`- ${col.COLUMN_NAME} (${col.DATA_TYPE}${col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : ''})`);
    });
    console.log('='.repeat(60));
    
    await pool.close();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
