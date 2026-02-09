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

async function checkAlumnosV4() {
  try {
    const pool = await sql.connect(config);
    console.log('Conectado a SQL Server\n');

    // Obtener Alumnos v4
    const moduloResult = await pool.request().query(`
      SELECT Id, Nombre, NombreTabla 
      FROM TD_MODULOS 
      WHERE Nombre = 'Alumnos v4'
    `);

    if (moduloResult.recordset.length === 0) {
      console.log('No se encontró el módulo Alumnos v4');
      await pool.close();
      process.exit(0);
    }

    const modulo = moduloResult.recordset[0];
    console.log(`=== Verificando: ${modulo.Nombre} ===`);
    console.log(`Tabla: ${modulo.NombreTabla}\n`);

    // Obtener registros
    const registrosResult = await pool.request().query(`
      SELECT 
        Id,
        FechaCreacion,
        UsuarioCreacion,
        FechaModificacion,
        UsuarioModificacion
      FROM [${modulo.NombreTabla}]
      ORDER BY Id DESC
    `);

    console.log(`Total registros: ${registrosResult.recordset.length}\n`);

    if (registrosResult.recordset.length === 0) {
      console.log('No hay registros en Alumnos v4');
    } else {
      console.log('Primeros 3 registros:\n');
      registrosResult.recordset.slice(0, 3).forEach(registro => {
        console.log(`ID: ${registro.Id}`);
        console.log(`  Fecha Creación: ${registro.FechaCreacion ? new Date(registro.FechaCreacion).toLocaleString('es-AR') : 'NULL'}`);
        console.log(`  Usuario Creación: ${registro.UsuarioCreacion || 'NULL'}`);
        console.log(`  Fecha Modificación: ${registro.FechaModificacion ? new Date(registro.FechaModificacion).toLocaleString('es-AR') : 'NULL'}`);
        console.log(`  Usuario Modificación: ${registro.UsuarioModificacion || 'NULL'}`);
        console.log('');
      });
    }

    // Verificar también Faltas v4
    console.log('\n' + '='.repeat(60) + '\n');
    
    const moduloFaltasResult = await pool.request().query(`
      SELECT Id, Nombre, NombreTabla 
      FROM TD_MODULOS 
      WHERE Nombre = 'Faltas v4'
    `);

    if (moduloFaltasResult.recordset.length > 0) {
      const moduloFaltas = moduloFaltasResult.recordset[0];
      console.log(`=== Verificando: ${moduloFaltas.Nombre} ===`);
      console.log(`Tabla: ${moduloFaltas.NombreTabla}\n`);

      const registrosFaltasResult = await pool.request().query(`
        SELECT TOP 2
          Id,
          FechaCreacion,
          UsuarioCreacion
        FROM [${moduloFaltas.NombreTabla}]
        ORDER BY Id DESC
      `);

      console.log(`Total registros: ${registrosFaltasResult.recordset.length}\n`);

      if (registrosFaltasResult.recordset.length > 0) {
        registrosFaltasResult.recordset.forEach(registro => {
          console.log(`ID: ${registro.Id}`);
          console.log(`  Fecha Creación: ${registro.FechaCreacion ? new Date(registro.FechaCreacion).toLocaleString('es-AR') : 'NULL'}`);
          console.log(`  Usuario Creación: ${registro.UsuarioCreacion || 'NULL'}`);
          console.log('');
        });
      }
    }

    await pool.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkAlumnosV4();
