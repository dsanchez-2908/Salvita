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

async function checkStructure() {
  try {
    const pool = await sql.connect(config);
    console.log('Conectado a SQL Server\n');

    // Ver estructura de TD_MODULO_TRAZAS
    const result = await pool.request().query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE,
        COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'TD_MODULO_TRAZAS'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('=== ESTRUCTURA DE TD_MODULO_TRAZAS ===\n');
    result.recordset.forEach(col => {
      const length = col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : '';
      const nullable = col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultVal = col.COLUMN_DEFAULT ? ` DEFAULT ${col.COLUMN_DEFAULT}` : '';
      console.log(`${col.COLUMN_NAME.padEnd(20)} ${col.DATA_TYPE}${length.padEnd(10)} ${nullable}${defaultVal}`);
    });

    // Ver registros recientes si existen
    console.log('\n\n=== ÚLTIMOS 5 REGISTROS ===\n');
    const data = await pool.request().query(`SELECT TOP 5 * FROM TD_MODULO_TRAZAS ORDER BY Id DESC`);
    
    if (data.recordset.length === 0) {
      console.log('No hay registros en la tabla');
    } else {
      data.recordset.forEach(r => {
        console.log(JSON.stringify(r, null, 2));
        console.log('---');
      });
    }

    await pool.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkStructure();
