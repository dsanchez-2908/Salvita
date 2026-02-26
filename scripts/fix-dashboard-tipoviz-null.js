/**
 * Script: Permitir NULL en TipoVisualizacion de TD_DASHBOARD_CONFIG
 * Fecha: 2025
 * Descripción: Modifica la columna TipoVisualizacion para permitir NULL
 *              (necesario para widgets de Tareas que no usan esta columna)
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
    console.log("Modificar TipoVisualizacion para permitir NULL");
    console.log("=".repeat(60));

    pool = await sql.connect(dbConfig);
    console.log("✓ Conectado a la base de datos\n");

    // 1. Verificar estructura actual
    console.log("1. Verificando estructura actual...");
    const checkColumn = await pool.request().query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'TD_DASHBOARD_CONFIG'
      AND COLUMN_NAME = 'TipoVisualizacion'
    `);

    if (checkColumn.recordset.length > 0) {
      const col = checkColumn.recordset[0];
      console.log(`   Columna: ${col.COLUMN_NAME}`);
      console.log(`   Tipo: ${col.DATA_TYPE}(${col.CHARACTER_MAXIMUM_LENGTH || 'max'})`);
      console.log(`   Permite NULL: ${col.IS_NULLABLE}`);

      if (col.IS_NULLABLE === 'YES') {
        console.log("\n✓ La columna ya permite NULL. No se requiere modificación.");
        return;
      }
    } else {
      console.log("   ❌ No se encontró la columna TipoVisualizacion");
      return;
    }

    // 2. Verificar si hay CHECK constraints
    console.log("\n2. Verificando CHECK constraints...");
    const checkConstraints = await pool.request().query(`
      SELECT 
        cc.CONSTRAINT_NAME,
        cc.CHECK_CLAUSE
      FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS cc
      INNER JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE ccu 
        ON cc.CONSTRAINT_NAME = ccu.CONSTRAINT_NAME
      WHERE ccu.TABLE_NAME = 'TD_DASHBOARD_CONFIG'
      AND ccu.COLUMN_NAME = 'TipoVisualizacion'
    `);

    if (checkConstraints.recordset.length > 0) {
      console.log(`   Encontrados ${checkConstraints.recordset.length} constraint(s):`);
      for (const constraint of checkConstraints.recordset) {
        console.log(`   - ${constraint.CONSTRAINT_NAME}`);
        console.log(`     ${constraint.CHECK_CLAUSE}`);
        
        // Eliminar constraint
        console.log(`   Eliminando constraint ${constraint.CONSTRAINT_NAME}...`);
        await pool.request().query(`
          ALTER TABLE TD_DASHBOARD_CONFIG
          DROP CONSTRAINT ${constraint.CONSTRAINT_NAME}
        `);
        console.log(`   ✓ Constraint eliminado`);
      }
    } else {
      console.log("   No se encontraron CHECK constraints en la columna");
    }

    // 3. Modificar columna para permitir NULL
    console.log("\n3. Modificando columna para permitir NULL...");
    await pool.request().query(`
      ALTER TABLE TD_DASHBOARD_CONFIG
      ALTER COLUMN TipoVisualizacion VARCHAR(50) NULL
    `);
    console.log("   ✓ Columna modificada exitosamente");

    // 4. Recrear CHECK constraint (ahora permitiendo NULL)
    console.log("\n4. Recreando CHECK constraint...");
    await pool.request().query(`
      ALTER TABLE TD_DASHBOARD_CONFIG
      ADD CONSTRAINT CK_TD_DASHBOARD_CONFIG_TipoVisualizacion
      CHECK (TipoVisualizacion IS NULL OR TipoVisualizacion IN ('Agrupamiento', 'DetalleFiltrado', 'Totalizado'))
    `);
    console.log("   ✓ CHECK constraint recreado (permite NULL)");

    // 5. Verificar estado final
    console.log("\n5. Verificando estado final...");
    const finalCheck = await pool.request().query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'TD_DASHBOARD_CONFIG'
      AND COLUMN_NAME = 'TipoVisualizacion'
    `);

    if (finalCheck.recordset.length > 0) {
      const col = finalCheck.recordset[0];
      console.log(`   Columna: ${col.COLUMN_NAME}`);
      console.log(`   Tipo: ${col.DATA_TYPE}(${col.CHARACTER_MAXIMUM_LENGTH || 'max'})`);
      console.log(`   Permite NULL: ${col.IS_NULLABLE}`);
    }

    console.log("\n" + "=".repeat(60));
    console.log("✓ Modificación completada exitosamente");
    console.log("=".repeat(60));
    console.log("\nResumen:");
    console.log("- TipoVisualizacion ahora permite NULL");
    console.log("- CHECK constraint actualizado para permitir NULL");
    console.log("- Los widgets de Tareas pueden usar NULL en TipoVisualizacion");
    console.log("- Los widgets de Módulos siguen validados correctamente\n");

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
