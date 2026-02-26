/**
 * Script: Agregar soporte para widgets de Tareas en Dashboard
 * Fecha: 2025
 * Descripción: Agrega columnas necesarias para soportar widgets de Tareas en TD_DASHBOARD_CONFIG
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
    console.log("Agregar soporte para widgets de Tareas en Dashboard");
    console.log("=".repeat(60));

    pool = await sql.connect(dbConfig);
    console.log("✓ Conectado a la base de datos Salvita\n");

    // 1. Verificar si la columna Tipo ya existe
    console.log("1. Verificando columnas existentes...");
    const columnsCheck = await pool.request().query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'TD_DASHBOARD_CONFIG'
      AND COLUMN_NAME IN ('Tipo', 'TareasTipoVisualizacion', 'TareasCategoria')
    `);
    
    const existingColumns = columnsCheck.recordset.map(r => r.COLUMN_NAME);
    console.log(`   Columnas encontradas: ${existingColumns.length > 0 ? existingColumns.join(', ') : 'ninguna'}`);

    // 2. Agregar columna Tipo
    if (!existingColumns.includes('Tipo')) {
      console.log("\n2. Agregando columna 'Tipo'...");
      await pool.request().query(`
        ALTER TABLE TD_DASHBOARD_CONFIG
        ADD Tipo VARCHAR(20) NOT NULL DEFAULT 'Modulos'
        CHECK (Tipo IN ('Modulos', 'Tareas'))
      `);
      console.log("   ✓ Columna 'Tipo' agregada");
    } else {
      console.log("\n2. Columna 'Tipo' ya existe, omitiendo...");
    }

    // 3. Agregar columna TareasTipoVisualizacion
    if (!existingColumns.includes('TareasTipoVisualizacion')) {
      console.log("\n3. Agregando columna 'TareasTipoVisualizacion'...");
      await pool.request().query(`
        ALTER TABLE TD_DASHBOARD_CONFIG
        ADD TareasTipoVisualizacion VARCHAR(50) NULL
        CHECK (TareasTipoVisualizacion IS NULL OR TareasTipoVisualizacion IN ('PendientesPropios', 'PendientesTotales'))
      `);
      console.log("   ✓ Columna 'TareasTipoVisualizacion' agregada");
    } else {
      console.log("\n3. Columna 'TareasTipoVisualizacion' ya existe, omitiendo...");
    }

    // 4. Agregar columna TareasCategoria
    if (!existingColumns.includes('TareasCategoria')) {
      console.log("\n4. Agregando columna 'TareasCategoria'...");
      await pool.request().query(`
        ALTER TABLE TD_DASHBOARD_CONFIG
        ADD TareasCategoria VARCHAR(50) NULL
        CHECK (TareasCategoria IS NULL OR TareasCategoria IN ('BandejaPersonal', 'BandejasGrupal'))
      `);
      console.log("   ✓ Columna 'TareasCategoria' agregada");
    } else {
      console.log("\n4. Columna 'TareasCategoria' ya existe, omitiendo...");
    }

    // 5. Actualizar ModuloId para permitir NULL (para widgets de Tareas)
    console.log("\n5. Verificando constraints en ModuloId...");
    const constraintCheck = await pool.request().query(`
      SELECT COLUMN_NAME, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'TD_DASHBOARD_CONFIG'
      AND COLUMN_NAME = 'ModuloId'
    `);
    
    if (constraintCheck.recordset.length > 0 && constraintCheck.recordset[0].IS_NULLABLE === 'NO') {
      console.log("   ModuloId es NOT NULL, modificando...");
      
      // Primero, eliminar la FK constraint
      console.log("   Eliminando FK constraint...");
      await pool.request().query(`
        IF EXISTS (
          SELECT 1 FROM sys.foreign_keys 
          WHERE name = 'FK_TD_DASHBOARD_CONFIG_Modulo' 
          AND parent_object_id = OBJECT_ID('TD_DASHBOARD_CONFIG')
        )
        BEGIN
          ALTER TABLE TD_DASHBOARD_CONFIG DROP CONSTRAINT FK_TD_DASHBOARD_CONFIG_Modulo;
        END
      `);
      
      // Modificar la columna para permitir NULL
      await pool.request().query(`
        ALTER TABLE TD_DASHBOARD_CONFIG
        ALTER COLUMN ModuloId INT NULL
      `);
      
      // Recrear la FK constraint
      console.log("   Recreando FK constraint...");
      await pool.request().query(`
        ALTER TABLE TD_DASHBOARD_CONFIG
        ADD CONSTRAINT FK_TD_DASHBOARD_CONFIG_Modulo 
        FOREIGN KEY (ModuloId) REFERENCES TD_MODULOS(Id) ON DELETE CASCADE
      `);
      
      console.log("   ✓ ModuloId modificado para permitir NULL");
    } else {
      console.log("   ModuloId ya permite NULL, omitiendo...");
    }

    // 6. Actualizar registros existentes para asegurar Tipo = 'Modulos'
    console.log("\n6. Actualizando registros existentes...");
    const updateResult = await pool.request().query(`
      UPDATE TD_DASHBOARD_CONFIG
      SET Tipo = 'Modulos'
      WHERE Tipo IS NULL OR Tipo = ''
    `);
    console.log(`   ✓ ${updateResult.rowsAffected[0]} registros actualizados`);

    // 7. Verificar estado final
    console.log("\n7. Verificando estado final de la tabla...");
    const finalCheck = await pool.request().query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE,
        COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'TD_DASHBOARD_CONFIG'
      AND COLUMN_NAME IN ('Tipo', 'ModuloId', 'TareasTipoVisualizacion', 'TareasCategoria')
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log("\n   Estructura de columnas:");
    console.log("   " + "=".repeat(90));
    console.log("   " + "COLUMN_NAME".padEnd(30) + "TYPE".padEnd(15) + "NULL?".padEnd(10) + "DEFAULT");
    console.log("   " + "-".repeat(90));
    finalCheck.recordset.forEach(col => {
      const type = col.CHARACTER_MAXIMUM_LENGTH 
        ? `${col.DATA_TYPE}(${col.CHARACTER_MAXIMUM_LENGTH})`
        : col.DATA_TYPE;
      console.log("   " + 
        col.COLUMN_NAME.padEnd(30) + 
        type.padEnd(15) + 
        col.IS_NULLABLE.padEnd(10) + 
        (col.COLUMN_DEFAULT || 'N/A')
      );
    });
    console.log("   " + "=".repeat(90));

    console.log("\n" + "=".repeat(60));
    console.log("✓ Migración completada exitosamente");
    console.log("=".repeat(60));
    console.log("\nResumen:");
    console.log("- Se agregó la columna 'Tipo' con valores 'Modulos' o 'Tareas'");
    console.log("- Se agregó la columna 'TareasTipoVisualizacion'");
    console.log("- Se agregó la columna 'TareasCategoria'");
    console.log("- Se modificó ModuloId para permitir NULL");
    console.log("- Los registros existentes se marcaron como Tipo='Modulos'");
    console.log("\nEl sistema de dashboard ahora soporta widgets de Tareas.\n");

  } catch (error) {
    console.error("\n❌ Error durante la migración:", error.message);
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
