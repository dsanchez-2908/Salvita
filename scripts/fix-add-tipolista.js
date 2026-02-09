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

async function addTipoListaColumn() {
  try {
    const pool = await sql.connect(config);
    console.log('Conectado a SQL Server\n');

    // Agregar columna TipoLista
    console.log('Agregando columna TipoLista...');
    await pool.request().query(`
      ALTER TABLE TD_LISTAS 
      ADD [TipoLista] VARCHAR(20) NOT NULL DEFAULT 'ValoresFijos'
    `);
    console.log('✓ Columna TipoLista agregada');

    // Agregar CHECK constraint
    console.log('\nAgregando CHECK constraint...');
    await pool.request().query(`
      ALTER TABLE TD_LISTAS 
      ADD CONSTRAINT CK_TD_LISTAS_TipoLista 
      CHECK ([TipoLista] IN ('ValoresFijos', 'ValoresModulo', 'ValoresAPI'))
    `);
    console.log('✓ CHECK constraint agregado');

    // Verificar
    console.log('\nVerificando columna...');
    const result = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'TD_LISTAS' AND COLUMN_NAME = 'TipoLista'
    `);

    if (result.recordset.length > 0) {
      console.log('✓ Columna TipoLista existe:');
      console.log(result.recordset[0]);
    }

    await pool.close();
    console.log('\n✓ Migración completada correctamente');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

addTipoListaColumn();
