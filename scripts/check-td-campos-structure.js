const sql = require('mssql');

const config = {
  server: '172.16.16.60',
  port: 1433,
  database: 'salvita',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  },
  authentication: {
    type: 'default',
    options: {
      userName: 'sa',
      password: 'Lpa1234$'
    }
  }
};

async function checkStructure() {
  try {
    await sql.connect(config);
    console.log('✓ Conectado a SQL Server\n');

    // Obtener estructura de TD_CAMPOS
    const columns = await sql.query`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'TD_CAMPOS'
      ORDER BY ORDINAL_POSITION
    `;

    console.log('=== ESTRUCTURA DE TD_CAMPOS ===\n');
    console.log('┌──────────────────────┬──────────────┬──────────┬────────────────┐');
    console.log('│ Columna              │ Tipo         │ Nullable │ Default        │');
    console.log('├──────────────────────┼──────────────┼──────────┼────────────────┤');
    
    columns.recordset.forEach(col => {
      const nombre = col.COLUMN_NAME.padEnd(20);
      const tipo = col.DATA_TYPE.padEnd(12);
      const nullable = col.IS_NULLABLE.padEnd(8);
      const def = (col.COLUMN_DEFAULT || '').substring(0, 14).padEnd(14);
      console.log(`│ ${nombre} │ ${tipo} │ ${nullable} │ ${def} │`);
    });
    
    console.log('└──────────────────────┴──────────────┴──────────┴────────────────┘\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await sql.close();
  }
}

checkStructure();
