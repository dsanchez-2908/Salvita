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

async function limpiarRegistrosHuerfanos() {
  try {
    await sql.connect(config);
    console.log('✓ Conectado a SQL Server\n');

    console.log('=== LIMPIANDO REGISTROS HUÉRFANOS ===\n');

    // Eliminar Notas v3 sin FK
    console.log('📋 NOTAS V3:');
    const notasAntes = await sql.query`SELECT COUNT(*) as total FROM TD_MODULO_Notasv3`;
    const notasHuerfanas = await sql.query`SELECT COUNT(*) as total FROM TD_MODULO_Notasv3 WHERE TD_MODULO_Alumnosv3_Id IS NULL`;
    console.log(`   Total registros: ${notasAntes.recordset[0].total}`);
    console.log(`   Registros huérfanos (FK NULL): ${notasHuerfanas.recordset[0].total}`);
    
    if (notasHuerfanas.recordset[0].total > 0) {
      await sql.query`DELETE FROM TD_MODULO_Notasv3 WHERE TD_MODULO_Alumnosv3_Id IS NULL`;
      console.log(`   ✓ Eliminados ${notasHuerfanas.recordset[0].total} registros huérfanos`);
    }

    // Eliminar Faltas v3 sin FK
    console.log('\n📋 FALTAS V3:');
    const faltasAntes = await sql.query`SELECT COUNT(*) as total FROM TD_MODULO_Faltasv3`;
    const faltasHuerfanas = await sql.query`SELECT COUNT(*) as total FROM TD_MODULO_Faltasv3 WHERE TD_MODULO_Alumnosv3_Id IS NULL`;
    console.log(`   Total registros: ${faltasAntes.recordset[0].total}`);
    console.log(`   Registros huérfanos (FK NULL): ${faltasHuerfanas.recordset[0].total}`);
    
    if (faltasHuerfanas.recordset[0].total > 0) {
      await sql.query`DELETE FROM TD_MODULO_Faltasv3 WHERE TD_MODULO_Alumnosv3_Id IS NULL`;
      console.log(`   ✓ Eliminados ${faltasHuerfanas.recordset[0].total} registros huérfanos`);
    }

    console.log('\n=== LIMPIEZA COMPLETADA ===');
    console.log('Ahora puedes crear nuevos registros desde el detalle de cada alumno.');
    console.log('Los nuevos registros sí tendrán el FK y aparecerán en la vista agrupada.');

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await sql.close();
  }
}

limpiarRegistrosHuerfanos();
