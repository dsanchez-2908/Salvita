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

async function testUsuarioCreacion() {
  try {
    await sql.connect(config);
    console.log('✓ Conectado a SQL Server\n');

    console.log('=== VERIFICACIÓN DE REGISTROS V2 ===\n');

    // Verificar Alumnos v3
    console.log('📋 ALUMNOS V3:');
    const alumnos = await sql.query`
      SELECT Id, NombreCompleto, UsuarioCreacion, FechaCreacion
      FROM TD_MODULO_Alumnosv3
      ORDER BY FechaCreacion DESC
    `;
    console.log(`Total: ${alumnos.recordset.length} registros`);
    alumnos.recordset.slice(0, 3).forEach(a => {
      const usuario = a.UsuarioCreacion || '⚠️ NULL';
      const fecha = new Date(a.FechaCreacion).toLocaleString('es-ES');
      console.log(`  [${a.Id}] ${a.NombreCompleto} - Usuario: ${usuario} (${fecha})`);
    });

    // Verificar otros módulos V2
    const tablas = ['TD_MODULO_Notasv3', 'TD_MODULO_Faltasv3'];
    
    for (const tabla of tablas) {
      console.log(`\n📋 ${tabla}:`);
      try {
        const result = await sql.query(`
          SELECT TOP 5 Id, UsuarioCreacion, FechaCreacion
          FROM ${tabla}
          ORDER BY FechaCreacion DESC
        `);
        
        console.log(`Total: ${result.recordset.length} registros`);
        if (result.recordset.length > 0) {
          const conUsuario = result.recordset.filter(r => r.UsuarioCreacion).length;
          const sinUsuario = result.recordset.length - conUsuario;
          console.log(`  ✓ Con usuario: ${conUsuario}`);
          if (sinUsuario > 0) {
            console.log(`  ⚠️  Sin usuario: ${sinUsuario}`);
          }
          
          // Mostrar últimos registros
          result.recordset.slice(0, 3).forEach(r => {
            const usuario = r.UsuarioCreacion || 'NULL';
            const fecha = new Date(r.FechaCreacion).toLocaleString('es-ES');
            console.log(`    [${r.Id}] Usuario: ${usuario} (${fecha})`);
          });
        }
      } catch (err) {
        console.log(`  ⚠️  Tabla no existe todavía`);
      }
    }

    console.log('\n=== INSTRUCCIONES ===');
    console.log('1. Crea un nuevo registro de Nota v3 o Falta v3');
    console.log('2. Verifica que ahora SÍ se guarde el UsuarioCreacion');
    console.log('3. El usuario aparecerá en la Vista Agrupada junto a la fecha/hora');

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await sql.close();
  }
}

testUsuarioCreacion();
