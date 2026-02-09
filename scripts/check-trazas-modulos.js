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

async function checkRecentTrazas() {
  try {
    const pool = await sql.connect(config);
    console.log('Conectado a SQL Server\n');

    // Ver trazas de módulos de las últimas horas
    const result = await pool.request().query(`
      SELECT TOP 30
        Id,
        FechaHora,
        Usuario,
        Accion,
        Proceso,
        LEFT(Detalle, 80) as Detalle
      FROM TD_MODULO_TRAZAS
      WHERE Proceso LIKE '%Módulo:%'
      ORDER BY FechaHora DESC
    `);

    console.log('=== TRAZAS DE MÓDULOS (últimas 30) ===\n');
    if (result.recordset.length === 0) {
      console.log('No hay trazas de módulos registradas');
    } else {
      result.recordset.forEach(t => {
        const fecha = new Date(t.FechaHora).toLocaleString('es-AR');
        console.log(`[${fecha}] ${t.Usuario} - ${t.Accion}`);
        console.log(`  Proceso: ${t.Proceso}`);
        console.log(`  Detalle: ${t.Detalle}`);
        console.log('');
      });
    }

    // Contar por acción
    console.log('\n=== RESUMEN POR ACCIÓN (procesos de módulos) ===\n');
    const stats = await pool.request().query(`
      SELECT 
        Accion,
        COUNT(*) as Total
      FROM TD_MODULO_TRAZAS
      WHERE Proceso LIKE '%Módulo:%'
      GROUP BY Accion
      ORDER BY Total DESC
    `);

    stats.recordset.forEach(s => {
      console.log(`${s.Accion}: ${s.Total}`);
    });

    await pool.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkRecentTrazas();
