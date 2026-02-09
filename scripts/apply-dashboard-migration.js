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

async function applyMigration() {
  try {
    const pool = await sql.connect(config);
    console.log('Conectado a SQL Server\n');

    // 1. Agregar FiltroOperador
    console.log('1. Agregando columna FiltroOperador...');
    try {
      await pool.request().query(`
        ALTER TABLE TD_DASHBOARD_CONFIG 
        ADD [FiltroOperador] VARCHAR(10) NULL
      `);
      console.log('   ✓ FiltroOperador agregada');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('   - FiltroOperador ya existe');
      } else {
        throw err;
      }
    }

    // 2. Agregar CHECK constraint a FiltroOperador
    console.log('2. Agregando CHECK constraint a FiltroOperador...');
    try {
      await pool.request().query(`
        ALTER TABLE TD_DASHBOARD_CONFIG 
        ADD CONSTRAINT CK_FiltroOperador 
        CHECK ([FiltroOperador] IN ('=', '<>', '<', '>', '<=', '>=', 'LIKE'))
      `);
      console.log('   ✓ CHECK constraint agregado');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('   - CHECK constraint ya existe');
      } else {
        console.log('   - Error agregando constraint:', err.message);
      }
    }

    // 3. Agregar FiltroActivo
    console.log('3. Agregando columna FiltroActivo...');
    try {
      await pool.request().query(`
        ALTER TABLE TD_DASHBOARD_CONFIG 
        ADD [FiltroActivo] BIT NOT NULL DEFAULT 0
      `);
      console.log('   ✓ FiltroActivo agregada');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('   - FiltroActivo ya existe');
      } else {
        throw err;
      }
    }

    // 4. Eliminar constraint anterior de TipoVisualizacion
    console.log('4. Actualizando CHECK constraint de TipoVisualizacion...');
    const constraintResult = await pool.request().query(`
      SELECT name 
      FROM sys.check_constraints 
      WHERE parent_object_id = OBJECT_ID('TD_DASHBOARD_CONFIG') 
        AND col_name(parent_object_id, parent_column_id) = 'TipoVisualizacion'
    `);

    if (constraintResult.recordset.length > 0) {
      const constraintName = constraintResult.recordset[0].name;
      await pool.request().query(`
        ALTER TABLE TD_DASHBOARD_CONFIG DROP CONSTRAINT [${constraintName}]
      `);
      console.log('   ✓ Constraint anterior eliminado');
    }

    // 5. Agregar nuevo CHECK constraint con Totalizado
    console.log('5. Agregando nuevo CHECK constraint con Totalizado...');
    try {
      await pool.request().query(`
        ALTER TABLE TD_DASHBOARD_CONFIG 
        ADD CONSTRAINT CK_TD_DASHBOARD_CONFIG_TipoVisualizacion 
        CHECK ([TipoVisualizacion] IN ('Agrupamiento', 'DetalleFiltrado', 'Totalizado'))
      `);
      console.log('   ✓ Nuevo CHECK constraint agregado');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('   - CHECK constraint ya existe');
      } else {
        throw err;
      }
    }

    console.log('\n✅ Migración completada exitosamente\n');
    
    // Verificar columnas
    const verify = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'TD_DASHBOARD_CONFIG'
        AND COLUMN_NAME IN ('FiltroOperador', 'FiltroActivo')
    `);
    
    console.log('Columnas verificadas:');
    verify.recordset.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE}`);
    });

    await pool.close();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error ejecutando migración:', err.message);
    process.exit(1);
  }
}

applyMigration();
