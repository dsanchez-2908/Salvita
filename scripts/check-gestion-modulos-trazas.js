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

async function checkGestionModulosTrazas() {
  try {
    const pool = await sql.connect(config);
    console.log('Conectado a SQL Server\n');

    // Ver todas las trazas de gestión de módulos (viejas y nuevas)
    const result = await pool.request().query(`
      SELECT 
        Id,
        FechaHora,
        Usuario,
        Accion,
        Proceso,
        LEFT(Detalle, 120) as Detalle
      FROM TD_MODULO_TRAZAS
      WHERE Proceso IN ('MODULOS_V2', 'Gestión de Módulos')
      ORDER BY FechaHora DESC
    `);

    console.log('=== TRAZAS DE GESTIÓN DE MÓDULOS ===\n');
    if (result.recordset.length === 0) {
      console.log('No hay trazas de gestión de módulos');
    } else {
      console.log(`Total encontradas: ${result.recordset.length}\n`);
      result.recordset.forEach(t => {
        const fecha = new Date(t.FechaHora).toLocaleString('es-AR');
        console.log(`[${fecha}] ${t.Usuario} - ${t.Accion}`);
        console.log(`  Proceso: ${t.Proceso}`);
        console.log(`  Detalle: ${t.Detalle}`);
        console.log('');
      });
    }

    // Resumen por acción
    console.log('\n=== RESUMEN POR ACCIÓN ===\n');
    const stats = await pool.request().query(`
      SELECT 
        Accion,
        COUNT(*) as Total
      FROM TD_MODULO_TRAZAS
      WHERE Proceso IN ('MODULOS_V2', 'Gestión de Módulos')
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

checkGestionModulosTrazas();
