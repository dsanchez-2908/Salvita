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

async function checkAllRecords() {
  try {
    await sql.connect(config);
    console.log('✓ Conectado a SQL Server\n');

    // Primero verificar qué ID tiene el alumno
    console.log('=== ALUMNOS V3 ===');
    const alumnos = await sql.query`
      SELECT Id, Nombre, Apellido, FechaCreacion
      FROM TD_MODULO_Alumnosv3
      ORDER BY FechaCreacion DESC
    `;
    console.log('Total alumnos:', alumnos.recordset.length);
    alumnos.recordset.forEach(a => {
      console.log(`  [ID: ${a.Id}] ${a.Nombre} ${a.Apellido} (Creado: ${a.FechaCreacion})`);
    });

    console.log('\n=== NOTAS V3 ===');
    const notas = await sql.query`
      SELECT Id, Materia, Nota, TD_MODULO_Alumnosv3_Id, FechaCreacion, FechaModificacion
      FROM TD_MODULO_Notasv3
      ORDER BY FechaCreacion DESC
    `;
    console.log('Total notas:', notas.recordset.length);
    notas.recordset.forEach(n => {
      const fkStatus = n.TD_MODULO_Alumnosv3_Id ? `✓ FK=${n.TD_MODULO_Alumnosv3_Id}` : '✗ FK=NULL';
      console.log(`  [ID: ${n.Id}] ${n.Materia} - Nota: ${n.Nota} ${fkStatus}`);
      console.log(`    Creado: ${n.FechaCreacion}`);
    });

    console.log('\n=== FALTAS V3 ===');
    const faltas = await sql.query`
      SELECT Id, Fecha, Motivo, TD_MODULO_Alumnosv3_Id, FechaCreacion, FechaModificacion
      FROM TD_MODULO_Faltasv3
      ORDER BY FechaCreacion DESC
    `;
    console.log('Total faltas:', faltas.recordset.length);
    faltas.recordset.forEach(f => {
      const fkStatus = f.TD_MODULO_Alumnosv3_Id ? `✓ FK=${f.TD_MODULO_Alumnosv3_Id}` : '✗ FK=NULL';
      console.log(`  [ID: ${f.Id}] ${f.Fecha} - ${f.Motivo} ${fkStatus}`);
      console.log(`    Creado: ${f.FechaCreacion}`);
    });

    // Verificar estructura de las tablas
    console.log('\n=== ESTRUCTURA TD_MODULO_Notasv3 ===');
    const notasColumns = await sql.query`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'TD_MODULO_Notasv3'
      ORDER BY ORDINAL_POSITION
    `;
    notasColumns.recordset.forEach(c => {
      console.log(`  ${c.COLUMN_NAME} (${c.DATA_TYPE}) - Nullable: ${c.IS_NULLABLE}`);
    });

    console.log('\n=== RESUMEN ===');
    const notasConFK = notas.recordset.filter(n => n.TD_MODULO_Alumnosv3_Id !== null).length;
    const notasSinFK = notas.recordset.length - notasConFK;
    const faltasConFK = faltas.recordset.filter(f => f.TD_MODULO_Alumnosv3_Id !== null).length;
    const faltasSinFK = faltas.recordset.length - faltasConFK;

    console.log(`Notas: ${notasConFK} con FK, ${notasSinFK} sin FK`);
    console.log(`Faltas: ${faltasConFK} con FK, ${faltasSinFK} sin FK`);

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
  } finally {
    await sql.close();
  }
}

checkAllRecords();
