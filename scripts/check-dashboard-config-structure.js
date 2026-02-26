/**
 * Script: Verificar estructura de TD_DASHBOARD_CONFIG
 * Fecha: 2025
 * Descripción: Verifica que todos los campos necesarios permitan NULL
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
    console.log("Verificar estructura de TD_DASHBOARD_CONFIG");
    console.log("=".repeat(80));

    pool = await sql.connect(dbConfig);
    console.log("✓ Conectado a la base de datos\n");

    // Verificar todas las columnas
    const columns = await pool.request().query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE,
        COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'TD_DASHBOARD_CONFIG'
      ORDER BY ORDINAL_POSITION
    `);

    console.log("Estructura completa de TD_DASHBOARD_CONFIG:");
    console.log("=".repeat(80));
    console.log(
      "COLUMNA".padEnd(35) + 
      "TIPO".padEnd(20) + 
      "NULL?".padEnd(10) + 
      "DEFAULT"
    );
    console.log("-".repeat(80));

    const problemas = [];

    columns.recordset.forEach(col => {
      const tipo = col.CHARACTER_MAXIMUM_LENGTH 
        ? `${col.DATA_TYPE}(${col.CHARACTER_MAXIMUM_LENGTH})`
        : col.DATA_TYPE;
      
      const nullable = col.IS_NULLABLE === 'YES' ? 'YES' : 'NO';
      const defaultVal = col.COLUMN_DEFAULT || 'N/A';

      console.log(
        col.COLUMN_NAME.padEnd(35) + 
        tipo.padEnd(20) + 
        nullable.padEnd(10) + 
        defaultVal
      );

      // Identificar campos específicos de Módulos que deben permitir NULL
      const camposModulos = [
        'CampoAgrupamiento',
        'CampoFiltro', 
        'ValorFiltro',
        'FiltroOperador',
        'FiltroActivo'
      ];

      if (camposModulos.includes(col.COLUMN_NAME) && col.IS_NULLABLE === 'NO') {
        problemas.push(col.COLUMN_NAME);
      }
    });

    console.log("=".repeat(80));

    if (problemas.length > 0) {
      console.log("\n⚠️  Campos que deberían permitir NULL (para widgets de Tareas):");
      problemas.forEach(campo => console.log(`   - ${campo}`));
      console.log("\nEstos campos son específicos de widgets de Módulos y deben permitir NULL");
      console.log("para que los widgets de Tareas funcionen correctamente.\n");
    } else {
      console.log("\n✓ Todos los campos tienen la configuración correcta.\n");
    }

  } catch (error) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

main();
