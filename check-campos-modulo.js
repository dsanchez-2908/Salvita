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

async function checkCampos() {
  try {
    await sql.connect(config);
    console.log('Conectado a la base de datos');

    // Verificar módulo
    const modulo = await sql.query`SELECT * FROM TD_MODULOS WHERE Id = 1027`;
    console.log('\n=== MÓDULO 1027 ===');
    console.log(modulo.recordset[0]);

    // Verificar campos
    const campos = await sql.query`
      SELECT 
        Id, 
        Nombre, 
        NombreColumna, 
        TipoDato, 
        VisibleEnGrilla, 
        Orden
      FROM TD_CAMPOS 
      WHERE ModuloId = 1027
      ORDER BY Orden, Nombre`;
    
    console.log('\n=== CAMPOS DEL MÓDULO 1027 ===');
    console.log(`Total de campos: ${campos.recordset.length}`);
    
    if (campos.recordset.length > 0) {
      console.log('\nCampos configurados:');
      campos.recordset.forEach(campo => {
        console.log(`  - ${campo.Nombre} (${campo.NombreColumna}) - VisibleEnGrilla: ${campo.VisibleEnGrilla}`);
      });
      
      const visibles = campos.recordset.filter(c => c.VisibleEnGrilla);
      console.log(`\nCampos visibles en grilla: ${visibles.length}`);
    } else {
      console.log('⚠️  EL MÓDULO NO TIENE CAMPOS CONFIGURADOS');
    }

    await sql.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkCampos();
