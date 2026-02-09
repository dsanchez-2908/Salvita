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

async function verificarPermisosRelacion() {
  try {
    await sql.connect(config);
    console.log('✓ Conectado a SQL Server\n');

    console.log('=== ESTRUCTURA TR_ROL_MODULO_PERMISO ===\n');
    
    // Verificar que existe ModuloPadreId
    const columnas = await sql.query`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'TR_ROL_MODULO_PERMISO'
      ORDER BY ORDINAL_POSITION
    `;
    
    console.log('Columnas actuales:');
    columnas.recordset.forEach(c => {
      const nullable = c.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
      console.log(`  ${c.COLUMN_NAME} (${c.DATA_TYPE}) ${nullable}`);
    });

    const tieneModuloPadreId = columnas.recordset.some(c => c.COLUMN_NAME === 'ModuloPadreId');
    
    if (tieneModuloPadreId) {
      console.log('\n✓ Columna ModuloPadreId existe');
    } else {
      console.log('\n❌ Columna ModuloPadreId NO existe - ejecutar migración');
      return;
    }

    // Mostrar ejemplo de cómo se verían los permisos
    console.log('\n=== EJEMPLO: FALTAS V4 EN MÚLTIPLES CONTEXTOS ===\n');
    
    const faltasv4 = await sql.query`
      SELECT Id, Nombre FROM TD_MODULOS WHERE Nombre = 'Faltas v4'
    `;
    
    if (faltasv4.recordset.length === 0) {
      console.log('⚠️  Módulo "Faltas v4" no encontrado');
    } else {
      const faltasId = faltasv4.recordset[0].Id;
      console.log(`Faltas v4 (ID: ${faltasId})`);
      
      // Ver relaciones
      const relaciones = await sql.query`
        SELECT 
          mp.Nombre as Padre,
          mp.Id as PadreId
        FROM TR_MODULO_RELACION r
        INNER JOIN TD_MODULOS mp ON r.ModuloPadreId = mp.Id
        WHERE r.ModuloHijoId = ${faltasId}
      `;
      
      console.log(`\nPadres de Faltas v4: ${relaciones.recordset.length}`);
      relaciones.recordset.forEach(rel => {
        console.log(`  • ${rel.Padre} (ID: ${rel.PadreId})`);
      });
      
      console.log('\n📋 PERMISOS ESPERADOS (ejemplo Rol Administrador):');
      console.log('┌─────────────────┬───────────────┬──────────┬──────────┬──────────┬──────────┬──────────┐');
      console.log('│ Módulo Padre    │ Módulo Hijo   │ Ver      │ Agregar  │ Modificar│ Eliminar │ VerAgrup │');
      console.log('├─────────────────┼───────────────┼──────────┼──────────┼──────────┼──────────┼──────────┤');
      console.log('│ Alumnos v4      │ Faltas v4     │ ✓        │ ✓        │ ✓        │ ✓        │ N/A      │');
      console.log('│ Profesores v4   │ Faltas v4     │ ✓        │ ✗        │ ✗        │ ✗        │ N/A      │');
      console.log('└─────────────────┴───────────────┴──────────┴──────────┴──────────┴──────────┴──────────┘');
    }

    console.log('\n=== PRUEBA EN LA PANTALLA ===');
    console.log('1. Ve a: http://localhost:3000/dashboard/roles');
    console.log('2. Crea un Nuevo Rol (ej: "Rol Prueba V2")');
    console.log('3. En la tabla de permisos deberías ver:');
    console.log('   📘 Principal: Alumnos v4');
    console.log('      └─ Secundario: Notas v4');
    console.log('      └─ Secundario: Faltas v4   ← Aquí configuras permisos en contexto de Alumnos');
    console.log('   📘 Principal: Profesores v4');
    console.log('      └─ Secundario: Faltas v4   ← Aquí configuras permisos DIFERENTES en contexto de Profesores');
    console.log('\n4. Marca diferentes checkboxes para cada "Faltas v4"');
    console.log('5. Guarda el rol');
    console.log('6. Edita el rol y verifica que se mantengan los permisos independientes');

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await sql.close();
  }
}

verificarPermisosRelacion();
