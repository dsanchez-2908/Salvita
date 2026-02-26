/**
 * Script: Verificar tareas y su tipo de asignación
 * Fecha: 2025
 * Descripción: Verifica las tareas existentes y cómo están asignadas
 */

const sql = require("mssql");

const dbConfig = {
  server: "172.16.16.60",
  port: 1433,
  database: "salvita",
  user: "sa",
  password: "Lpa1234$",
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function main() {
  let pool;
  try {
    console.log("=".repeat(80));
    console.log("Verificar Tareas y Tipo de Asignación");
    console.log("=".repeat(80));

    pool = await sql.connect(dbConfig);
    console.log("✓ Conectado a la base de datos\n");

    // Total de tareas
    console.log("1. Resumen de tareas:");
    console.log("-".repeat(80));
    const totalTareas = await pool.request().query(`
      SELECT 
        COUNT(*) as Total,
        SUM(CASE WHEN Estado = 'Pendiente' THEN 1 ELSE 0 END) as Pendientes,
        SUM(CASE WHEN Estado = 'Tomada' THEN 1 ELSE 0 END) as Tomadas,
        SUM(CASE WHEN Estado = 'Finalizada' THEN 1 ELSE 0 END) as Finalizadas,
        SUM(CASE WHEN Estado = 'Rechazada' THEN 1 ELSE 0 END) as Rechazadas
      FROM TD_TAREAS
    `);
    console.log(totalTareas.recordset[0]);

    // Tareas por tipo de asignación
    console.log("\n2. Tareas por tipo de asignación:");
    console.log("-".repeat(80));
    const porTipoAsignacion = await pool.request().query(`
      SELECT 
        TipoAsignacion,
        COUNT(*) as Total,
        SUM(CASE WHEN Estado IN ('Pendiente', 'Tomada') THEN 1 ELSE 0 END) as Activas
      FROM TD_TAREAS
      GROUP BY TipoAsignacion
    `);
    porTipoAsignacion.recordset.forEach(row => {
      console.log(`${row.TipoAsignacion}: ${row.Total} tareas (${row.Activas} activas)`);
    });

    // Tareas asignadas a Usuario
    console.log("\n3. Tareas asignadas a Usuario:");
    console.log("-".repeat(80));
    const tareasUsuario = await pool.request().query(`
      SELECT 
        t.Id,
        t.Estado,
        t.TipoAsignacion,
        t.UsuarioAsignadoId,
        u.Usuario,
        u.Nombre,
        pt.Nombre as NombrePlantilla,
        t.FechaCreacion,
        t.FechaVencimiento
      FROM TD_TAREAS t
      LEFT JOIN TD_USUARIOS u ON t.UsuarioAsignadoId = u.Id
      LEFT JOIN TD_PLANTILLA_TAREAS pt ON t.PlantillaTareaId = pt.Id
      WHERE t.TipoAsignacion = 'Usuario'
      AND t.Estado IN ('Pendiente', 'Tomada')
      ORDER BY t.FechaCreacion DESC
    `);
    
    if (tareasUsuario.recordset.length === 0) {
      console.log("No hay tareas asignadas a usuarios");
    } else {
      console.log(`Total: ${tareasUsuario.recordset.length} tareas\n`);
      tareasUsuario.recordset.slice(0, 5).forEach(t => {
        console.log(`  ID ${t.Id}: ${t.NombrePlantilla || 'Sin título'}`);
        console.log(`    Usuario: ${t.Usuario} (${t.Nombre})`);
        console.log(`    Estado: ${t.Estado}`);
        console.log(`    Creada: ${t.FechaCreacion?.toISOString()?.split('T')[0]}`);
        console.log();
      });
    }

    // Tareas asignadas a Bandeja
    console.log("4. Tareas asignadas a Bandeja:");
    console.log("-".repeat(80));
    const tareasBandeja = await pool.request().query(`
      SELECT 
        t.Id,
        t.Estado,
        t.TipoAsignacion,
        t.BandejaAsignadaId,
        b.Nombre as BandejaNombre,
        pt.Nombre as NombrePlantilla,
        t.FechaCreacion,
        t.FechaVencimiento
      FROM TD_TAREAS t
      LEFT JOIN TD_BANDEJAS b ON t.BandejaAsignadaId = b.Id
      LEFT JOIN TD_PLANTILLA_TAREAS pt ON t.PlantillaTareaId = pt.Id
      WHERE t.TipoAsignacion = 'Bandeja'
      AND t.Estado IN ('Pendiente', 'Tomada')
      ORDER BY t.FechaCreacion DESC
    `);
    
    if (tareasBandeja.recordset.length === 0) {
      console.log("No hay tareas asignadas a bandejas");
    } else {
      console.log(`Total: ${tareasBandeja.recordset.length} tareas\n`);
      tareasBandeja.recordset.slice(0, 5).forEach(t => {
        console.log(`  ID ${t.Id}: ${t.NombrePlantilla || 'Sin título'}`);
        console.log(`    Bandeja: ${t.BandejaNombre} (ID: ${t.BandejaAsignadaId})`);
        console.log(`    Estado: ${t.Estado}`);
        console.log(`    Creada: ${t.FechaCreacion?.toISOString()?.split('T')[0]}`);
        console.log();
      });
    }

    // Verificar usuario "tareas" y sus bandejas
    console.log("5. Usuario 'tareas' y sus bandejas:");
    console.log("-".repeat(80));
    const usuarioTareas = await pool.request().query(`
      SELECT 
        u.Id as UsuarioId,
        u.Usuario,
        u.Nombre
      FROM TD_USUARIOS u
      WHERE u.Usuario = 'tareas'
    `);

    if (usuarioTareas.recordset.length === 0) {
      console.log("❌ No existe usuario 'tareas'");
    } else {
      const usuario = usuarioTareas.recordset[0];
      console.log(`Usuario encontrado: ID=${usuario.UsuarioId}, Usuario=${usuario.Usuario}, Nombre=${usuario.Nombre}\n`);

      // Bandejas del usuario
      const bandejas = await pool.request()
        .input('userId', sql.Int, usuario.UsuarioId)
        .query(`
          SELECT * FROM VW_BANDEJAS_POR_USUARIO
          WHERE UsuarioId = @userId
        `);

      console.log(`Bandejas asignadas: ${bandejas.recordset.length}`);
      bandejas.recordset.forEach(b => {
        console.log(`  - ${b.BandejaNombre} (ID: ${b.BandejaId})`);
      });

      // Tareas del usuario asignadas directamente
      const tareasDirectas = await pool.request()
        .input('userId', sql.Int, usuario.UsuarioId)
        .query(`
          SELECT COUNT(*) as Total
          FROM TD_TAREAS
          WHERE TipoAsignacion = 'Usuario'
          AND UsuarioAsignadoId = @userId
          AND Estado IN ('Pendiente', 'Tomada')
        `);

      console.log(`\nTareas asignadas directamente al usuario: ${tareasDirectas.recordset[0].Total}`);

      // Tareas en las bandejas del usuario
      const tareasEnBandejas = await pool.request()
        .input('userId', sql.Int, usuario.UsuarioId)
        .query(`
          SELECT COUNT(*) as Total
          FROM TD_TAREAS t
          INNER JOIN VW_BANDEJAS_POR_USUARIO vb ON t.BandejaAsignadaId = vb.BandejaId
          WHERE vb.UsuarioId = @userId
          AND t.Estado IN ('Pendiente', 'Tomada')
        `);

      console.log(`Tareas en bandejas del usuario: ${tareasEnBandejas.recordset[0].Total}`);
    }

    console.log("\n" + "=".repeat(80));
    console.log("✓ Verificación completada");
    console.log("=".repeat(80));

  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

main();
