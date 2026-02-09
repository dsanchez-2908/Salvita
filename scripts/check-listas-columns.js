const sql = require('mssql');

const config = {
  server: '172.16.16.60',
  port: 1433,
  database: 'salvita',
  user: 'sa',
  password: 'Lpa1234$',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function checkColumns() {
  try {
    const pool = await sql.connect(config);
    console.log('Conectado a SQL Server\n');

    // Verificar columnas actuales de TD_LISTAS
    const result = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, CHARACTER_MAXIMUM_LENGTH
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'TD_LISTAS'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('Columnas actuales en TD_LISTAS:');
    console.log('=====================================');
    result.recordset.forEach(col => {
      console.log(`${col.COLUMN_NAME} - ${col.DATA_TYPE}${col.CHARACTER_MAXIMUM_LENGTH ? '('+col.CHARACTER_MAXIMUM_LENGTH+')' : ''} - ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    await pool.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkColumns();
