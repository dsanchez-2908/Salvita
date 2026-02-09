const sql = require('mssql');
const fs = require('fs');

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

async function runMigration() {
  try {
    const pool = await sql.connect(config);
    console.log('Conectado a SQL Server');

    // Leer el archivo SQL
    const sqlContent = fs.readFileSync('database/migrations/add_dynamic_lists.sql', 'utf8');

    // Dividir por GO y filtrar líneas vacías
    const batches = sqlContent
      .split(/\nGO\n|\nGO\r\n/gi)
      .filter(batch => batch.trim().length > 0);

    console.log(`Ejecutando ${batches.length} batches...`);

    // Ejecutar cada batch
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i].trim();
      if (batch && !batch.startsWith('--') && batch.toLowerCase() !== 'go') {
        try {
          const result = await pool.request().query(batch);
          if (result.output) {
            console.log(result.output);
          }
        } catch (err) {
          console.error(`Error en batch ${i + 1}:`, err.message);
          // Continuar con los siguientes batches
        }
      }
    }

    console.log('✓ Migración completada exitosamente');
    await pool.close();
    process.exit(0);
  } catch (err) {
    console.error('Error ejecutando migración:', err.message);
    process.exit(1);
  }
}

runMigration();
