const sql = require('mssql');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME || 'salvita',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'false',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    enableArithAbort: true,
  },
  port: parseInt(process.env.DB_PORT || '1433'),
};

async function runMigration() {
  let pool;
  
  try {
    console.log('🔄 Conectando a la base de datos...');
    pool = await sql.connect(config);
    console.log('✅ Conectado exitosamente\n');

    // Leer el archivo SQL
    const sqlFilePath = path.join(__dirname, '../database/migrations/create_trazas_table.sql');
    const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('📄 Ejecutando migración: create_trazas_table.sql\n');

    // Dividir por GO ya que mssql no lo soporta directamente
    const batches = sqlScript
      .split(/\bGO\b/gi)
      .map(batch => batch.trim())
      .filter(batch => batch.length > 0);

    for (let i = 0; i < batches.length; i++) {
      console.log(`📦 Ejecutando batch ${i + 1}/${batches.length}...`);
      const result = await pool.request().query(batches[i]);
      
      // Mostrar mensajes de PRINT del SQL
      if (result.output) {
        console.log(`   ${result.output}`);
      }
    }

    console.log('\n✅ Migración completada exitosamente');
    console.log('✅ Tabla TD_TRAZAS creada o ya existía\n');

    // Verificar que la tabla existe
    const verification = await pool.request().query(`
      SELECT 
        t.name AS TableName,
        c.name AS ColumnName,
        ty.name AS DataType,
        c.max_length AS MaxLength
      FROM sys.tables t
      INNER JOIN sys.columns c ON t.object_id = c.object_id
      INNER JOIN sys.types ty ON c.user_type_id = ty.user_type_id
      WHERE t.name = 'TD_TRAZAS'
      ORDER BY c.column_id
    `);

    if (verification.recordset.length > 0) {
      console.log('📋 Estructura de la tabla TD_TRAZAS:');
      console.log('════════════════════════════════════════════════');
      verification.recordset.forEach(col => {
        console.log(`   ${col.ColumnName.padEnd(15)} | ${col.DataType.padEnd(15)} | ${col.MaxLength > 0 ? col.MaxLength : 'N/A'}`);
      });
      console.log('════════════════════════════════════════════════\n');
    }

    // Verificar índices
    const indexes = await pool.request().query(`
      SELECT 
        i.name AS IndexName,
        c.name AS ColumnName
      FROM sys.indexes i
      INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
      INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
      INNER JOIN sys.tables t ON i.object_id = t.object_id
      WHERE t.name = 'TD_TRAZAS' AND i.is_primary_key = 0
      ORDER BY i.name, ic.key_ordinal
    `);

    if (indexes.recordset.length > 0) {
      console.log('🔍 Índices creados:');
      console.log('════════════════════════════════════════════════');
      indexes.recordset.forEach(idx => {
        console.log(`   ${idx.IndexName} (${idx.ColumnName})`);
      });
      console.log('════════════════════════════════════════════════\n');
    }

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('🔌 Conexión cerrada');
    }
  }
}

// Ejecutar migración
console.log('🚀 Iniciando migración de tabla TD_TRAZAS\n');
runMigration().then(() => {
  console.log('\n✨ Proceso completado exitosamente');
  process.exit(0);
}).catch(err => {
  console.error('\n💥 Error fatal:', err);
  process.exit(1);
});
