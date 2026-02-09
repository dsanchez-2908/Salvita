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

async function checkV4Trazas() {
  try {
    const pool = await sql.connect(config);
    console.log('Conectado a SQL Server\n');

    // Buscar trazas de módulos v4
    const v4Modulos = await pool.request().query(`
      SELECT Id, Nombre FROM TD_MODULOS WHERE Nombre LIKE '%v4%'
    `);

    console.log('=== MÓDULOS V4 ===\n');
    v4Modulos.recordset.forEach(m => {
      console.log(`${m.Id}: ${m.Nombre}`);
    });

    console.log('\n\n=== TRAZAS DE MÓDULOS V4 ===\n');

    for (const modulo of v4Modulos.recordset) {
      const trazas = await pool.request().query(`
        SELECT 
          Id,
          FechaHora,
          Usuario,
          Accion,
          LEFT(Detalle, 60) as Detalle
        FROM TD_MODULO_TRAZAS
        WHERE Proceso LIKE '%${modulo.Nombre}%'
        ORDER BY FechaHora DESC
      `);

      if (trazas.recordset.length > 0) {
        console.log(`\n${modulo.Nombre} (${trazas.recordset.length} trazas):`);
        console.log('─'.repeat(60));
        trazas.recordset.slice(0, 5).forEach(t => {
          const fecha = new Date(t.FechaHora).toLocaleString('es-AR');
          console.log(`[${fecha}] ${t.Usuario} - ${t.Accion}`);
          console.log(`  ${t.Detalle}`);
        });
      } else {
        console.log(`\n${modulo.Nombre}: Sin trazas registradas`);
      }
    }

    // Ver últimas 10 trazas de cualquier tipo
    console.log('\n\n=== ÚLTIMAS 10 TRAZAS (todas) ===\n');
    const ultimasTrazas = await pool.request().query(`
      SELECT TOP 10
        FechaHora,
        Usuario,
        Accion,
        Proceso
      FROM TD_MODULO_TRAZAS
      ORDER BY FechaHora DESC
    `);

    ultimasTrazas.recordset.forEach(t => {
      const fecha = new Date(t.FechaHora).toLocaleString('es-AR');
      console.log(`[${fecha}] ${t.Usuario} - ${t.Accion} - ${t.Proceso}`);
    });

    await pool.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkV4Trazas();
