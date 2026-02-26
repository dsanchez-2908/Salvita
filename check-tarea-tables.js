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

async function checkTables() {
  try {
    await sql.connect(config);
    console.log('Conectado a la base de datos\n');

    const result = await sql.query`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
      AND TABLE_NAME LIKE '%TAREA%'
      ORDER BY TABLE_NAME
    `;

    console.log('=== TABLAS RELACIONADAS A TAREAS ===\n');
    result.recordset.forEach(table => {
      console.log(table.TABLE_NAME);
    });

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await sql.close();
  }
}

checkTables();
