const sql = require('mssql');

const config = {
  user: 'Salvita_User',
  password: 'Salvita2024!',
  server: 'localhost',
  database: 'Salvita',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

(async () => {
  try {
    await sql.connect(config);
    console.log('✓ Conectado a la base de datos Salvita\n');
    
    // Verificar tabla
    const tableCheck = await sql.query(`
      SELECT TABLE_SCHEMA, TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'TD_MODULE_VIEW_CONFIG'
    `);
    
    if (tableCheck.recordset.length === 0) {
      console.log('✗ La tabla TD_MODULE_VIEW_CONFIG NO existe\n');
      console.log('Ejecutando script de creación...\n');
      
      const fs = require('fs');
      const script = fs.readFileSync('database/migrations/create_module_view_config.sql', 'utf8');
      const batches = script.split('GO').filter(b => b.trim());
      
      for (const batch of batches) {
        if (batch.trim()) {
          await sql.query(batch);
        }
      }
      
      console.log('✓ Tabla creada exitosamente\n');
    } else {
      console.log('✓ La tabla existe en esquema:', tableCheck.recordset[0].TABLE_SCHEMA);
      console.log('  Nombre completo: [' + tableCheck.recordset[0].TABLE_SCHEMA + '].[' + tableCheck.recordset[0].TABLE_NAME + ']\n');
    }
    
    // Verificar columnas
    const columns = await sql.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, CHARACTER_MAXIMUM_LENGTH
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'TD_MODULE_VIEW_CONFIG'
      ORDER BY ORDINAL_POSITION
    `);
    
    if (columns.recordset.length > 0) {
      console.log('Columnas de la tabla:');
      columns.recordset.forEach(col => {
        const nullable = col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
        const length = col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : '';
        console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE}${length} ${nullable}`);
      });
    }
    
    // Verificar registros
    const count = await sql.query(`SELECT COUNT(*) as Total FROM TD_MODULE_VIEW_CONFIG`);
    console.log('\n✓ Registros en la tabla:', count.recordset[0].Total);
    
    await sql.close();
    console.log('\n✓ Verificación completada');
  } catch (err) {
    console.error('✗ Error:', err.message);
    process.exit(1);
  }
})();
