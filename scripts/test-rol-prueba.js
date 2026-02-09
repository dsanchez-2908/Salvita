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

async function testPermisos() {
  try {
    await sql.connect(config);
    console.log('✓ Conectado a SQL Server\n');

    // Buscar el rol "pruebaNuevaEstructura"
    const rol = await sql.query`
      SELECT Id, Nombre FROM TD_ROLES 
      WHERE Nombre = 'pruebaNuevaEstructura'
    `;

    if (rol.recordset.length === 0) {
      console.log('❌ No se encontró el rol "pruebaNuevaEstructura"');
      console.log('Por favor crea el rol en http://localhost:3000/dashboard/roles');
      return;
    }

    const rolId = rol.recordset[0].Id;
    console.log(`✓ Rol encontrado: ${rol.recordset[0].Nombre} (ID: ${rolId})\n`);

    // Obtener permisos del rol
    console.log('=== PERMISOS DEL ROL ===\n');
    const permisos = await sql.query`
      SELECT 
        mp.Nombre as ModuloPadre,
        m.Nombre as Modulo,
        rp.PermisoVer,
        rp.PermisoVerAgrupado,
        rp.PermisoAgregar,
        rp.PermisoModificar,
        rp.PermisoEliminar
      FROM TR_ROL_MODULO_PERMISO rp
      INNER JOIN TD_MODULOS m ON rp.ModuloId = m.Id
      LEFT JOIN TD_MODULOS mp ON rp.ModuloPadreId = mp.Id
      WHERE rp.RolId = ${rolId}
      ORDER BY mp.Nombre, m.Nombre
    `;

    if (permisos.recordset.length === 0) {
      console.log('⚠️  El rol no tiene permisos asignados');
      return;
    }

    console.log('┌─────────────────────┬───────────────┬──────┬────────┬────────┬───────────┬──────────┐');
    console.log('│ Módulo Padre        │ Módulo Hijo   │ Ver  │ VerAgr │ Agr    │ Mod       │ Elim     │');
    console.log('├─────────────────────┼───────────────┼──────┼────────┼────────┼───────────┼──────────┤');

    permisos.recordset.forEach(p => {
      const padre = (p.ModuloPadre || 'Principal').padEnd(19);
      const modulo = p.Modulo.padEnd(13);
      const ver = p.PermisoVer ? '✓' : '✗';
      const verAgr = p.PermisoVerAgrupado ? '✓' : '✗';
      const agregar = p.PermisoAgregar ? '✓' : '✗';
      const modificar = p.PermisoModificar ? '✓' : '✗';
      const eliminar = p.PermisoEliminar ? '✓' : '✗';
      
      console.log(`│ ${padre} │ ${modulo} │  ${ver}   │   ${verAgr}    │   ${agregar}    │     ${modificar}     │    ${eliminar}     │`);
    });

    console.log('└─────────────────────┴───────────────┴──────┴────────┴────────┴───────────┴──────────┘');

    console.log('\n=== VALIDACIÓN ESPERADA ===\n');
    console.log('Según la configuración, el rol debe:');
    console.log('✓ VER Alumnos v4 (módulo principal)');
    console.log('✓ VER Faltas v4 SOLO en contexto de Alumnos v4');
    console.log('✗ NO VER Notas v4 (otro hijo de Alumnos v4)');
    console.log('✗ NO VER Profesores v4');
    console.log('✗ NO tener permisos de Agregar, Modificar, Eliminar en ningún módulo');
    console.log('✗ NO tener permiso de Ver Agrupado');

    console.log('\n=== SIGUIENTE PASO ===');
    console.log('1. Crea un usuario de prueba con este rol');
    console.log('2. Inicia sesión con ese usuario');
    console.log('3. Verifica en la UI que:');
    console.log('   - Se muestra Alumnos v4 en el menú');
    console.log('   - Al entrar a un alumno, se muestra Faltas v4 en módulos relacionados');
    console.log('   - NO se muestra Notas v4');
    console.log('   - NO se muestran botones de Agregar, Modificar, Eliminar');
    console.log('   - NO se muestra la vista agrupada');
    console.log('4. Intenta hacer peticiones directas a la API:');
    console.log('   - GET /api/modulos-v2/1015/datos?parentModuloId=1014 → 200 (permitido)');
    console.log('   - GET /api/modulos-v2/1017/datos?parentModuloId=1014 → 403 (denegado - Notas v4)');
    console.log('   - POST /api/modulos-v2/1015/datos → 403 (denegado - sin permiso agregar)');

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await sql.close();
  }
}

testPermisos();
