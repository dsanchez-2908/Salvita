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

async function checkTables() {
  try {
    const pool = await sql.connect(config);
    console.log('Conectado a SQL Server\n');

    // Buscar tablas relacionadas con trazas
    const result = await pool.request().query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_NAME LIKE '%TRAZA%' OR TABLE_NAME LIKE '%AUDIT%' OR TABLE_NAME LIKE '%LOG%'
      ORDER BY TABLE_NAME
    `);

    console.log('=== TABLAS RELACIONADAS CON TRAZAS/AUDITORÍA ===\n');
    if (result.recordset.length === 0) {
      console.log('No se encontraron tablas de trazas');
    } else {
      result.recordset.forEach(t => {
        console.log(t.TABLE_NAME);
      });
    }

    // Ver todas las tablas TD_
    const allTables = await pool.request().query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_NAME LIKE 'TD_%'
      ORDER BY TABLE_NAME
    `);

    console.log('\n\n=== TODAS LAS TABLAS TD_ ===\n');
    allTables.recordset.forEach(t => {
      console.log(t.TABLE_NAME);
    });

    await pool.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkTables();
