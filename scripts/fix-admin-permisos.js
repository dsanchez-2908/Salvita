const sql = require('mssql');

const config = {
  server: '172.16.16.60',
  port: 1433,
  database: 'salvita',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  },
  authentication: {
    type: 'default',
    options: {
      userName: 'sa',
      password: 'Lpa1234$'
    }
  }
};

async function fixAdminPermisos() {
  try {
    await sql.connect(config);
    console.log('✓ Conectado a SQL Server\n');

    // 1. Obtener el rol Administrador
    const adminRol = await sql.query`
      SELECT Id, Nombre FROM TD_ROLES WHERE Nombre = 'Administrador'
    `;

    if (adminRol.recordset.length === 0) {
      console.log('❌ No se encontró el rol Administrador');
      return;
    }

    const adminRolId = adminRol.recordset[0].Id;
    console.log(`✓ Rol Administrador encontrado (ID: ${adminRolId})\n`);

    // 2. Buscar módulos sin permisos para Administrador
    const modulosSinPermiso = await sql.query`
      SELECT m.Id, m.Nombre, m.Tipo
      FROM TD_MODULOS m
      WHERE m.Estado = 'Activo'
      AND NOT EXISTS (
        SELECT 1 
        FROM TR_ROL_MODULO_PERMISO p 
        WHERE p.RolId = ${adminRolId} AND p.ModuloId = m.Id
      )
      ORDER BY m.Nombre
    `;

    if (modulosSinPermiso.recordset.length === 0) {
      console.log('✅ Todos los módulos ya tienen permisos para el rol Administrador');
      console.log('   No hay nada que hacer.\n');
      return;
    }

    console.log(`⚠️  Encontrados ${modulosSinPermiso.recordset.length} módulo(s) sin permisos:\n`);
    modulosSinPermiso.recordset.forEach(m => {
      console.log(`   • ${m.Nombre} (ID: ${m.Id}, Tipo: ${m.Tipo})`);
    });

    console.log('\n🔧 Agregando permisos completos para el rol Administrador...\n');

    // 3. Agregar permisos completos para cada módulo
    let permisosAgregados = 0;
    for (const modulo of modulosSinPermiso.recordset) {
      try {
        await sql.query`
          INSERT INTO TR_ROL_MODULO_PERMISO 
          (RolId, ModuloId, PermisoVer, PermisoVerAgrupado, PermisoAgregar, PermisoModificar, PermisoEliminar, UsuarioAsignacion)
          VALUES (${adminRolId}, ${modulo.Id}, 1, 1, 1, 1, 1, 'system')
        `;
        console.log(`   ✓ Permisos agregados: ${modulo.Nombre}`);
        permisosAgregados++;
      } catch (err) {
        console.log(`   ❌ Error agregando permisos para ${modulo.Nombre}: ${err.message}`);
      }
    }

    console.log(`\n✅ ${permisosAgregados} permiso(s) agregado(s) exitosamente\n`);

    // 4. Verificar resultado final
    console.log('=== VERIFICACIÓN FINAL ===\n');
    const verificacion = await sql.query`
      SELECT COUNT(*) as Total
      FROM TD_MODULOS m
      WHERE m.Estado = 'Activo'
      AND NOT EXISTS (
        SELECT 1 
        FROM TR_ROL_MODULO_PERMISO p 
        WHERE p.RolId = ${adminRolId} AND p.ModuloId = m.Id
      )
    `;

    if (verificacion.recordset[0].Total === 0) {
      console.log('✅ Todos los módulos activos tienen permisos para el rol Administrador\n');
    } else {
      console.log(`⚠️  Aún quedan ${verificacion.recordset[0].Total} módulo(s) sin permisos\n`);
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
  } finally {
    await sql.close();
  }
}

fixAdminPermisos();
