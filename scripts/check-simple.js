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

async function checkSimple() {
  try {
    await sql.connect(config);
    console.log('✓ Conectado\n');

    // Ver estructura de Alumnos v3
    console.log('=== ESTRUCTURA TD_MODULO_Alumnosv3 ===');
    const alumnosColumns = await sql.query`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'TD_MODULO_Alumnosv3'
      ORDER BY ORDINAL_POSITION
    `;
    alumnosColumns.recordset.forEach(c => {
      console.log(`  ${c.COLUMN_NAME} (${c.DATA_TYPE})`);
    });

    // Ver registros de Alumnos (sin especificar columnas específicas)
    console.log('\n=== ALUMNOS V3 ===');
    const alumnos = await sql.query`SELECT * FROM TD_MODULO_Alumnosv3`;
    console.log('Total alumnos:', alumnos.recordset.length);
    if (alumnos.recordset.length > 0) {
      console.log('Primer alumno:', JSON.stringify(alumnos.recordset[0], null, 2));
    }

    // Ver todas las notas con su FK
    console.log('\n=== NOTAS V3 (TODOS LOS CAMPOS) ===');
    const notas = await sql.query`SELECT * FROM TD_MODULO_Notasv3 ORDER BY FechaCreacion DESC`;
    console.log('Total notas:', notas.recordset.length);
    notas.recordset.forEach((n, idx) => {
      console.log(`\n[${idx + 1}] Nota ID: ${n.Id}`);
      console.log('  Campos:', JSON.stringify(n, null, 2));
    });

    // Ver todas las faltas con su FK
    console.log('\n=== FALTAS V3 (TODOS LOS CAMPOS) ===');
    const faltas = await sql.query`SELECT * FROM TD_MODULO_Faltasv3 ORDER BY FechaCreacion DESC`;
    console.log('Total faltas:', faltas.recordset.length);
    faltas.recordset.forEach((f, idx) => {
      console.log(`\n[${idx + 1}] Falta ID: ${f.Id}`);
      console.log('  Campos:', JSON.stringify(f, null, 2));
    });

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await sql.close();
  }
}

checkSimple();
