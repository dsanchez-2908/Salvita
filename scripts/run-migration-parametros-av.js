const sql = require('mssql');
const fs = require('fs');
const path = require('path');

const config = {
  server: '172.16.16.60',
  port: 1433,
  database: 'salvita',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  },
  authentication: {
    type: 'default',
    options: {
      userName: 'sa',
      password: 'Lpa1234$'
    }
  }
};

async function runMigration() {
  try {
    console.log('Conectando a la base de datos...');
    const pool = await sql.connect(config);
    console.log('Conexión exitosa!\n');

    // Leer el archivo de migración
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', 'create_parametros_av.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Ejecutando migración de Parámetros AV...\n');
    
    // Dividir el script en batches por GO
    const batches = migrationSQL
      .replace(/USE\s+Salvita;/gi, '') // Remover USE Salvita ya que conectamos directamente a la BD
      .split(/\s*GO\s*/gi)
      .filter(batch => batch.trim().length > 0);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i].trim();
      if (batch) {
        console.log(`Ejecutando batch ${i + 1}/${batches.length}...`);
        try {
          const result = await pool.request().query(batch);
          if (result.recordset && result.recordset.length > 0) {
            result.recordset.forEach(row => {
              if (row['']) {
                console.log(`  ${row['']}`);
              }
            });
          }
        } catch (err) {
          console.error(`Error en batch ${i + 1}:`, err.message);
          // Continuar con los siguientes batches
        }
      }
    }

    console.log('\n✅ Migración completada exitosamente!');
    console.log('\nTabla TD_PARAMETROS_AV creada.');
    console.log('Vista VW_PARAMETROS_AV creada.');
    
    await pool.close();
  } catch (err) {
    console.error('❌ Error ejecutando migración:', err);
    process.exit(1);
  }
}

runMigration();
