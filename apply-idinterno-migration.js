// Script para aplicar la migración de tipo de dato IDInterno
const sql = require('mssql');
const fs = require('fs');
const path = require('path');

const config = {
  server: '172.16.16.60',
  port: 1433,
  database: 'salvita',
  options: {
    encrypt: false,
    trustServerCertificate: true
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
    console.log('==============================================');
    console.log('MIGRACIÓN: Agregar tipo de dato IDInterno');
    console.log('==============================================\n');

    console.log('Conectando a la base de datos...');
    await sql.connect(config);
    console.log('✓ Conexión exitosa\n');

    // Leer el archivo de migración
    const migrationPath = path.join(__dirname, 'database', 'migrations', 'add_idinterno_tipo_dato.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Ejecutando migración...\n');
    
    // Dividir el SQL en lotes (separados por GO)
    const batches = migrationSQL
      .split(/^\s*GO\s*$/im)
      .map(batch => batch.trim())
      .filter(batch => batch.length > 0);

    for (let i = 0; i < batches.length; i++) {
      console.log(`Ejecutando lote ${i + 1}/${batches.length}...`);
      const result = await sql.query(batches[i]);
      
      // Mostrar mensajes de PRINT si existen
      if (result.recordsets && result.recordsets.length > 0) {
        result.recordsets.forEach(recordset => {
          recordset.forEach(record => {
            console.log(record['']);
          });
        });
      }
    }

    console.log('\n✓ Migración aplicada exitosamente');
    console.log('\n==============================================');
    console.log('El tipo de dato IDInterno ahora está disponible');
    console.log('==============================================\n');

    await sql.close();
  } catch (error) {
    console.error('\n✗ Error al aplicar la migración:', error.message);
    if (error.precedingErrors) {
      error.precedingErrors.forEach(err => {
        console.error('  -', err.message);
      });
    }
    process.exit(1);
  }
}

runMigration();
