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

async function testTrazasConHijos() {
  try {
    const pool = await sql.connect(config);
    console.log('Conectado a SQL Server\n');

    const nombreModulo = 'Alumnos v4';
    
    console.log(`=== PROBANDO CONSULTA PARA: ${nombreModulo} ===\n`);
    
    // 1. Obtener el módulo y sus hijos
    const modulosResult = await pool
      .request()
      .input("nombreModulo", sql.NVarChar, nombreModulo)
      .query(`
        -- Obtener el ID del módulo padre
        DECLARE @ModuloPadreId INT;
        SELECT @ModuloPadreId = Id FROM TD_MODULOS WHERE Nombre = @nombreModulo;
        
        -- Obtener el nombre del módulo padre y todos sus hijos
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
    modulosResult.recordset.forEach(m => {
      console.log(`  - ${m.Nombre}`);
    });
    
    // 2. Construir lista de procesos
    const procesosModulos = modulosResult.recordset.map(m => `Módulo: ${m.Nombre}`);
    console.log('\nProcesos a buscar:');
    procesosModulos.forEach(p => {
      console.log(`  - ${p}`);
    });
    
    // 3. Buscar trazas de todos esos módulos
    console.log('\n=== TRAZAS ENCONTRADAS ===\n');
    
    const request = pool.request();
    const placeholders = procesosModulos.map((_, index) => `@proceso${index}`).join(", ");
    procesosModulos.forEach((proc, index) => {
      request.input(`proceso${index}`, sql.NVarChar, proc);
    });
    
    const trazasQuery = `
      SELECT 
        t.Id,
        t.FechaHora,
        t.Usuario,
        t.Accion,
        t.Proceso,
        LEFT(t.Detalle, 100) as Detalle
      FROM TD_MODULO_TRAZAS t
      WHERE t.Proceso IN (${placeholders})
      ORDER BY t.FechaHora DESC
    `;
    
    const trazasResult = await request.query(trazasQuery);
    
    if (trazasResult.recordset.length === 0) {
      console.log('No se encontraron trazas');
    } else {
      console.log(`Total encontradas: ${trazasResult.recordset.length}\n`);
      
      // Agrupar por módulo
      const porModulo = {};
      trazasResult.recordset.forEach(t => {
        if (!porModulo[t.Proceso]) {
          porModulo[t.Proceso] = [];
        }
        porModulo[t.Proceso].push(t);
      });
      
      Object.keys(porModulo).forEach(proceso => {
        console.log(`\n--- ${proceso} (${porModulo[proceso].length} trazas) ---`);
        porModulo[proceso].slice(0, 5).forEach(t => {
          const fecha = new Date(t.FechaHora).toLocaleString('es-AR');
          console.log(`  [${fecha}] ${t.Usuario} - ${t.Accion}`);
          console.log(`    ${t.Detalle}`);
        });
        if (porModulo[proceso].length > 5) {
          console.log(`  ... y ${porModulo[proceso].length - 5} más`);
        }
      });
    }

    await pool.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

testTrazasConHijos();
