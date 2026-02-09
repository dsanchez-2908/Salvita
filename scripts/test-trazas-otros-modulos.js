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

async function testOtrosModulos() {
  try {
    const pool = await sql.connect(config);
    console.log('Conectado a SQL Server\n');

    // Probar con otros módulos
    const modulosPrueba = ['Profesores v4', 'Gestión de Módulos'];
    
    for (const nombreModulo of modulosPrueba) {
      console.log(`=== PROBANDO: ${nombreModulo} ===\n`);
      
      // Si es un módulo con formato "Módulo: X"
      if (nombreModulo !== 'Gestión de Módulos') {
        const modulosResult = await pool
          .request()
          .input("nombreModulo", sql.NVarChar, nombreModulo)
          .query(`
            DECLARE @ModuloPadreId INT;
            SELECT @ModuloPadreId = Id FROM TD_MODULOS WHERE Nombre = @nombreModulo;
            
            SELECT Nombre 
            FROM TD_MODULOS 
            WHERE Id = @ModuloPadreId
            
            UNION
            
            SELECT m.Nombre
            FROM TR_MODULO_RELACION r
            INNER JOIN TD_MODULOS m ON r.ModuloHijoId = m.Id
            WHERE r.ModuloPadreId = @ModuloPadreId
          `);
        
        console.log('Módulos encontrados:');
        if (modulosResult.recordset.length === 0) {
          console.log('  (ninguno)');
        } else {
          modulosResult.recordset.forEach(m => {
            console.log(`  - ${m.Nombre}`);
          });
        }
        
        const procesosModulos = modulosResult.recordset.map(m => `Módulo: ${m.Nombre}`);
        
        if (procesosModulos.length > 0) {
          const request = pool.request();
          const placeholders = procesosModulos.map((_, index) => `@proceso${index}`).join(", ");
          procesosModulos.forEach((proc, index) => {
            request.input(`proceso${index}`, sql.NVarChar, proc);
          });
          
          const trazasQuery = `
            SELECT COUNT(*) as Total, Proceso
            FROM TD_MODULO_TRAZAS
            WHERE Proceso IN (${placeholders})
            GROUP BY Proceso
          `;
          
          const trazasResult = await request.query(trazasQuery);
          
          console.log('\nTrazas por módulo:');
          if (trazasResult.recordset.length === 0) {
            console.log('  (ninguna)');
          } else {
            trazasResult.recordset.forEach(t => {
              console.log(`  ${t.Proceso}: ${t.Total} trazas`);
            });
          }
        }
      } else {
        // Para "Gestión de Módulos"
        const request = pool.request();
        request.input("proceso", sql.NVarChar, `%${nombreModulo}%`);
        
        const trazasQuery = `
          SELECT COUNT(*) as Total
          FROM TD_MODULO_TRAZAS
          WHERE Proceso LIKE @proceso
        `;
        
        const trazasResult = await request.query(trazasQuery);
        console.log(`Total trazas: ${trazasResult.recordset[0].Total}`);
      }
      
      console.log('\n' + '='.repeat(60) + '\n');
    }

    await pool.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

testOtrosModulos();
