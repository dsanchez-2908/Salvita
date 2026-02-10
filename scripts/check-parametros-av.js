const sql = require('mssql');

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

async function checkParametrosAV() {
  try {
    await sql.connect(config);
    console.log('✓ Conectado a SQL Server\n');

    // Verificar si la tabla existe
    const tableCheck = await sql.query`
      SELECT 
        OBJECT_ID('TD_PARAMETROS_AV') as TableId,
        CASE WHEN OBJECT_ID('TD_PARAMETROS_AV') IS NOT NULL THEN 'Existe' ELSE 'No existe' END as Estado
    `;
    
    console.log('Estado de la tabla TD_PARAMETROS_AV:', tableCheck.recordset[0].Estado);
    
    if (tableCheck.recordset[0].TableId) {
      // Ver columnas de la tabla
      const columns = await sql.query`
        SELECT 
          COLUMN_NAME,
          DATA_TYPE,
          CHARACTER_MAXIMUM_LENGTH,
          IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'TD_PARAMETROS_AV'
        ORDER BY ORDINAL_POSITION
      `;
      
      console.log('\nColumnas de TD_PARAMETROS_AV:');
      console.log('------------------------------');
      columns.recordset.forEach(col => {
        const length = col.CHARACTER_MAXIMUM_LENGTH === -1 ? 'MAX' : col.CHARACTER_MAXIMUM_LENGTH;
        console.log(`  ${col.COLUMN_NAME} (${col.DATA_TYPE}${length ? `(${length})` : ''}) - Nullable: ${col.IS_NULLABLE}`);
      });
      
      // Ver si hay registros
      const count = await sql.query`SELECT COUNT(*) as Total FROM TD_PARAMETROS_AV`;
      console.log(`\nTotal de registros: ${count.recordset[0].Total}`);
    }
    
    // Verificar vista
    const viewCheck = await sql.query`
      SELECT 
        OBJECT_ID('VW_PARAMETROS_AV') as ViewId,
        CASE WHEN OBJECT_ID('VW_PARAMETROS_AV') IS NOT NULL THEN 'Existe' ELSE 'No existe' END as Estado
    `;
    
    console.log(`\nEstado de la vista VW_PARAMETROS_AV: ${viewCheck.recordset[0].Estado}`);
    
    await sql.close();
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

checkParametrosAV();
