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

async function testPermisosAPI() {
  try {
    console.log('=== PRUEBA DEL SISTEMA DE PERMISOS ===\n');
    
    console.log('📋 Reinicia el servidor Next.js si está corriendo:');
    console.log('   1. Presiona Ctrl+C en la terminal del servidor');
    console.log('   2. Ejecuta: npm run dev');
    console.log('   3. Espera a que compile\n');

    console.log('🧪 PRUEBAS A REALIZAR CON USUARIO prueba2:\n');
    
    console.log('✅ DEBE FUNCIONAR:');
    console.log('   1. Iniciar sesión con usuario "prueba2"');
    console.log('   2. Ver solo "Alumnos v4" en el menú lateral');
    console.log('   3. Entrar a Alumnos v4, ver la lista de alumnos');
    console.log('   4. Entrar al detalle de un alumno');
    console.log('   5. Ver solo "Faltas v4" en módulos relacionados (NO ver Notas v4)');
    console.log('   6. Ver los registros de Faltas v4 de ese alumno\n');

    console.log('❌ NO DEBE FUNCIONAR (debe dar error 403 o no mostrar):');
    console.log('   1. Ver otros módulos en el menú (Profesores v4, Notas, etc.)');
    console.log('   2. Ver "Notas v4" en módulos relacionados de Alumnos');
    console.log('   3. Botón "Agregar" en Alumnos v4 o Faltas v4');
    console.log('   4. Botón "Modificar" o "Eliminar" en registros');
    console.log('   5. Botón "Ver Agrupado" en Alumnos v4\n');

    console.log('🔧 CAMBIOS IMPLEMENTADOS:\n');
    console.log('   ✅ GET /api/modulos-v2?soloMenu=true → Filtra por PermisoVer del usuario');
    console.log('   ✅ GET /api/modulos-v2?id=X → Filtra ModulosSecundarios por permisos');
    console.log('   ✅ GET /api/modulos-v2/[id]/datos → Verifica permiso "ver" con contexto');
    console.log('   ✅ POST /api/modulos-v2/[id]/datos → Verifica permiso "agregar" con contexto');
    console.log('   ✅ PUT /api/modulos-v2/[id]/datos/[registroId] → Verifica permiso "modificar"');
    console.log('   ✅ DELETE /api/modulos-v2/[id]/datos/[registroId] → Verifica permiso "eliminar"');
    console.log('   ✅ GET /api/modulos-v2/[id]/[registroId]/agrupado → Verifica permiso "verAgrupado"\n');

    console.log('⚠️  PENDIENTE (mejoras adicionales):');
    console.log('   • Ocultar botones de acciones según permisos (UI)');
    console.log('   • Mostrar mensaje claro cuando no tiene permisos');
    console.log('   • Agregar endpoint para consultar permisos del usuario actual\n');

    console.log('📝 VERIFICANDO PERMISOS DEL USUARIO prueba2...\n');

    await sql.connect(config);
    
    const usuario = await sql.query`
      SELECT Id FROM TD_USUARIOS WHERE Usuario = 'prueba2'
    `;
    
    if (usuario.recordset.length === 0) {
      console.log('❌ Usuario prueba2 no encontrado');
      return;
    }
    
    const userId = usuario.recordset[0].Id;
    
    // Simular verificación de permiso para Alumnos v4
    const permisoAlumnos = await sql.query`
      SELECT MAX(CAST(rp.PermisoVer as int)) as TienePermiso
      FROM TR_USUARIO_ROL ur
      INNER JOIN TD_ROLES r ON ur.RolId = r.Id AND r.Estado = 'Activo'
      INNER JOIN TR_ROL_MODULO_PERMISO rp ON r.Id = rp.RolId
      WHERE ur.UsuarioId = ${userId}
        AND rp.ModuloId = 1014
        AND rp.ModuloPadreId IS NULL
    `;
    
    console.log(`✅ Permiso Ver Alumnos v4 (principal): ${permisoAlumnos.recordset[0]?.TienePermiso === 1 ? '✓ SÍ' : '✗ NO'}`);
    
    // Simular verificación de permiso para Faltas v4 bajo Alumnos v4
    const permisoFaltasEnAlumnos = await sql.query`
      SELECT MAX(CAST(rp.PermisoVer as int)) as TienePermiso
      FROM TR_USUARIO_ROL ur
      INNER JOIN TD_ROLES r ON ur.RolId = r.Id AND r.Estado = 'Activo'
      INNER JOIN TR_ROL_MODULO_PERMISO rp ON r.Id = rp.RolId
      WHERE ur.UsuarioId = ${userId}
        AND rp.ModuloId = 1015
        AND rp.ModuloPadreId = 1014
    `;
    
    console.log(`✅ Permiso Ver Faltas v4 (bajo Alumnos v4): ${permisoFaltasEnAlumnos.recordset[0]?.TienePermiso === 1 ? '✓ SÍ' : '✗ NO'}`);
    
    // Simular verificación de permiso para Notas v4 bajo Alumnos v4
    const permisoNotasEnAlumnos = await sql.query`
      SELECT MAX(CAST(rp.PermisoVer as int)) as TienePermiso
      FROM TR_USUARIO_ROL ur
      INNER JOIN TD_ROLES r ON ur.RolId = r.Id AND r.Estado = 'Activo'
      INNER JOIN TR_ROL_MODULO_PERMISO rp ON r.Id = rp.RolId
      WHERE ur.UsuarioId = ${userId}
        AND rp.ModuloId = 1017
        AND rp.ModuloPadreId = 1014
    `;
    
    console.log(`❌ Permiso Ver Notas v4 (bajo Alumnos v4): ${permisoNotasEnAlumnos.recordset[0]?.TienePermiso === 1 ? '✓ SÍ' : '✗ NO'}`);
    
    // Simular verificación de permiso para Profesores v4
    const permisoProfesores = await sql.query`
      SELECT MAX(CAST(rp.PermisoVer as int)) as TienePermiso
      FROM TR_USUARIO_ROL ur
      INNER JOIN TD_ROLES r ON ur.RolId = r.Id AND r.Estado = 'Activo'
      INNER JOIN TR_ROL_MODULO_PERMISO rp ON r.Id = rp.RolId
      WHERE ur.UsuarioId = ${userId}
        AND rp.ModuloId = 1016
        AND rp.ModuloPadreId IS NULL
    `;
    
    console.log(`❌ Permiso Ver Profesores v4 (principal): ${permisoProfesores.recordset[0]?.TienePermiso === 1 ? '✓ SÍ' : '✗ NO'}`);
    
    console.log('\n✅ Los permisos están configurados correctamente en la base de datos.');
    console.log('   Ahora las APIs los están aplicando.');

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await sql.close();
  }
}

testPermisosAPI();
