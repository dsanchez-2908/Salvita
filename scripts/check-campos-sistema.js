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
  },
};

async function checkCamposSistema() {
  try {
    const pool = await sql.connect(config);
    console.log('Conectado a SQL Server\n');

    // Obtener un módulo de ejemplo
    const moduloResult = await pool.request().query(`
      SELECT TOP 1 Id, Nombre, NombreTabla 
      FROM TD_MODULOS 
      WHERE NombreTabla LIKE 'TD_MODULO_%'
      ORDER BY Id DESC
    `);

    if (moduloResult.recordset.length === 0) {
      console.log('No hay módulos en el sistema');
      await pool.close();
      process.exit(0);
    }

    const modulo = moduloResult.recordset[0];
    console.log(`=== Verificando campos del sistema en: ${modulo.Nombre} ===`);
    console.log(`Tabla: ${modulo.NombreTabla}\n`);

    // Verificar columnas de la tabla
    const columnasResult = await pool.request()
      .input('tableName', sql.NVarChar, modulo.NombreTabla)
      .query(`
        SELECT 
          COLUMN_NAME,
          DATA_TYPE,
          IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = @tableName
          AND COLUMN_NAME IN ('FechaCreacion', 'UsuarioCreacion', 'FechaModificacion', 'UsuarioModificacion')
        ORDER BY COLUMN_NAME
      `);

    if (columnasResult.recordset.length === 0) {
      console.log('❌ No se encontraron campos del sistema (FechaCreacion, UsuarioCreacion, etc.)');
    } else {
      console.log('✅ Campos del sistema encontrados:\n');
      columnasResult.recordset.forEach(col => {
        console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE}${col.IS_NULLABLE === 'YES' ? ', nullable' : ', not null'})`);
      });
    }

    // Obtener un registro de ejemplo
    console.log('\n=== Registro de ejemplo ===\n');
    const registroResult = await pool.request().query(`
      SELECT TOP 1 
        Id,
        FechaCreacion,
        UsuarioCreacion,
        FechaModificacion,
        UsuarioModificacion
      FROM [${modulo.NombreTabla}]
      ORDER BY Id DESC
    `);

    if (registroResult.recordset.length === 0) {
      console.log('No hay registros en este módulo');
    } else {
      const registro = registroResult.recordset[0];
      console.log(`ID: ${registro.Id}`);
      console.log(`Fecha Creación: ${registro.FechaCreacion ? new Date(registro.FechaCreacion).toLocaleString('es-AR') : 'NULL'}`);
      console.log(`Usuario Creación: ${registro.UsuarioCreacion || 'NULL'}`);
      console.log(`Fecha Modificación: ${registro.FechaModificacion ? new Date(registro.FechaModificacion).toLocaleString('es-AR') : 'NULL'}`);
      console.log(`Usuario Modificación: ${registro.UsuarioModificacion || 'NULL'}`);
    }

    await pool.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkCamposSistema();
