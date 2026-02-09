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

    // Verificar columnas de TD_DASHBOARD_CONFIG
    const result = await pool.request().query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'TD_DASHBOARD_CONFIG'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('Columnas en TD_DASHBOARD_CONFIG:');
    console.log('================================\n');
    result.recordset.forEach(col => {
      console.log(`${col.COLUMN_NAME.padEnd(25)} ${col.DATA_TYPE.padEnd(15)} ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // Verificar CHECK constraint de TipoVisualizacion
    const constraints = await pool.request().query(`
      SELECT 
        cc.name AS ConstraintName,
        cc.definition
      FROM sys.check_constraints cc
      INNER JOIN sys.columns c ON cc.parent_object_id = c.object_id 
        AND cc.parent_column_id = c.column_id
      WHERE cc.parent_object_id = OBJECT_ID('TD_DASHBOARD_CONFIG')
        AND c.name = 'TipoVisualizacion'
    `);

    console.log('\n\nCHECK Constraint de TipoVisualizacion:');
    console.log('======================================\n');
    if (constraints.recordset.length > 0) {
      console.log(`${constraints.recordset[0].ConstraintName}: ${constraints.recordset[0].definition}`);
    } else {
      console.log('No se encontró CHECK constraint');
    }

    await pool.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkColumns();
