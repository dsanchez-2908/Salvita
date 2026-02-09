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

async function ejecutarMigracion() {
  try {
    await sql.connect(config);
    console.log('✓ Conectado a SQL Server\n');

    // Leer el archivo SQL
    const fs = require('fs');
    const path = require('path');
    const sqlFile = path.join(__dirname, '..', 'database', 'migrations', 'fix_modulo_registro_relaciones.sql');
    const sqlScript = fs.readFileSync(sqlFile, 'utf8');

    // Dividir por GO y ejecutar cada batch
    const batches = sqlScript
      .split(/\r?\nGO\r?\n/i)
      .filter(batch => batch.trim().length > 0);

    console.log(`Ejecutando ${batches.length} batches...\n`);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i].trim();
      if (batch.length > 0) {
        try {
          const result = await sql.query(batch);
          
          // Mostrar resultados si hay
          if (result.recordset && result.recordset.length > 0) {
            console.log(`\n📋 Resultados del batch ${i + 1}:`);
            console.table(result.recordset);
          }
        } catch (err) {
          console.error(`❌ Error en batch ${i + 1}:`, err.message);
        }
      }
    }

    console.log('\n✓ Migración ejecutada');

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await sql.close();
  }
}

ejecutarMigracion();
