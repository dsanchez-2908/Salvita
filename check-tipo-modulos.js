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

async function checkTipoValues() {
  try {
    await sql.connect(config);
    console.log('Conectado a la base de datos\n');

    console.log('=== VALORES ÚNICOS DE TIPO EN TD_MODULOS ===');
    const tipos = await sql.query`
      SELECT DISTINCT Tipo
      FROM TD_MODULOS
      ORDER BY Tipo
    `;
    
    tipos.recordset.forEach(row => {
      console.log(`- ${row.Tipo}`);
    });

    // Ver la definición del CHECK CONSTRAINT
    console.log('\n=== DEFINICIÓN DEL CHECK CONSTRAINT ===');
    const constraint = await sql.query`
      SELECT 
        cc.name AS ConstraintName,
        cc.definition AS Definition
      FROM sys.check_constraints cc
      INNER JOIN sys.tables t ON cc.parent_object_id = t.object_id
      WHERE t.name = 'TD_MODULOS'
      AND cc.name LIKE '%Tipo%'
    `;

    if (constraint.recordset.length > 0) {
      console.log(`Constraint: ${constraint.recordset[0].ConstraintName}`);
      console.log(`Definición: ${constraint.recordset[0].Definition}`);
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await sql.close();
  }
}

checkTipoValues();
