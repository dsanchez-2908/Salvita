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
    enableArithAbort: true,
  },
};

async function checkUsuarios() {
  try {
    await sql.connect(config);
    console.log('✓ Conectado\n');

    // Verificar Alumnos v3
    console.log('=== ALUMNOS V3 ===');
    const alumnos = await sql.query`
      SELECT Id, NombreCompleto, UsuarioCreacion, FechaCreacion
      FROM TD_MODULO_Alumnosv3
    `;
    alumnos.recordset.forEach(a => {
      console.log(`[ID: ${a.Id}] ${a.NombreCompleto} - Usuario: ${a.UsuarioCreacion || 'NULL'}`);
    });

    // Verificar estructura de la tabla para ver el tipo de dato
    console.log('\n=== ESTRUCTURA UsuarioCreacion ===');
    const estructura = await sql.query`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'TD_MODULO_Alumnosv3'
      AND COLUMN_NAME IN ('UsuarioCreacion', 'UsuarioModificacion')
    `;
    estructura.recordset.forEach(c => {
      console.log(`${c.COLUMN_NAME}: ${c.DATA_TYPE}(${c.CHARACTER_MAXIMUM_LENGTH || 'n/a'}) - Nullable: ${c.IS_NULLABLE}`);
    });

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await sql.close();
  }
}

checkUsuarios();
