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

async function checkExistingRecords() {
  try {
    await sql.connect(config);
    console.log('✓ Conectado a SQL Server\n');

    console.log('=== VERIFICANDO REGISTROS EXISTENTES ===\n');

    // Notas v3
    console.log('📋 NOTAS V3:');
    const notas = await sql.query`
      SELECT Id, Materia, TD_MODULO_Alumnosv3_Id, FechaCreacion
      FROM TD_MODULO_Notasv3
    `;
    console.log(`   Total registros: ${notas.recordset.length}`);
    if (notas.recordset.length > 0) {
      const conFK = notas.recordset.filter(n => n.TD_MODULO_Alumnosv3_Id !== null).length;
      const sinFK = notas.recordset.length - conFK;
      console.log(`   - Con FK (TD_MODULO_Alumnosv3_Id lleno): ${conFK}`);
      console.log(`   - Sin FK (TD_MODULO_Alumnosv3_Id NULL): ${sinFK}`);
      if (sinFK > 0) {
        console.log(`   ⚠️  HAY ${sinFK} REGISTRO(S) QUE NECESITA(N) ACTUALIZACIÓN`);
      }
    }

    // Faltas v3
    console.log('\n📋 FALTAS V3:');
    const faltas = await sql.query`
      SELECT Id, Fecha, TD_MODULO_Alumnosv3_Id, FechaCreacion
      FROM TD_MODULO_Faltasv3
    `;
    console.log(`   Total registros: ${faltas.recordset.length}`);
    if (faltas.recordset.length > 0) {
      const conFK = faltas.recordset.filter(f => f.TD_MODULO_Alumnosv3_Id !== null).length;
      const sinFK = faltas.recordset.length - conFK;
      console.log(`   - Con FK (TD_MODULO_Alumnosv3_Id lleno): ${conFK}`);
      console.log(`   - Sin FK (TD_MODULO_Alumnosv3_Id NULL): ${sinFK}`);
      if (sinFK > 0) {
        console.log(`   ⚠️  HAY ${sinFK} REGISTRO(S) QUE NECESITA(N) ACTUALIZACIÓN`);
      }
    }

    console.log('\n=== ANÁLISIS COMPLETADO ===');
    console.log('Los registros con FK NULL NO aparecerán en la vista agrupada.');
    console.log('Necesitan ser actualizados manualmente o eliminados y recreados.');

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await sql.close();
  }
}

checkExistingRecords();
