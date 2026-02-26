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

async function setupTareasModule() {
  try {
    await sql.connect(config);
    console.log('Conectado a la base de datos\n');

    // Verificar si ya existe el módulo Tareas
    const moduloExistente = await sql.query`
      SELECT * FROM TD_MODULOS WHERE Nombre = 'Tareas'
    `;

    if (moduloExistente.recordset.length > 0) {
      console.log('El módulo Tareas ya existe. ID:', moduloExistente.recordset[0].Id);
      return;
    }

    console.log('Creando módulo Tareas...');

    // Insertar el módulo Tareas
    const result = await sql.query`
      INSERT INTO TD_MODULOS (Nombre, Tipo, Estado, Icono, Orden)
      OUTPUT INSERTED.Id
      VALUES ('Tareas', 'Sistema', 'Activo', 'ClipboardList', 100)
    `;

    const moduloId = result.recordset[0].Id;
    console.log('Módulo Tareas creado con ID:', moduloId);

    // Insertar los campos de permisos específicos para Tareas
    const permisos = [
      { nombre: 'HabilitarTareas', etiqueta: 'Habilitar Tareas', tipo: 'boolean', orden: 1 },
      { nombre: 'PuedeCrearTareas', etiqueta: 'Puede Crear Tareas', tipo: 'boolean', orden: 2 },
      { nombre: 'PuedeAdministracionTareas', etiqueta: 'Puede Administración de Tareas', tipo: 'boolean', orden: 3 },
      { nombre: 'AdministracionBandejas', etiqueta: 'Administración de Bandejas', tipo: 'boolean', orden: 4 },
      { nombre: 'PuedeConsultarTareas', etiqueta: 'Puede Consultar Tareas', tipo: 'boolean', orden: 5 },
      { nombre: 'PuedeVerMonitorTareas', etiqueta: 'Puede ver Monitor de Tareas', tipo: 'boolean', orden: 6 }
    ];

    console.log('\nCreando campos de permisos...');
    for (const permiso of permisos) {
      await sql.query`
        INSERT INTO TD_CAMPOS_SISTEMA (
          ModuloId, Nombre, Etiqueta, TipoDato, Orden, Activo
        ) VALUES (
          ${moduloId}, ${permiso.nombre}, ${permiso.etiqueta}, ${permiso.tipo}, ${permiso.orden}, 1
        )
      `;
      console.log(`  ✓ ${permiso.etiqueta}`);
    }

    // Dar todos los permisos al rol Administrador
    console.log('\nAsignando permisos al rol Administrador...');
    
    const adminRol = await sql.query`
      SELECT Id FROM TD_ROLES WHERE Nombre = 'Administrador'
    `;

    if (adminRol.recordset.length > 0) {
      const adminRolId = adminRol.recordset[0].Id;
      
      await sql.query`
        INSERT INTO TR_ROL_MODULO_PERMISO (
          RolId, ModuloId, PermisoVer, PermisoVerAgrupado, PermisoAgregar, 
          PermisoModificar, PermisoEliminar
        ) VALUES (
          ${adminRolId}, ${moduloId}, 1, 1, 1, 1, 1
        )
      `;
      
      console.log('  ✓ Permisos asignados a Administrador');
    }

    console.log('\n✅ Módulo Tareas configurado exitosamente');

  } catch (err) {
    console.error('Error:', err.message);
    console.error(err);
  } finally {
    await sql.close();
  }
}

setupTareasModule();
