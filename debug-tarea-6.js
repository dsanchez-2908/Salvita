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

async function debugTarea6() {
  try {
    await sql.connect(config);
    console.log('Conectado a la base de datos\n');

    // Obtener información de la tarea #6
    const resultTarea = await sql.query`
      SELECT 
        t.Id,
        t.TipoAsignacion,
        t.UsuarioAsignadoId,
        t.BandejaAsignadaId,
        t.UsuarioTomadaPorId,
        t.Estado,
        u.Nombre as UsuarioAsignadoNombre,
        u.Usuario as UsuarioAsignadoLogin,
        b.Nombre as BandejaAsignadaNombre,
        uTomo.Nombre as UsuarioTomoNombre,
        uTomo.Usuario as UsuarioTomoLogin
      FROM TD_TAREAS t
      LEFT JOIN TD_USUARIOS u ON t.UsuarioAsignadoId = u.Id
      LEFT JOIN TD_BANDEJAS b ON t.BandejaAsignadaId = b.Id
      LEFT JOIN TD_USUARIOS uTomo ON t.UsuarioTomadaPorId = uTomo.Id
      WHERE t.Id = 6
    `;

    console.log('=== INFORMACIÓN DE TAREA #6 ===');
    if (resultTarea.recordset.length === 0) {
      console.log('❌ No se encontró la tarea #6');
      return;
    }

    const tarea = resultTarea.recordset[0];
    console.log('ID:', tarea.Id);
    console.log('Tipo Asignación:', tarea.TipoAsignacion);
    console.log('Estado:', tarea.Estado);
    console.log('Usuario Asignado ID:', tarea.UsuarioAsignadoId);
    console.log('Usuario Asignado:', tarea.UsuarioAsignadoNombre, tarea.UsuarioAsignadoLogin ? `(${tarea.UsuarioAsignadoLogin})` : '');
    console.log('Bandeja Asignada ID:', tarea.BandejaAsignadaId);
    console.log('Bandeja Asignada:', tarea.BandejaAsignadaNombre);
    console.log('Usuario que Tomó ID:', tarea.UsuarioTomadaPorId);
    console.log('Usuario que Tomó:', tarea.UsuarioTomoNombre, tarea.UsuarioTomoLogin ? `(${tarea.UsuarioTomoLogin})` : '');

    // Si es asignación a bandeja, verificar accesos
    if (tarea.TipoAsignacion === 'Bandeja' && tarea.BandejaAsignadaId) {
      console.log('\n=== USUARIOS CON ACCESO A LA BANDEJA ===');
      
      const resultAcceso = await sql.query`
        SELECT 
          u.Id as UsuarioId,
          u.Nombre,
          u.Usuario,
          'Directo' as TipoAcceso
        FROM TR_BANDEJA_USUARIO bu
        INNER JOIN TD_USUARIOS u ON bu.UsuarioId = u.Id
        WHERE bu.BandejaId = ${tarea.BandejaAsignadaId}
        UNION
        SELECT 
          u.Id as UsuarioId,
          u.Nombre,
          u.Usuario,
          'Por Rol: ' + r.Nombre as TipoAcceso
        FROM TR_BANDEJA_ROL br
        INNER JOIN TD_ROLES r ON br.RolId = r.Id
        INNER JOIN TR_USUARIO_ROL ur ON ur.RolId = r.Id
        INNER JOIN TD_USUARIOS u ON u.Id = ur.UsuarioId
        WHERE br.BandejaId = ${tarea.BandejaAsignadaId}
      `;

      if (resultAcceso.recordset.length === 0) {
        console.log('❌ No hay usuarios con acceso a esta bandeja');
      } else {
        resultAcceso.recordset.forEach(u => {
          console.log(`  - ${u.Nombre} (${u.Usuario}) [ID: ${u.UsuarioId}] - ${u.TipoAcceso}`);
        });
      }
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await sql.close();
  }
}

debugTarea6();
