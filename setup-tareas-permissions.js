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

async function setupTareasPermissions() {
  try {
    await sql.connect(config);
    console.log('Conectado a la base de datos\n');

    // 1. Verificar si ya existe el módulo Tareas
    console.log('=== VERIFICANDO MÓDULO TAREAS ===');
    const moduloExistente = await sql.query`
      SELECT Id FROM TD_MODULOS WHERE Nombre = 'Tareas'
    `;

    let moduloId;
    if (moduloExistente.recordset.length > 0) {
      moduloId = moduloExistente.recordset[0].Id;
      console.log(`✓ Módulo Tareas ya existe con ID: ${moduloId}`);
    } else {
      console.log('Creando módulo Tareas...');
      const resultado = await sql.query`
        INSERT INTO TD_MODULOS (
          Nombre,
          NombreTabla,
          Tipo,
          Estado,
          Icono,
          MostrarEnMenu,
          FechaCreacion,
          UsuarioCreacion
        )
        VALUES (
          'Tareas',
          'TD_TAREAS',
          'Independiente',
          'Activo',
          'ClipboardList',
          1,
          GETDATE(),
          'system'
        );
        SELECT SCOPE_IDENTITY() AS Id;
      `;
      moduloId = resultado.recordset[0].Id;
      console.log(`✓ Módulo Tareas creado con ID: ${moduloId}`);
    }

    // 2. Verificar si ya existe la tabla TR_ROL_TAREAS_PERMISO
    console.log('\n=== VERIFICANDO TABLA DE PERMISOS ===');
    const tablaExiste = await sql.query`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_NAME = 'TR_ROL_TAREAS_PERMISO'
    `;

    if (tablaExiste.recordset.length === 0) {
      console.log('Creando tabla TR_ROL_TAREAS_PERMISO...');
      await sql.query`
        CREATE TABLE TR_ROL_TAREAS_PERMISO (
          Id INT IDENTITY(1,1) PRIMARY KEY,
          RolId INT NOT NULL,
          HabilitarTareas BIT NOT NULL DEFAULT 0,
          PuedeCrearTareas BIT NOT NULL DEFAULT 0,
          PuedeAdministracionTareas BIT NOT NULL DEFAULT 0,
          AdministracionBandejas BIT NOT NULL DEFAULT 0,
          PuedeConsultarTareas BIT NOT NULL DEFAULT 0,
          PuedeVerMonitorTareas BIT NOT NULL DEFAULT 0,
          FechaCreacion DATETIME DEFAULT GETDATE(),
          UsuarioCreacion VARCHAR(50),
          FOREIGN KEY (RolId) REFERENCES TD_ROLES(Id) ON DELETE CASCADE
        )
      `;
      console.log('✓ Tabla TR_ROL_TAREAS_PERMISO creada exitosamente');
    } else {
      console.log('✓ Tabla TR_ROL_TAREAS_PERMISO ya existe');
    }

    // 3. Configurar permisos para rol Administrador
    console.log('\n=== CONFIGURANDO PERMISOS PARA ADMINISTRADOR ===');
    const permisosAdmin = await sql.query`
      SELECT Id FROM TR_ROL_TAREAS_PERMISO WHERE RolId = 1
    `;

    if (permisosAdmin.recordset.length === 0) {
      console.log('Asignando todos los permisos al rol Administrador...');
      await sql.query`
        INSERT INTO TR_ROL_TAREAS_PERMISO (
          RolId,
          HabilitarTareas,
          PuedeCrearTareas,
          PuedeAdministracionTareas,
          AdministracionBandejas,
          PuedeConsultarTareas,
          PuedeVerMonitorTareas,
          UsuarioCreacion
        )
        VALUES (
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          'system'
        )
      `;
      console.log('✓ Permisos completos asignados al Administrador');
    } else {
      console.log('✓ Administrador ya tiene permisos configurados');
    }

    // 4. Crear permisos con HabilitarTareas=0 para otros roles
    console.log('\n=== CONFIGURANDO OTROS ROLES ===');
    const otrosRoles = await sql.query`
      SELECT r.Id, r.Nombre
      FROM TD_ROLES r
      WHERE r.Id <> 1
      AND NOT EXISTS (
        SELECT 1 FROM TR_ROL_TAREAS_PERMISO p WHERE p.RolId = r.Id
      )
    `;

    for (const rol of otrosRoles.recordset) {
      console.log(`Creando permisos deshabilitados para rol: ${rol.Nombre}`);
      await sql.query`
        INSERT INTO TR_ROL_TAREAS_PERMISO (
          RolId,
          HabilitarTareas,
          PuedeCrearTareas,
          PuedeAdministracionTareas,
          AdministracionBandejas,
          PuedeConsultarTareas,
          PuedeVerMonitorTareas,
          UsuarioCreacion
        )
        VALUES (
          ${rol.Id},
          0,
          0,
          0,
          0,
          0,
          0,
          'system'
        )
      `;
    }

    if (otrosRoles.recordset.length > 0) {
      console.log(`✓ ${otrosRoles.recordset.length} roles configurados con permisos deshabilitados`);
    } else {
      console.log('✓ Todos los roles ya tienen configuración de permisos');
    }

    // 5. Mostrar resumen
    console.log('\n=== RESUMEN DE CONFIGURACIÓN ===');
    const resumen = await sql.query`
      SELECT 
        r.Nombre AS Rol,
        p.HabilitarTareas,
        p.PuedeCrearTareas,
        p.PuedeAdministracionTareas,
        p.AdministracionBandejas,
        p.PuedeConsultarTareas,
        p.PuedeVerMonitorTareas
      FROM TD_ROLES r
      INNER JOIN TR_ROL_TAREAS_PERMISO p ON r.Id = p.RolId
      ORDER BY r.Nombre
    `;

    console.log('\nPermisos configurados:');
    console.log('─'.repeat(120));
    console.log(
      'ROL'.padEnd(25) + 
      'HABILITAR'.padEnd(12) + 
      'CREAR'.padEnd(12) + 
      'ADMIN'.padEnd(12) + 
      'BANDEJAS'.padEnd(12) + 
      'CONSULTAR'.padEnd(12) + 
      'MONITOR'
    );
    console.log('─'.repeat(120));
    
    resumen.recordset.forEach(row => {
      const habilitado = row.HabilitarTareas ? '✓' : '✗';
      const crear = row.PuedeCrearTareas ? '✓' : '✗';
      const admin = row.PuedeAdministracionTareas ? '✓' : '✗';
      const bandejas = row.AdministracionBandejas ? '✓' : '✗';
      const consultar = row.PuedeConsultarTareas ? '✓' : '✗';
      const monitor = row.PuedeVerMonitorTareas ? '✓' : '✗';

      console.log(
        row.Rol.padEnd(25) +
        habilitado.padEnd(12) +
        crear.padEnd(12) +
        admin.padEnd(12) +
        bandejas.padEnd(12) +
        consultar.padEnd(12) +
        monitor
      );
    });
    console.log('─'.repeat(120));

    console.log('\n✅ Configuración de permisos de Tareas completada exitosamente');

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
  } finally {
    await sql.close();
  }
}

setupTareasPermissions();
