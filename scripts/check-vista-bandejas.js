/**
 * Script: Verificar estructura de VW_BANDEJAS_POR_USUARIO
 * Fecha: 2025
 * Descripción: Verifica si la vista existe y qué columnas tiene
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
    console.log("Verificar estructura de VW_BANDEJAS_POR_USUARIO");
    console.log("=".repeat(80));

    pool = await sql.connect(dbConfig);
    console.log("✓ Conectado a la base de datos\n");

    // Verificar si la vista existe
    console.log("1. Verificando existencia de la vista...");
    const vistaExiste = await pool.request().query(`
      SELECT 
        OBJECT_ID('VW_BANDEJAS_POR_USUARIO') as ObjectId,
        CASE WHEN OBJECT_ID('VW_BANDEJAS_POR_USUARIO') IS NOT NULL THEN 'EXISTS' ELSE 'NOT EXISTS' END as Status
    `);

    console.log(`   Status: ${vistaExiste.recordset[0].Status}`);
    console.log(`   ObjectId: ${vistaExiste.recordset[0].ObjectId || 'NULL'}\n`);

    if (vistaExiste.recordset[0].Status === 'NOT EXISTS') {
      console.log("❌ La vista VW_BANDEJAS_POR_USUARIO no existe en la base de datos");
      console.log("\nNecesitas ejecutar el script create_sistema_tareas.sql para crearla.\n");
      return;
    }

    // Obtener columnas de la vista
    console.log("2. Columnas de la vista:");
    console.log("-".repeat(80));
    const columnas = await pool.request().query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'VW_BANDEJAS_POR_USUARIO'
      ORDER BY ORDINAL_POSITION
    `);

    if (columnas.recordset.length === 0) {
      console.log("❌ No se encontraron columnas para la vista\n");
    } else {
      console.log("COLUMNA".padEnd(30) + "TIPO".padEnd(20) + "NULL?");
      console.log("-".repeat(80));
      columnas.recordset.forEach(col => {
        const tipo = col.CHARACTER_MAXIMUM_LENGTH 
          ? `${col.DATA_TYPE}(${col.CHARACTER_MAXIMUM_LENGTH})`
          : col.DATA_TYPE;
        console.log(
          col.COLUMN_NAME.padEnd(30) + 
          tipo.padEnd(20) + 
          col.IS_NULLABLE
        );
      });
      console.log();
    }

    // Verificar definición de la vista
    console.log("3. Definición de la vista:");
    console.log("-".repeat(80));
    const definicion = await pool.request().query(`
      SELECT OBJECT_DEFINITION(OBJECT_ID('VW_BANDEJAS_POR_USUARIO')) as Definition
    `);

    if (definicion.recordset[0].Definition) {
      console.log(definicion.recordset[0].Definition);
    } else {
      console.log("No se pudo obtener la definición de la vista");
    }

    // Probar query simple
    console.log("\n4. Probando query simple:");
    console.log("-".repeat(80));
    try {
      const test = await pool.request().query(`
        SELECT TOP 5 * FROM VW_BANDEJAS_POR_USUARIO
      `);
      console.log(`✓ Query exitosa. Registros encontrados: ${test.recordset.length}\n`);
      if (test.recordset.length > 0) {
        console.log("Primer registro:");
        console.log(test.recordset[0]);
      }
    } catch (error) {
      console.log(`❌ Error en query: ${error.message}`);
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
