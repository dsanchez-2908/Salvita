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

    const migrationPath = path.join(__dirname, 'database', 'migrations', 'create_sistema_reportes.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('\nAplicando migración de Sistema de Reportes...');
    
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
    
    // Verificar las tablas creadas
    console.log('\nVerificando tablas creadas...');
    
    const reportesCheck = await sql.query(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'TD_REPORTES'
    `);
    
    const rolReporteCheck = await sql.query(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'TR_ROL_REPORTE'
    `);

    console.log(`- TD_REPORTES: ${reportesCheck.recordset[0].count === 1 ? '✅ Existe' : '❌ No existe'}`);
    console.log(`- TR_ROL_REPORTE: ${rolReporteCheck.recordset[0].count === 1 ? '✅ Existe' : '❌ No existe'}`);

  } catch (error) {
    console.error('❌ Error aplicando migración:', error);
    process.exit(1);
  } finally {
    await sql.close();
  }
}

applyMigration();
