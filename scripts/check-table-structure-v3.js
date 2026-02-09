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
    enableArithAbort: true,
  },
};

async function checkTableStructure() {
  try {
    await sql.connect(config);
    console.log('✓ Conectado a SQL Server\n');

    // 1. Ver estructura de tabla Notas v3
    console.log('=== ESTRUCTURA DE TABLA TD_MODULO_Notasv3 ===');
    const notasColumns = await sql.query`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'TD_MODULO_Notasv3'
      ORDER BY ORDINAL_POSITION
    `;
    
    console.log('Columnas encontradas:');
    notasColumns.recordset.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE}) ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : ''}`);
    });

    // 2. Ver estructura de tabla Faltas v3
    console.log('\n=== ESTRUCTURA DE TABLA TD_MODULO_Faltasv3 ===');
    const faltasColumns = await sql.query`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'TD_MODULO_Faltasv3'
      ORDER BY ORDINAL_POSITION
    `;
    
    console.log('Columnas encontradas:');
    faltasColumns.recordset.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE}) ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : ''}`);
    });

    // 3. Ver estructura de tabla Alumnos v3
    console.log('\n=== ESTRUCTURA DE TABLA TD_MODULO_Alumnosv3 ===');
    const alumnosColumns = await sql.query`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'TD_MODULO_Alumnosv3'
      ORDER BY ORDINAL_POSITION
    `;
    
    console.log('Columnas encontradas:');
    alumnosColumns.recordset.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE}) ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : ''}`);
    });

    // 4. Ver datos de ejemplo en Notas v3
    console.log('\n=== DATOS DE EJEMPLO EN TD_MODULO_Notasv3 ===');
    const notasData = await sql.query`
      SELECT TOP 5 * FROM TD_MODULO_Notasv3
    `;
    
    if (notasData.recordset.length > 0) {
      console.log(`${notasData.recordset.length} registros encontrados`);
      console.log('Primer registro:', notasData.recordset[0]);
    } else {
      console.log('No hay registros en esta tabla');
    }

    // 5. Ver datos de ejemplo en Faltas v3
    console.log('\n=== DATOS DE EJEMPLO EN TD_MODULO_Faltasv3 ===');
    const faltasData = await sql.query`
      SELECT TOP 5 * FROM TD_MODULO_Faltasv3
    `;
    
    if (faltasData.recordset.length > 0) {
      console.log(`${faltasData.recordset.length} registros encontrados`);
      console.log('Primer registro:', faltasData.recordset[0]);
    } else {
      console.log('No hay registros en esta tabla');
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await sql.close();
  }
}

checkTableStructure();
