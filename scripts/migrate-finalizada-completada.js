const sql = require("mssql");
const fs = require("fs");
const path = require("path");

// Cargar variables de entorno desde .env.local
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const config = {
  user: process.env.DB_USER || "sa",
  password: process.env.DB_PASSWORD || "yourStrong(!)Password",
  server: process.env.DB_SERVER || "localhost",
  database: process.env.DB_NAME || "Salvita",
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    enableArithAbort: true,
  },
};

async function runMigration() {
  let pool;
  try {
    console.log("Conectando a la base de datos...");
    pool = await sql.connect(config);
    console.log("✓ Conexión establecida\n");

    // Leer el archivo de migración
    const migrationPath = path.join(
      __dirname,
      "..",
      "database",
      "migrations",
      "migrate_finalizada_a_completada.sql"
    );
    
    console.log(`Leyendo script de migración: ${migrationPath}\n`);
    const migrationScript = fs.readFileSync(migrationPath, "utf8");

    // Dividir el script en batches usando GO como delimitador
    const batches = migrationScript
      .split(/^\s*GO\s*$/gim)
      .map(batch => batch.trim())
      .filter(batch => batch.length > 0);

    // Ejecutar la migración
    console.log(`Ejecutando ${batches.length} batch(es)...\n`);
    console.log("=".repeat(65));
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      if (batch.trim()) {
        console.log(`\nEjecutando batch ${i + 1}/${batches.length}...`);
        const request = pool.request();
        await request.query(batch);
      }
    }

    // Obtener resumen final
    console.log("\nObteniendo resumen de migración...");
    
    const tareas = await pool.request().query(`
      SELECT 
        'TD_TAREAS' as Tabla,
        COUNT(*) as TotalTareas,
        SUM(CASE WHEN Estado = 'Completada' THEN 1 ELSE 0 END) as Completadas
      FROM [dbo].[TD_TAREAS]
    `);
    
    const registros = await pool.request().query(`
      SELECT 
        'TR_TAREA_REGISTRO' as Tabla,
        COUNT(*) as TotalRegistros,
        SUM(CASE WHEN Estado = 'Completada' THEN 1 ELSE 0 END) as Completados
      FROM [dbo].[TR_TAREA_REGISTRO]
    `);
    
    const historial = await pool.request().query(`
      SELECT 
        'TD_TAREA_HISTORIAL' as Tabla,
        COUNT(*) as TotalHistorial,
        SUM(CASE WHEN Accion = 'Completar' THEN 1 ELSE 0 END) as AccionesCompletar
      FROM [dbo].[TD_TAREA_HISTORIAL]
    `);

    // Mostrar resumen
    console.log("\nResumen de migración:");
    console.table([
      ...tareas.recordset,
      ...registros.recordset,
      ...historial.recordset
    ]);

    console.log("\n" + "=".repeat(65));
    console.log("✓ Migración completada exitosamente");
    console.log("=".repeat(65));

  } catch (err) {
    console.error("\n" + "=".repeat(65));
    console.error("✗ Error durante la migración:");
    console.error("=".repeat(65));
    console.error(err);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log("\n✓ Conexión cerrada");
    }
  }
}

// Ejecutar la migración
runMigration();
