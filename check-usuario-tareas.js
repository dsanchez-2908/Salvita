const sql = require('mssql');

const config = {
  user: 'sa',
  password: 'Lpa1234$',
  server: '172.16.16.60',
  database: 'salvita',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function checkUsuarioTareas() {
  try {
    await sql.connect(config);
    console.log('Conectado a la base de datos\n');

    // Buscar el usuario "tareas"
    console.log('=== BUSCANDO USUARIO "tareas" ===');
    const usuario = await sql.query`
      SELECT Id, Nombre, Usuario, Estado
      FROM TD_USUARIOS
      WHERE Usuario = 'tareas'
    `;

    if (usuario.recordset.length === 0) {
      console.log('✗ Usuario "tareas" no existe');
      return;
    }

    const usuarioId = usuario.recordset[0].Id;
    console.log(`✓ Usuario encontrado: ID ${usuarioId} - ${usuario.recordset[0].Nombre} (${usuario.recordset[0].Estado})`);

    // Obtener roles del usuario
    console.log('\n=== ROLES DEL USUARIO ===');
    const roles = await sql.query`
      SELECT r.Id, r.Nombre
      FROM TR_USUARIO_ROL ur
      INNER JOIN TD_ROLES r ON ur.RolId = r.Id
      WHERE ur.UsuarioId = ${usuarioId}
    `;

    if (roles.recordset.length > 0) {
      roles.recordset.forEach(r => {
        console.log(`- ${r.Nombre} (ID: ${r.Id})`);
      });
    } else {
      console.log('- Ningún rol asignado');
    }

    // Obtener bandejas asignadas directamente
    console.log('\n=== BANDEJAS ASIGNADAS DIRECTAMENTE ===');
    const bandejasDirectas = await sql.query`
      SELECT b.Id, b.Nombre
      FROM TR_BANDEJA_USUARIO bu
      INNER JOIN TD_BANDEJAS b ON bu.BandejaId = b.Id
      WHERE bu.UsuarioId = ${usuarioId} AND b.Estado = 'Activa'
    `;

    if (bandejasDirectas.recordset.length > 0) {
      bandejasDirectas.recordset.forEach(b => {
        console.log(`- ${b.Nombre} (ID: ${b.Id})`);
      });
    } else {
      console.log('- Ninguna bandeja asignada directamente');
    }

    // Obtener bandejas asignadas por roles
    console.log('\n=== BANDEJAS ASIGNADAS POR ROLES ===');
    const bandejasPorRoles = await sql.query`
      SELECT DISTINCT b.Id, b.Nombre, r.Nombre as RolNombre
      FROM TR_USUARIO_ROL ur
      INNER JOIN TR_BANDEJA_ROL br ON ur.RolId = br.RolId
      INNER JOIN TD_BANDEJAS b ON br.BandejaId = b.Id
      INNER JOIN TD_ROLES r ON ur.RolId = r.Id
      WHERE ur.UsuarioId = ${usuarioId} AND b.Estado = 'Activa'
    `;

    if (bandejasPorRoles.recordset.length > 0) {
      bandejasPorRoles.recordset.forEach(b => {
        console.log(`- ${b.Nombre} (ID: ${b.Id}) - Rol: ${b.RolNombre}`);
      });
    } else {
      console.log('- Ninguna bandeja asignada por roles');
    }

    // Obtener el total usando la vista (lo que vería el usuario)
    console.log('\n=== BANDEJAS QUE VERÍA EL USUARIO (usando vista) ===');
    const bandejasVista = await sql.query`
      SELECT DISTINCT b.Id, b.Nombre, b.Descripcion
      FROM VW_BANDEJAS_POR_USUARIO vw
      INNER JOIN TD_BANDEJAS b ON vw.BandejaId = b.Id
      WHERE vw.UsuarioId = ${usuarioId} AND b.Estado = 'Activa'
      ORDER BY b.Nombre
    `;

    if (bandejasVista.recordset.length > 0) {
      bandejasVista.recordset.forEach(b => {
        console.log(`- ${b.Nombre} (ID: ${b.Id})`);
        if (b.Descripcion) console.log(`  Descripción: ${b.Descripcion}`);
      });
    } else {
      console.log('- Ninguna bandeja (correcto si no tiene asignaciones)');
    }

    // Verificar configuración de la "Bandeja de Prueba"
    console.log('\n=== CONFIGURACIÓN DE "Bandeja de Prueba" ===');
    const bandejaPrueba = await sql.query`
      SELECT 
        b.Id, 
        b.Nombre, 
        b.Estado,
        (SELECT COUNT(*) FROM TR_BANDEJA_USUARIO bu WHERE bu.BandejaId = b.Id) as CantUsuariosDirectos,
        (SELECT COUNT(*) FROM TR_BANDEJA_ROL br WHERE br.BandejaId = b.Id) as CantRoles
      FROM TD_BANDEJAS b
      WHERE b.Nombre = 'Bandeja de Prueba'
    `;

    if (bandejaPrueba.recordset.length > 0) {
      const bp = bandejaPrueba.recordset[0];
      console.log(`ID: ${bp.Id} - Estado: ${bp.Estado}`);
      console.log(`Usuarios asignados directamente: ${bp.CantUsuariosDirectos}`);
      console.log(`Roles asignados: ${bp.CantRoles}`);

      if (bp.CantUsuariosDirectos > 0) {
        const usuarios = await sql.query`
          SELECT u.Usuario, u.Nombre
          FROM TR_BANDEJA_USUARIO bu
          INNER JOIN TD_USUARIOS u ON bu.UsuarioId = u.Id
          WHERE bu.BandejaId = ${bp.Id}
        `;
        console.log('\nUsuarios con acceso directo:');
        usuarios.recordset.forEach(u => {
          console.log(`  - ${u.Nombre} (${u.Usuario})`);
        });
      }

      if (bp.CantRoles > 0) {
        const rolesAsignados = await sql.query`
          SELECT r.Nombre
          FROM TR_BANDEJA_ROL br
          INNER JOIN TD_ROLES r ON br.RolId = r.Id
          WHERE br.BandejaId = ${bp.Id}
        `;
        console.log('\nRoles con acceso:');
        rolesAsignados.recordset.forEach(r => {
          console.log(`  - ${r.Nombre}`);
        });
      }
    } else {
      console.log('✗ "Bandeja de Prueba" no encontrada');
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
  } finally {
    await sql.close();
  }
}

checkUsuarioTareas();
