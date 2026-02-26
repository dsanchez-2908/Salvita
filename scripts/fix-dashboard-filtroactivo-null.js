/**
 * Script: Permitir NULL en FiltroActivo de TD_DASHBOARD_CONFIG
 * Fecha: 2025
 * Descripción: Modifica FiltroActivo para permitir NULL (para widgets de Tareas)
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
    console.log("=".repeat(60));
    console.log("Modificar FiltroActivo para permitir NULL");
    console.log("=".repeat(60));

    pool = await sql.connect(dbConfig);
    console.log("✓ Conectado a la base de datos\n");

    // 1. Verificar estructura actual
    console.log("1. Verificando estructura actual...");
    const checkColumn = await pool.request().query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'TD_DASHBOARD_CONFIG'
      AND COLUMN_NAME = 'FiltroActivo'
    `);

    if (checkColumn.recordset.length > 0) {
      const col = checkColumn.recordset[0];
      console.log(`   Columna: ${col.COLUMN_NAME}`);
      console.log(`   Tipo: ${col.DATA_TYPE}`);
      console.log(`   Permite NULL: ${col.IS_NULLABLE}`);
      console.log(`   Default: ${col.COLUMN_DEFAULT || 'N/A'}`);

      if (col.IS_NULLABLE === 'YES') {
        console.log("\n✓ La columna ya permite NULL. No se requiere modificación.");
        return;
      }
    } else {
      console.log("   ❌ No se encontró la columna FiltroActivo");
      return;
    }

    // 2. Modificar columna para permitir NULL y quitar default
    console.log("\n2. Modificando columna para permitir NULL...");
    await pool.request().query(`
      ALTER TABLE TD_DASHBOARD_CONFIG
      ALTER COLUMN FiltroActivo BIT NULL
    `);
    console.log("   ✓ Columna modificada exitosamente");

    // 3. Actualizar registros existentes donde Tipo = 'Tareas' para que tengan NULL
    console.log("\n3. Actualizando registros de Tareas a NULL...");
    const updateResult = await pool.request().query(`
      UPDATE TD_DASHBOARD_CONFIG
      SET FiltroActivo = NULL
      WHERE Tipo = 'Tareas'
    `);
    console.log(`   ✓ ${updateResult.rowsAffected[0]} registros actualizados`);

    // 4. Verificar estado final
    console.log("\n4. Verificando estado final...");
    const finalCheck = await pool.request().query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'TD_DASHBOARD_CONFIG'
      AND COLUMN_NAME = 'FiltroActivo'
    `);

    if (finalCheck.recordset.length > 0) {
      const col = finalCheck.recordset[0];
      console.log(`   Columna: ${col.COLUMN_NAME}`);
      console.log(`   Tipo: ${col.DATA_TYPE}`);
      console.log(`   Permite NULL: ${col.IS_NULLABLE}`);
      console.log(`   Default: ${col.COLUMN_DEFAULT || 'N/A'}`);
    }

    console.log("\n" + "=".repeat(60));
    console.log("✓ Modificación completada exitosamente");
    console.log("=".repeat(60));
    console.log("\nResumen:");
    console.log("- FiltroActivo ahora permite NULL");
    console.log("- Los widgets de Tareas usan NULL en FiltroActivo");
    console.log("- Los widgets de Módulos siguen usando 0 o 1\n");

  } catch (error) {
    console.error("\n❌ Error durante la modificación:", error.message);
    console.error("\nDetalles del error:", error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log("Conexión cerrada.");
    }
  }
}

main();
