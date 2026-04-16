const sql = require('mssql');
const fs = require('fs');
const path = require('path');

const config = {
  user: 'sa',
  password: 'Lpa1234$',
  server: '172.16.16.60',
  database: 'Salvita',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
};

async function applyMigration() {
  try {
    console.log('Conectando a la base de datos...');
    await sql.connect(config);
    console.log('Conectado exitosamente');

    const migrationPath = path.join(__dirname, 'database', 'migrations', 'add_permisos_reportes_to_config.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('\nAplicando migración de permisos de reportes...');
    
    // Dividir el script SQL por GO y ejecutar cada lote
    const batches = migrationSQL
      .split(/\r?\nGO\r?\n/)
      .filter(batch => batch.trim().length > 0);

    for (const batch of batches) {
      if (batch.trim()) {
        await sql.query(batch);
      }
    }

    console.log('\n✅ Migración completada exitosamente');
    
    // Verificar la columna creada
    console.log('\nVerificando columna creada...');
    
    const columnCheck = await sql.query(`
      SELECT COUNT(*) as count 
      FROM sys.columns 
      WHERE object_id = OBJECT_ID('TR_ROL_CONFIG_PERMISO') 
      AND name = 'PermisosReportes'
    `);

    console.log(`- PermisosReportes: ${columnCheck.recordset[0].count === 1 ? '✅ Existe' : '❌ No existe'}`);

  } catch (error) {
    console.error('❌ Error aplicando migración:', error);
    process.exit(1);
  } finally {
    await sql.close();
  }
}

applyMigration();
