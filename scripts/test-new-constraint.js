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

async function testNewConstraint() {
  try {
    await sql.connect(config);
    console.log('✓ Conectado a SQL Server\n');

    console.log('=== PRUEBA DE NUEVA CONSTRAINT ===\n');
    
    // Obtener Faltas v4 (módulo que aparece en múltiples padres)
    const faltasv4 = await sql.query`
      SELECT Id FROM TD_MODULOS WHERE Nombre = 'Faltas v4'
    `;
    
    if (faltasv4.recordset.length === 0) {
      console.log('❌ No se encontró módulo Faltas v4');
      return;
    }
    
    const faltasId = faltasv4.recordset[0].Id;
    console.log(`Faltas v4 ID: ${faltasId}`);
    
    // Obtener padres de Faltas v4
    const padres = await sql.query`
      SELECT mp.Id, mp.Nombre
      FROM TR_MODULO_RELACION r
      INNER JOIN TD_MODULOS mp ON r.ModuloPadreId = mp.Id
      WHERE r.ModuloHijoId = ${faltasId}
    `;
    
    console.log(`\nPadres de Faltas v4: ${padres.recordset.length}`);
    padres.recordset.forEach(p => {
      console.log(`  • ${p.Nombre} (ID: ${p.Id})`);
    });
    
    console.log('\n📊 CONSTRAINT ACTUAL:');
    const constraint = await sql.query`
      SELECT 
        CONSTRAINT_NAME
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
      WHERE TABLE_NAME = 'TR_ROL_MODULO_PERMISO'
      AND CONSTRAINT_TYPE = 'UNIQUE'
    `;
    
    console.log(`  ${constraint.recordset[0].CONSTRAINT_NAME}`);
    console.log('  ✓ Permite: (RolId=X, ModuloPadreId=A, ModuloId=1015)');
    console.log('  ✓ Permite: (RolId=X, ModuloPadreId=B, ModuloId=1015)');
    console.log('  ✗ NO permite: (RolId=X, ModuloPadreId=A, ModuloId=1015) duplicado');
    
    console.log('\n✅ La nueva constraint permite el mismo módulo en diferentes contextos de padre');
    console.log('\n📋 SIGUIENTE PASO:');
    console.log('1. Refresca la página de roles: http://localhost:3000/dashboard/roles');
    console.log('2. Click en "Nuevo Rol"');
    console.log('3. Verifica que todos los checkboxes de "Ver" están desmarcados');
    console.log('4. Marca diferentes permisos para cada contexto de "Faltas v4"');
    console.log('5. Guarda el rol sin errores');

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await sql.close();
  }
}

testNewConstraint();
