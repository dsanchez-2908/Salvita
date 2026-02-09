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

async function checkTrazas() {
  try {
    const pool = await sql.connect(config);
    console.log('Conectado a SQL Server\n');

    // Verificar trazas recientes
    const result = await pool.request().query(`
      SELECT TOP 20
        t.Id,
        t.UsuarioId,
        t.Usuario,
        t.Accion,
        t.Proceso,
        LEFT(t.Detalle, 100) as Detalle,
        t.FechaCreacion
      FROM TD_MODULO_TRAZAS t
      ORDER BY t.FechaCreacion DESC
    `);

    console.log('=== ÚLTIMAS 20 TRAZAS ===\n');
    if (result.recordset.length === 0) {
      console.log('No hay trazas registradas');
    } else {
      result.recordset.forEach(t => {
        console.log(`[${t.FechaCreacion.toLocaleString('es-AR')}] ${t.Usuario || 'N/A'} - ${t.Accion}`);
        console.log(`  Proceso: ${t.Proceso}`);
        console.log(`  Detalle: ${t.Detalle}`);
        console.log('');
      });
    }

    // Contar trazas por acción en las últimas 24 horas
    const stats = await pool.request().query(`
      SELECT 
        Accion,
        COUNT(*) as Total
      FROM TD_MODULO_TRAZAS
      WHERE FechaCreacion >= DATEADD(hour, -24, GETDATE())
      GROUP BY Accion
      ORDER BY Total DESC
    `);

    console.log('\n=== ESTADÍSTICAS (últimas 24 horas) ===\n');
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

checkTrazas();
