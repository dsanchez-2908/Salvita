const sql = require('mssql');

const config = {
  server: 'localhost',
  database: 'Salvita',
  user: 'sa',
  password: '123',
  options: {
    encrypt: true,
    trustServerCertificate: true,
    instanceName: 'SQLEXPRESS',
  },
};

async function checkParameters() {
  try {
    console.log('Conectando a la base de datos...\n');
    await sql.connect(config);
    
    const result = await sql.query`
      SELECT Parametro, Valor 
      FROM TD_PARAMETROS 
      WHERE Parametro IN (
        'URL Token',
        'Usuario Token',
        'Clave Token',
        'URL BASE Agregar Documento',
        'URL BASE Visor',
        'Codigo libreria',
        'Codigo de clase'
      )
      ORDER BY Parametro
    `;

    console.log('=== PARÁMETROS DE ADITUS ===\n');
    
    const params = {
      'URL Token': null,
      'Usuario Token': null,
      'Clave Token': null,
      'URL BASE Agregar Documento': null,
      'URL BASE Visor': null,
      'Codigo libreria': null,
      'Codigo de clase': null
    };

    result.recordset.forEach(row => {
      params[row.Parametro] = row.Valor;
      const maskedValue = row.Parametro.includes('Clave') || row.Parametro.includes('Token')
        ? (row.Valor ? '***' + row.Valor.slice(-4) : 'NO CONFIGURADO')
        : row.Valor || 'NO CONFIGURADO';
      
      console.log(`${row.Parametro}:`);
      console.log(`  ${maskedValue}\n`);
    });

    console.log('=== VERIFICACIÓN ===\n');
    
    let allConfigured = true;
    Object.keys(params).forEach(key => {
      const isConfigured = params[key] && params[key].trim() !== '';
      const status = isConfigured ? '✅' : '❌';
      console.log(`${status} ${key}`);
      if (!isConfigured) allConfigured = false;
    });

    console.log('\n');
    
    if (allConfigured) {
      console.log('✅ Todos los parámetros están configurados\n');
    } else {
      console.log('⚠️  Hay parámetros sin configurar. Por favor, actualiza TD_PARAMETROS\n');
      console.log('Ejemplo:');
      console.log('UPDATE TD_PARAMETROS SET Valor = \'tu_valor\' WHERE Parametro = \'URL Token\'\n');
    }

    await sql.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkParameters();
