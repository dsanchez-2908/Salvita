// Script para aplicar la migración de permisos del menú de configuración
const sql = require('mssql');
const fs = require('fs');
const path = require('path');

const config = {
  server: '172.16.16.60',
  port: 1433,
  database: 'salvita',
  options: {
    encrypt: false,
    trustServerCertificate: true
  },
  authentication: {
    type: 'default',
    options: {
      userName: 'sa',
      password: 'Lpa1234$'
    }
  }
};

async function runMigration() {
  try {
    console.log('==============================================');
    console.log('MIGRACIÓN: Permisos del Menú de Configuración');
    console.log('==============================================\n');

    console.log('Conectando a la base de datos...');
    await sql.connect(config);
    console.log('✓ Conexión exitosa\n');

    // Leer el archivo de migración
    const migrationPath = path.join(__dirname, 'database', 'migrations', 'add_config_menu_permissions.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Ejecutando migración...\n');
    
    // Dividir el SQL en lotes (separados por GO)
    const batches = migrationSQL
      .split(/^\s*GO\s*$/im)
      .map(batch => batch.trim())
      .filter(batch => batch.length > 0);

    for (let i = 0; i < batches.length; i++) {
      console.log(`Ejecutando lote ${i + 1}/${batches.length}...`);
      const result = await sql.query(batches[i]);
      
      // Mostrar mensajes de PRINT si existen
      if (result.recordsets && result.recordsets.length > 0) {
        result.recordsets.forEach(recordset => {
          recordset.forEach(record => {
            if (record['']) {
              console.log(`  ${record['']}`);
            }
          });
        });
      }
    }

    console.log('\n==============================================');
    console.log('✅ MIGRACIÓN COMPLETADA EXITOSAMENTE');
    console.log('==============================================\n');

    // Verificar la tabla creada
    console.log('Verificando tabla TR_ROL_CONFIG_PERMISO...');
    const tableCheck = await sql.query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'TR_ROL_CONFIG_PERMISO'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('\nEstructura de la tabla:');
    console.table(tableCheck.recordset);

    // Verificar permisos del administrador
    console.log('\nVerificando permisos del rol Administrador...');
    const adminPerms = await sql.query(`
      SELECT 
        r.Nombre as Rol,
        cp.*
      FROM TR_ROL_CONFIG_PERMISO cp
      INNER JOIN TD_ROLES r ON cp.RolId = r.Id
      WHERE r.Nombre = 'Administrador'
    `);

    if (adminPerms.recordset.length > 0) {
      console.log('\n✓ Permisos del Administrador:');
      console.table(adminPerms.recordset);
    } else {
      console.log('\n⚠️  No se encontraron permisos para el Administrador');
    }

    // Verificar todos los roles
    console.log('\nVerificando permisos de todos los roles...');
    const allPerms = await sql.query(`
      SELECT 
        r.Nombre as Rol,
        cp.HabilitarMenuConfig,
        cp.PermisosRoles,
        cp.PermisosUsuarios,
        cp.PermisosListas,
        cp.PermisosModulos,
        cp.PermisosParametros,
        cp.PermisosDashboard,
        cp.PermisosParametrosAV
      FROM TD_ROLES r
      LEFT JOIN TR_ROL_CONFIG_PERMISO cp ON r.Id = cp.RolId
      ORDER BY r.Nombre
    `);

    console.log('\nResumen de permisos por rol:');
    console.table(allPerms.recordset);

    console.log('\n==============================================');
    console.log('INSTRUCCIONES PARA PRUEBA:');
    console.log('==============================================');
    console.log('1. Inicia sesión como Administrador');
    console.log('2. Ve a Dashboard > Roles');
    console.log('3. Crea o edita un rol');
    console.log('4. Verifica que aparezca la sección "Permisos del Menú de Configuración"');
    console.log('5. Activa "Habilitar Menú de Configuración" y selecciona opciones');
    console.log('6. Guarda el rol');
    console.log('7. Asigna ese rol a un usuario de prueba');
    console.log('8. Inicia sesión con ese usuario');
    console.log('9. Verifica que solo vea las opciones de configuración permitidas');
    console.log('==============================================\n');

  } catch (error) {
    console.error('\n❌ ERROR EN LA MIGRACIÓN:', error);
    throw error;
  } finally {
    await sql.close();
    console.log('Conexión cerrada.');
  }
}

// Ejecutar la migración
runMigration()
  .then(() => {
    console.log('\n✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error ejecutando el script:', error);
    process.exit(1);
  });
