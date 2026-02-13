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

async function checkAdminPermisos() {
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

    // 2. Obtener todos los módulos
    const modulos = await sql.query`
      SELECT Id, Nombre, Tipo, MostrarEnMenu
      FROM TD_MODULOS
      WHERE Estado = 'Activo'
      ORDER BY Nombre
    `;

    console.log(`📋 Total de módulos activos: ${modulos.recordset.length}\n`);

    // 3. Verificar permisos del administrador en cada módulo
    console.log('=== PERMISOS DEL ROL ADMINISTRADOR ===\n');
    console.log('┌─────┬──────────────────────────┬─────────────┬───────┬───────┬───────┬───────┬───────┐');
    console.log('│ ID  │ Módulo                   │ Tipo        │ Menú  │ Ver   │ Agr   │ Mod   │ Elim  │');
    console.log('├─────┼──────────────────────────┼─────────────┼───────┼───────┼───────┼───────┼───────┤');

    let modulosSinPermiso = [];

    for (const modulo of modulos.recordset) {
      const permiso = await sql.query`
        SELECT PermisoVer, PermisoAgregar, PermisoModificar, PermisoEliminar
        FROM TR_ROL_MODULO_PERMISO
        WHERE RolId = ${adminRolId} AND ModuloId = ${modulo.Id}
      `;

      const id = String(modulo.Id).padEnd(3);
      const nombre = modulo.Nombre.substring(0, 24).padEnd(24);
      const tipo = modulo.Tipo.padEnd(11);
      const menu = modulo.MostrarEnMenu ? '  ✓  ' : '  ✗  ';

      if (permiso.recordset.length === 0) {
        console.log(`│ ${id} │ ${nombre} │ ${tipo} │ ${menu} │   ❌  │   ❌  │   ❌  │   ❌  │`);
        modulosSinPermiso.push(modulo);
      } else {
        const p = permiso.recordset[0];
        const ver = p.PermisoVer ? '  ✓  ' : '  ✗  ';
        const agr = p.PermisoAgregar ? '  ✓  ' : '  ✗  ';
        const mod = p.PermisoModificar ? '  ✓  ' : '  ✗  ';
        const elim = p.PermisoEliminar ? '  ✓  ' : '  ✗  ';
        console.log(`│ ${id} │ ${nombre} │ ${tipo} │ ${menu} │ ${ver} │ ${agr} │ ${mod} │ ${elim} │`);
      }
    }

    console.log('└─────┴──────────────────────────┴─────────────┴───────┴───────┴───────┴───────┴───────┘\n');

    if (modulosSinPermiso.length > 0) {
      console.log(`⚠️  ${modulosSinPermiso.length} módulo(s) sin permisos para Administrador:\n`);
      modulosSinPermiso.forEach(m => {
        console.log(`   • ${m.Nombre} (ID: ${m.Id})`);
      });
      console.log('\n💡 Solución: Ejecutar el siguiente script para agregar permisos:');
      console.log('   node scripts/fix-admin-permisos.js\n');
    } else {
      console.log('✅ Todos los módulos tienen permisos para el rol Administrador\n');
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await sql.close();
  }
}

checkAdminPermisos();
