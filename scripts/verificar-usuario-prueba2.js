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
    enableArithAbort: true,
  },
};

async function verificarUsuarioPrueba2() {
  try {
    await sql.connect(config);
    console.log('✓ Conectado a SQL Server\n');

    // Buscar usuario prueba2
    const usuario = await sql.query`
      SELECT Id, Usuario, Nombre, Estado FROM TD_USUARIOS 
      WHERE Usuario = 'prueba2'
    `;

    if (usuario.recordset.length === 0) {
      console.log('❌ No se encontró el usuario "prueba2"');
      return;
    }

    const userId = usuario.recordset[0].Id;
    console.log(`✓ Usuario encontrado: ${usuario.recordset[0].Usuario} (ID: ${userId})`);
    console.log(`  Nombre: ${usuario.recordset[0].Nombre}`);
    console.log(`  Estado: ${usuario.recordset[0].Estado}\n`);

    // Buscar roles del usuario
    console.log('=== ROLES ASIGNADOS ===\n');
    const roles = await sql.query`
      SELECT r.Id, r.Nombre, r.Estado
      FROM TR_USUARIO_ROL ur
      INNER JOIN TD_ROLES r ON ur.RolId = r.Id
      WHERE ur.UsuarioId = ${userId}
    `;

    if (roles.recordset.length === 0) {
      console.log('⚠️  El usuario no tiene roles asignados');
      return;
    }

    roles.recordset.forEach(r => {
      console.log(`✓ ${r.Nombre} (ID: ${r.Id}) - Estado: ${r.Estado}`);
    });

    // Obtener permisos efectivos del usuario
    console.log('\n=== PERMISOS EFECTIVOS ===\n');
    const permisos = await sql.query`
      SELECT DISTINCT
        mp.Nombre as ModuloPadre,
        m.Id as ModuloId,
        m.Nombre as Modulo,
        MAX(CAST(rp.PermisoVer as int)) as PermisoVer,
        MAX(CAST(rp.PermisoVerAgrupado as int)) as PermisoVerAgrupado,
        MAX(CAST(rp.PermisoAgregar as int)) as PermisoAgregar,
        MAX(CAST(rp.PermisoModificar as int)) as PermisoModificar,
        MAX(CAST(rp.PermisoEliminar as int)) as PermisoEliminar
      FROM TD_USUARIOS u
      INNER JOIN TR_USUARIO_ROL ur ON u.Id = ur.UsuarioId
      INNER JOIN TD_ROLES r ON ur.RolId = r.Id AND r.Estado = 'Activo'
      INNER JOIN TR_ROL_MODULO_PERMISO rp ON r.Id = rp.RolId
      INNER JOIN TD_MODULOS m ON rp.ModuloId = m.Id
      LEFT JOIN TD_MODULOS mp ON rp.ModuloPadreId = mp.Id
      WHERE u.Id = ${userId}
      GROUP BY mp.Nombre, m.Id, m.Nombre
      ORDER BY mp.Nombre, m.Nombre
    `;

    if (permisos.recordset.length === 0) {
      console.log('⚠️  El usuario no tiene permisos en ningún módulo');
      return;
    }

    console.log('┌───────────────────┬────────┬──────────────┬──────┬────────┬────────┬──────────┬──────────┐');
    console.log('│ Módulo Padre      │ ModID  │ Módulo       │ Ver  │ VerAgr │ Agr    │ Mod      │ Elim     │');
    console.log('├───────────────────┼────────┼──────────────┼──────┼────────┼────────┼──────────┼──────────┤');

    permisos.recordset.forEach(p => {
      const padre = (p.ModuloPadre || 'Principal').padEnd(17);
      const moduloId = p.ModuloId.toString().padEnd(6);
      const modulo = p.Modulo.substring(0, 12).padEnd(12);
      const ver = p.PermisoVer ? '✓' : '✗';
      const verAgr = p.PermisoVerAgrupado ? '✓' : '✗';
      const agregar = p.PermisoAgregar ? '✓' : '✗';
      const modificar = p.PermisoModificar ? '✓' : '✗';
      const eliminar = p.PermisoEliminar ? '✓' : '✗';
      
      console.log(`│ ${padre} │ ${moduloId} │ ${modulo} │  ${ver}   │   ${verAgr}    │   ${agregar}    │    ${modificar}    │    ${eliminar}    │`);
    });

    console.log('└───────────────────┴────────┴──────────────┴──────┴────────┴────────┴──────────┴──────────┘');

    // Contar módulos con permiso Ver
    const modulosConVer = permisos.recordset.filter(p => p.PermisoVer === 1);
    console.log(`\n📊 RESUMEN:`);
    console.log(`   Total de módulos con acceso: ${modulosConVer.length}`);
    console.log(`   Módulos principales con Ver: ${modulosConVer.filter(p => !p.ModuloPadre).length}`);
    console.log(`   Módulos secundarios con Ver: ${modulosConVer.filter(p => p.ModuloPadre).length}`);

    console.log('\n⚠️  PROBLEMA DETECTADO:');
    console.log('Si el usuario puede ver y hacer todo, probablemente:');
    console.log('1. El dashboard no está filtrando módulos por permisos');
    console.log('2. Las páginas de módulos V2 no están verificando permisos en el frontend');
    console.log('3. Podría tener otros roles asignados (ej: Administrador)');

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await sql.close();
  }
}

verificarUsuarioPrueba2();
