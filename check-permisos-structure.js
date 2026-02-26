const sql = require('mssql');

const config = {
  user: 'sa',
  password: 'Lpa1234$',
  server: '172.16.16.60',
  database: 'salvita',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function checkPermisosStructure() {
  try {
    await sql.connect(config);
    console.log('Conectado a la base de datos\n');

    // Ver estructura de TD_MODULOS
    console.log('=== ESTRUCTURA TD_MODULOS ===');
    const modulos = await sql.query`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'TD_MODULOS'
      ORDER BY ORDINAL_POSITION
    `;
    modulos.recordset.forEach(col => {
      console.log(`${col.COLUMN_NAME.padEnd(25)} ${col.DATA_TYPE}`);
    });

    // Ver estructura de TR_ROL_MODULO_PERMISO
    console.log('\n=== ESTRUCTURA TR_ROL_MODULO_PERMISO ===');
    const permisos = await sql.query`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'TR_ROL_MODULO_PERMISO'
      ORDER BY ORDINAL_POSITION
    `;
    permisos.recordset.forEach(col => {
      console.log(`${col.COLUMN_NAME.padEnd(25)} ${col.DATA_TYPE}`);
    });

    // Ver un ejemplo de módulo
    console.log('\n=== EJEMPLO DE MÓDULO ===');
    const ejemplo = await sql.query`
      SELECT TOP 1 * FROM TD_MODULOS
    `;
    if (ejemplo.recordset.length > 0) {
      console.log(JSON.stringify(ejemplo.recordset[0], null, 2));
    }

    // Ver si existe tabla de campos sistema
    console.log('\n=== VERIFICAR TD_CAMPOS_SISTEMA ===');
    const camposSistema = await sql.query`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_NAME = 'TD_CAMPOS_SISTEMA'
    `;
    if (camposSistema.recordset.length > 0) {
      console.log('✓ Tabla TD_CAMPOS_SISTEMA existe');
      const campos = await sql.query`
        SELECT COLUMN_NAME, DATA_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'TD_CAMPOS_SISTEMA'
        ORDER BY ORDINAL_POSITION
      `;
      campos.recordset.forEach(col => {
        console.log(`  ${col.COLUMN_NAME.padEnd(25)} ${col.DATA_TYPE}`);
      });
    } else {
      console.log('✗ Tabla TD_CAMPOS_SISTEMA NO existe');
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await sql.close();
  }
}

checkPermisosStructure();
