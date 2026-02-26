/**
 * Script: Verificar configuración de dashboard para usuario "tareas"
 * Fecha: 2025
 * Descripción: Verifica rol, permisos y configuraciones de dashboard
 */

const sql = require("mssql");

const dbConfig = {
  server: "172.16.16.60",
  port: 1433,
  database: "salvita",
  user: "sa",
  password: "Lpa1234$",
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function main() {
  let pool;
  try {
    console.log("=".repeat(80));
    console.log("Verificar configuración de dashboard para usuario 'tareas'");
    console.log("=".repeat(80));

    pool = await sql.connect(dbConfig);
    console.log("✓ Conectado a la base de datos\n");

    // 1. Verificar usuario y roles
    console.log("1. USUARIO Y ROLES");
    console.log("-".repeat(80));
    const usuario = await pool.request().query(`
      SELECT 
        u.Id,
        u.Usuario,
        u.Nombre,
        STRING_AGG(r.Nombre, ', ') as Roles
      FROM TD_USUARIOS u
      LEFT JOIN TR_USUARIO_ROL ur ON u.Id = ur.UsuarioId
      LEFT JOIN TD_ROLES r ON ur.RolId = r.Id
      WHERE u.Usuario = 'tareas'
      GROUP BY u.Id, u.Usuario, u.Nombre
    `);

    if (usuario.recordset.length === 0) {
      console.log("❌ Usuario 'tareas' no encontrado");
      return;
    }

    const user = usuario.recordset[0];
    console.log(`Usuario: ${user.Usuario}`);
    console.log(`Nombre: ${user.Nombre}`);
    console.log(`Roles: ${user.Roles || 'Sin roles'}\n`);

    // 2. Obtener RolId de "Tareas"
    const rolTareas = await pool.request().query(`
      SELECT Id, Nombre FROM TD_ROLES WHERE Nombre = 'Tareas'
    `);

    if (rolTareas.recordset.length === 0) {
      console.log("❌ Rol 'Tareas' no encontrado");
      return;
    }

    const rolId = rolTareas.recordset[0].Id;
    console.log(`RolId de 'Tareas': ${rolId}\n`);

    // 3. Verificar permisos de Tareas
    console.log("2. PERMISOS DE TAREAS");
    console.log("-".repeat(80));
    const permisos = await pool.request().input('userId', sql.Int, user.Id).query(`
      SELECT 
        MAX(CAST(HabilitarTareas AS INT)) as HabilitarTareas,
        MAX(CAST(PuedeCrearTareas AS INT)) as PuedeCrearTareas,
        MAX(CAST(PuedeConsultarTareas AS INT)) as PuedeConsultarTareas,
        MAX(CAST(PuedeVerMonitorTareas AS INT)) as PuedeVerMonitorTareas,
        MAX(CAST(PuedeAdministracionTareas AS INT)) as PuedeAdministracionTareas,
        MAX(CAST(AdministracionBandejas AS INT)) as AdministracionBandejas
      FROM TR_ROL_TAREAS_PERMISO rtp
      INNER JOIN TR_USUARIO_ROL ur ON rtp.RolId = ur.RolId
      WHERE ur.UsuarioId = @userId
    `);

    if (permisos.recordset.length > 0) {
      const p = permisos.recordset[0];
      console.log(`HabilitarTareas: ${p.HabilitarTareas ? 'SÍ' : 'NO'}`);
      console.log(`PuedeCrearTareas: ${p.PuedeCrearTareas ? 'SÍ' : 'NO'}`);
      console.log(`PuedeConsultarTareas: ${p.PuedeConsultarTareas ? 'SÍ' : 'NO'}`);
      console.log(`PuedeVerMonitorTareas: ${p.PuedeVerMonitorTareas ? 'SÍ' : 'NO'}`);
      console.log(`PuedeAdministracionTareas: ${p.PuedeAdministracionTareas ? 'SÍ' : 'NO'}`);
      console.log(`AdministracionBandejas: ${p.AdministracionBandejas ? 'SÍ' : 'NO'}\n`);
    } else {
      console.log("❌ No se encontraron permisos de tareas\n");
    }

    // 4. Verificar configuración de dashboard
    console.log("3. CONFIGURACIÓN DE DASHBOARD");
    console.log("-".repeat(80));
    const configs = await pool.request().input('rolId', sql.Int, rolId).query(`
      SELECT 
        dc.Id,
        dc.Tipo,
        dc.ModuloId,
        m.Nombre as ModuloNombre,
        dc.TipoVisualizacion,
        dc.TareasTipoVisualizacion,
        dc.TareasCategoria,
        dc.Orden
      FROM TD_DASHBOARD_CONFIG dc
      LEFT JOIN TD_MODULOS m ON dc.ModuloId = m.Id
      WHERE dc.RolId = @rolId
      ORDER BY dc.Orden
    `);

    if (configs.recordset.length === 0) {
      console.log("⚠️  No hay widgets configurados para el rol 'Tareas'\n");
    } else {
      console.log(`Total de widgets: ${configs.recordset.length}\n`);
      configs.recordset.forEach((config, idx) => {
        console.log(`Widget ${idx + 1}:`);
        console.log(`  ID: ${config.Id}`);
        console.log(`  Tipo: ${config.Tipo}`);
        if (config.Tipo === 'Modulos') {
          console.log(`  Módulo: ${config.ModuloNombre} (ID: ${config.ModuloId})`);
          console.log(`  Visualización: ${config.TipoVisualizacion}`);
        } else if (config.Tipo === 'Tareas') {
          console.log(`  Tipo Visualización: ${config.TareasTipoVisualizacion}`);
          console.log(`  Categoría: ${config.TareasCategoria}`);
        }
        console.log(`  Orden: ${config.Orden}`);
        console.log();
      });
    }

    // 5. Verificar bandejas del usuario
    console.log("4. BANDEJAS ASIGNADAS");
    console.log("-".repeat(80));
    const bandejas = await pool.request().input('userId', sql.Int, user.Id).query(`
      SELECT 
        b.Id,
        b.Nombre,
        b.TipoBandeja,
        b.Estado
      FROM VW_BANDEJAS_POR_USUARIO vb
      INNER JOIN TD_BANDEJAS b ON vb.BandejaId = b.Id
      WHERE vb.UsuarioId = @userId
      ORDER BY b.Nombre
    `);

    if (bandejas.recordset.length === 0) {
      console.log("⚠️  Usuario no tiene bandejas asignadas\n");
    } else {
      console.log(`Total de bandejas: ${bandejas.recordset.length}\n`);
      bandejas.recordset.forEach(b => {
        console.log(`  - ${b.Nombre} (${b.TipoBandeja}) - Estado: ${b.Estado}`);
      });
      console.log();
    }

    // 6. Verificar tareas disponibles
    console.log("5. TAREAS EN BANDEJAS DEL USUARIO");
    console.log("-".repeat(80));
    const tareas = await pool.request().input('userId', sql.Int, user.Id).query(`
      SELECT 
        b.Nombre as Bandeja,
        t.Estado,
        COUNT(*) as Cantidad
      FROM TD_TAREAS t
      INNER JOIN VW_BANDEJAS_POR_USUARIO vb ON t.BandejaId = vb.BandejaId
      INNER JOIN TD_BANDEJAS b ON t.BandejaId = b.Id
      WHERE vb.UsuarioId = @userId
      GROUP BY b.Nombre, t.Estado
      ORDER BY b.Nombre, t.Estado
    `);

    if (tareas.recordset.length === 0) {
      console.log("⚠️  No hay tareas en las bandejas del usuario\n");
    } else {
      console.log();
      tareas.recordset.forEach(t => {
        console.log(`  - ${t.Bandeja}: ${t.Cantidad} tareas en estado "${t.Estado}"`);
      });
      console.log();
    }

    console.log("=".repeat(80));
    console.log("✓ Verificación completada");
    console.log("=".repeat(80));

  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

main();
