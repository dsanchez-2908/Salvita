const sql = require('mssql');

const config = {
  user: 'sa',
  password: 'Lpa1234$',
  server: '172.16.16.60',
  database: 'salvita',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function checkColumns() {
  try {
    await sql.connect(config);
    console.log('Conectado a la base de datos\n');

    const result = await sql.query`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'TD_TAREAS'
      ORDER BY ORDINAL_POSITION
    `;

    console.log('=== COLUMNAS DE TD_TAREAS ===\n');
    result.recordset.forEach(col => {
      console.log(`${col.COLUMN_NAME.padEnd(30)} ${col.DATA_TYPE.padEnd(15)} ${col.IS_NULLABLE}`);
    });

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await sql.close();
  }
}

checkColumns();
