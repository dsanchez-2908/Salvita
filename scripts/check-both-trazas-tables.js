const sql = require('mssql');
require('dotenv').config({ path: '.env.local' });

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME || 'salvita',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'false',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    enableArithAbort: true,
  },
  port: parseInt(process.env.DB_PORT || '1433'),
};

async function checkTables() {
  let pool;
  
  try {
    console.log('🔍 Verificando tablas de trazas...\n');
    pool = await sql.connect(config);

    // Verificar TD_MODULO_TRAZAS
    console.log('=== TD_MODULO_TRAZAS ===');
    try {
      const moduloResult = await pool.request().query(`
        SELECT COUNT(*) as Total FROM TD_MODULO_TRAZAS
      `);
      console.log(`✅ Existe con ${moduloResult.recordset[0].Total} registros`);
      
      if (moduloResult.recordset[0].Total > 0) {
        const sample = await pool.request().query(`
          SELECT TOP 3 FechaHora, Usuario, Accion, Proceso, LEFT(Detalle, 50) as Detalle
          FROM TD_MODULO_TRAZAS 
          ORDER BY FechaHora DESC
        `);
        console.log('\nÚltimos 3 registros:');
        sample.recordset.forEach(r => {
          console.log(`  - ${r.FechaHora.toISOString()} | ${r.Usuario} | ${r.Accion} | ${r.Proceso}`);
        });
      }
    } catch (e) {
      console.log('❌ No existe');
    }

    // Verificar TD_TRAZAS
    console.log('\n=== TD_TRAZAS ===');
    try {
      const trazasResult = await pool.request().query(`
        SELECT COUNT(*) as Total FROM TD_TRAZAS
      `);
      console.log(`✅ Existe con ${trazasResult.recordset[0].Total} registros`);
      
      if (trazasResult.recordset[0].Total > 0) {
        const sample = await pool.request().query(`
          SELECT TOP 3 FechaHora, Usuario, Accion, Proceso, LEFT(Detalle, 50) as Detalle
          FROM TD_TRAZAS 
          ORDER BY FechaHora DESC
        `);
        console.log('\nÚltimos 3 registros:');
        sample.recordset.forEach(r => {
          console.log(`  - ${r.FechaHora.toISOString()} | ${r.Usuario} | ${r.Accion} | ${r.Proceso}`);
        });
      }
    } catch (e) {
      console.log('❌ No existe');
    }

    await pool.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkTables();
