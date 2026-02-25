const sql = require('mssql');

const config = {
  server: '172.16.16.60',
  port: 1433,
  database: 'salvita',
  options: {
    encrypt: false,
    trustServerCertificate: true
  },
  authentication: {
    type: 'default',
    options: {
      userName: 'sa',
      password: 'Lpa1234$'
    }
  }
};

(async () => {
  try {
    await sql.connect(config);
    
    console.log('Verificando TD_BANDEJAS:');
    const r1 = await sql.query(`
      SELECT COLUMN_NAME, DATA_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'TD_BANDEJAS' 
      ORDER BY ORDINAL_POSITION
    `);
    console.log(r1.recordset);
    
    console.log('\nVerificando TD_TAREAS:');
    const r2 = await sql.query(`
      SELECT COLUMN_NAME, DATA_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'TD_TAREAS' 
      ORDER BY ORDINAL_POSITION
    `);
    console.log(r2.recordset);
    
    console.log('\nVerificando TD_PLANTILLA_TAREAS:');
    const r3 = await sql.query(`
      SELECT COLUMN_NAME, DATA_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'TD_PLANTILLA_TAREAS' 
      ORDER BY ORDINAL_POSITION
    `);
    console.log(r3.recordset);
    
    await sql.close();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
