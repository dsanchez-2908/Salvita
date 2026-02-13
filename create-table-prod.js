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
    trustServerCertificate: true
  }
};

(async () => {
  try {
    console.log('Conectando a', config.server, '/', config.database, '...\n');
    await sql.connect(config);
    console.log('✓ Conectado exitosamente\n');
    
    // Verificar si la tabla existe
    const tableCheck = await sql.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'TD_MODULE_VIEW_CONFIG'
    `);
    
    if (tableCheck.recordset.length > 0) {
      console.log('✓ La tabla TD_MODULE_VIEW_CONFIG ya existe');
    } else {
      console.log('✗ La tabla TD_MODULE_VIEW_CONFIG NO existe');
      console.log('Creando tabla...\n');
      
      // Leer y ejecutar el script de migración
      const script = fs.readFileSync('database/migrations/create_module_view_config.sql', 'utf8');
      const batches = script.split('GO').filter(b => b.trim());
      
      for (const batch of batches) {
        if (batch.trim()) {
          await sql.query(batch);
        }
      }
      
      console.log('✓ Tabla creada exitosamente');
    }
    
    // Verificar columnas
    const columns = await sql.query(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'TD_MODULE_VIEW_CONFIG'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('\nColumnas de la tabla:');
    columns.recordset.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE}`);
    });
    
    await sql.close();
    console.log('\n✓ Proceso completado');
  } catch (err) {
    console.error('✗ Error:', err.message);
    process.exit(1);
  }
})();
