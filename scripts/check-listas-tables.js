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

async function checkTables() {
  try {
    await sql.connect(config);
    
    // Ver todas las tablas relacionadas con listas
    const tablesResult = await sql.query`
      SELECT 
        TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
        AND (TABLE_NAME LIKE '%LISTA%' OR TABLE_NAME LIKE '%LIST%')
      ORDER BY TABLE_NAME
    `;
    
    console.log('\n=== Tablas relacionadas con LISTA ===');
    console.log(tablesResult.recordset);
    
    await sql.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkTables();
