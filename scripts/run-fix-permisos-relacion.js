const sql = require('mssql');
const fs = require('fs');
const path = require('path');

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

async function ejecutarMigracion() {
  try {
    await sql.connect(config);
    console.log('✓ Conectado a SQL Server\n');

    // Leer el archivo SQL
    const sqlFile = path.join(__dirname, '..', 'database', 'migrations', 'fix_permisos_por_relacion.sql');
    const sqlScript = fs.readFileSync(sqlFile, 'utf8');

    // Dividir por GO y ejecutar cada batch
    const batches = sqlScript
      .split(/\r?\nGO\r?\n/i)
      .filter(batch => batch.trim().length > 0);

    console.log(`Ejecutando ${batches.length} batches...\n`);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i].trim();
      if (batch.length > 0 && !batch.startsWith('--')) {
        console.log(`📦 Ejecutando batch ${i + 1}/${batches.length}...`);
        try {
          const result = await sql.query(batch);
          console.log(`✓ Batch ${i + 1} completado`);
          
          // Mostrar mensajes PRINT
          if (result.output) {
            console.log(result.output);
          }
          
          // Mostrar resultados si hay
          if (result.recordset && result.recordset.length > 0) {
            console.log(`\n📋 Resultados del batch ${i + 1}:`);
            console.table(result.recordset);
          }
        } catch (err) {
          console.error(`❌ Error en batch ${i + 1}:`, err.message);
          console.error(`📝 Contenido del batch:\n${batch.substring(0, 200)}...`);
          throw err; // Detener si hay error
        }
      }
    }

    console.log('\n✓ Migración ejecutada');
    console.log('\n=== SIGUIENTE PASO ===');
    console.log('Actualizar el código del frontend para mostrar permisos por relación');

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await sql.close();
  }
}

ejecutarMigracion();
