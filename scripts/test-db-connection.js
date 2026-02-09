const sql = require('mssql');

const testConnections = async () => {
  console.log('Probando conexiones a SQL Server...\n');

  // Configuración 1: Con authentication object (como está actualmente)
  const config1 = {
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

  // Configuración 2: Con user/password directo
  const config2 = {
    server: '172.16.16.60',
    port: 1433,
    database: 'salvita',
    user: 'sa',
    password: 'Lpa1234$',
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true
    }
  };

  // Probar config1
  console.log('Probando configuración 1 (con authentication object):');
  try {
    const pool1 = await sql.connect(config1);
    const result1 = await pool1.request().query('SELECT DB_NAME() as db, CURRENT_USER as usuario');
    console.log('✓ Conexión exitosa!');
    console.log('  Base de datos:', result1.recordset[0].db);
    console.log('  Usuario:', result1.recordset[0].usuario);
    await pool1.close();
  } catch (error) {
    console.log('✗ Error:', error.message);
  }

  console.log('\n' + '-'.repeat(60) + '\n');

  // Probar config2
  console.log('Probando configuración 2 (con user/password directo):');
  try {
    const pool2 = await sql.connect(config2);
    const result2 = await pool2.request().query('SELECT DB_NAME() as db, CURRENT_USER as usuario');
    console.log('✓ Conexión exitosa!');
    console.log('  Base de datos:', result2.recordset[0].db);
    console.log('  Usuario:', result2.recordset[0].usuario);
    await pool2.close();
  } catch (error) {
    console.log('✗ Error:', error.message);
  }
};

testConnections()
  .then(() => {
    console.log('\nPruebas completadas.');
    process.exit(0);
  })
  .catch(err => {
    console.error('\nError general:', err);
    process.exit(1);
  });
