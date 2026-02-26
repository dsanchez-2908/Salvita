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

async function debugAccesoTarea() {
  try {
    await sql.connect(config);
    console.log('Conectado a la base de datos\n');

    const tareaId = 5;
    const userId = 1; // admin

    console.log('=== SIMULANDO VERIFICACIÓN DE ACCESO ===');
    console.log(`TareaId: ${tareaId}`);
    console.log(`UserId: ${userId} (admin)\n`);

    // Consulta exacta que hace la API
    const result = await sql.query`
      SELECT t.*
      FROM TD_TAREAS t
      WHERE t.Id = ${tareaId}
    `;

    if (result.recordset.length === 0) {
      console.log('❌ Tarea no encontrada');
      return;
    }

    const tarea = result.recordset[0];
    console.log('=== DATOS DE LA TAREA ===');
    console.log('TipoAsignacion:', tarea.TipoAsignacion);
    console.log('UsuarioAsignadoId:', tarea.UsuarioAsignadoId);
    console.log('BandejaAsignadaId:', tarea.BandejaAsignadaId);
    console.log('UsuarioTomadaPorId:', tarea.UsuarioTomadaPorId);
    console.log('Estado:', tarea.Estado);

    console.log('\n=== VERIFICANDO ACCESO ===');

    // Verificación 1: ¿El usuario tomó la tarea?
    if (tarea.UsuarioTomadaPorId === userId) {
      console.log('✅ Usuario tomó la tarea');
      console.log('TIENE ACCESO');
      return;
    } else {
      console.log(`❌ Usuario NO tomó la tarea (UsuarioTomadaPorId: ${tarea.UsuarioTomadaPorId}, userId: ${userId})`);
    }

    // Verificación 2: ¿Es asignación directa al usuario?
    if (tarea.TipoAsignacion === "Usuario" && tarea.UsuarioAsignadoId === userId) {
      console.log('✅ Es asignación directa al usuario');
      console.log(`   TipoAsignacion: ${tarea.TipoAsignacion}`);
      console.log(`   UsuarioAsignadoId: ${tarea.UsuarioAsignadoId}`);
      console.log(`   userId: ${userId}`);
      console.log('TIENE ACCESO');
      return;
    } else {
      console.log('❌ NO es asignación directa al usuario');
      console.log(`   TipoAsignacion: ${tarea.TipoAsignacion} (esperado: "Usuario")`);
      console.log(`   UsuarioAsignadoId: ${tarea.UsuarioAsignadoId} vs userId: ${userId}`);
      console.log(`   Comparación: ${tarea.UsuarioAsignadoId} === ${userId} = ${tarea.UsuarioAsignadoId === userId}`);
    }

    // Verificación 3: ¿Es asignación a bandeja con acceso?
    if (tarea.TipoAsignacion === "Bandeja") {
      console.log('✅ Es tarea de bandeja, verificando acceso...');
      
      const acceso = await sql.query`
        SELECT 1 as Tiene
        FROM TR_BANDEJA_USUARIO 
        WHERE BandejaId = ${tarea.BandejaAsignadaId} AND UsuarioId = ${userId}
        UNION
        SELECT 1 as Tiene
        FROM TR_BANDEJA_ROL br
        INNER JOIN TR_USUARIO_ROL ur ON br.RolId = ur.RolId
        WHERE br.BandejaId = ${tarea.BandejaAsignadaId} AND ur.UsuarioId = ${userId}
      `;

      if (acceso.recordset.length > 0) {
        console.log('✅ Usuario tiene acceso a la bandeja');
        console.log('TIENE ACCESO');
      } else {
        console.log('❌ Usuario NO tiene acceso a la bandeja');
        console.log('NO TIENE ACCESO');
      }
    } else {
      console.log('❌ NO es tarea de bandeja');
      console.log('NO TIENE ACCESO');
    }

    // Debug adicional: tipos de datos
    console.log('\n=== DEBUG TIPOS DE DATOS ===');
    console.log('typeof tarea.UsuarioAsignadoId:', typeof tarea.UsuarioAsignadoId);
    console.log('typeof userId:', typeof userId);
    console.log('tarea.UsuarioAsignadoId:', tarea.UsuarioAsignadoId);
    console.log('userId:', userId);
    console.log('Son iguales con ===:', tarea.UsuarioAsignadoId === userId);
    console.log('Son iguales con ==:', tarea.UsuarioAsignadoId == userId);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await sql.close();
  }
}

debugAccesoTarea();
