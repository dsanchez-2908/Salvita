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

async function checkRoles() {
  try {
    await sql.connect(config);
    console.log('Conectado a la base de datos\n');

    console.log('=== ROLES EXISTENTES ===');
    const roles = await sql.query`
      SELECT Id, Nombre, Descripcion
      FROM TD_ROLES
      ORDER BY Id
    `;
    
    roles.recordset.forEach(rol => {
      console.log(`ID: ${rol.Id} - ${rol.Nombre} (${rol.Descripcion || 'sin descripción'})`);
    });

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await sql.close();
  }
}

checkRoles();
