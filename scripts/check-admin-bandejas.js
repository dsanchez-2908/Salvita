/**
 * Script: Verificar bandejas del usuario admin
 * Fecha: 2025
 * Descripción: Verifica las bandejas asignadas al usuario admin
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
    console.log("Verificar Bandejas del Usuario Admin");
    console.log("=".repeat(80));

    pool = await sql.connect(dbConfig);
    console.log("✓ Conectado a la base de datos\n");

    // Buscar usuario admin
    console.log("1. Información del usuario admin:");
    console.log("-".repeat(80));
    const usuario = await pool.request().query(`
      SELECT Id, Usuario, Nombre, Estado
      FROM TD_USUARIOS
      WHERE Usuario = 'admin'
    `);

    if (usuario.recordset.length === 0) {
      console.log("❌ No existe usuario 'admin'");
      return;
    }

    const admin = usuario.recordset[0];
    console.log(`Usuario: ${admin.Usuario} (ID: ${admin.Id})`);
    console.log(`Nombre: ${admin.Nombre}`);
    console.log(`Estado: ${admin.Estado}\n`);

    // Roles del usuario
    console.log("2. Roles asignados:");
    console.log("-".repeat(80));
    const roles = await pool.request()
      .input('userId', sql.Int, admin.Id)
      .query(`
        SELECT r.Id, r.Nombre
        FROM TR_USUARIO_ROL ur
        INNER JOIN TD_ROLES r ON ur.RolId = r.Id
        WHERE ur.UsuarioId = @userId
      `);

    if (roles.recordset.length === 0) {
      console.log("❌ El usuario no tiene roles asignados\n");
    } else {
      roles.recordset.forEach(r => {
        console.log(`- ${r.Nombre} (ID: ${r.Id})`);
      });
      console.log();
    }

    // Bandejas según la vista VW_BANDEJAS_POR_USUARIO
    console.log("3. Bandejas desde VW_BANDEJAS_POR_USUARIO:");
    console.log("-".repeat(80));
    const bandejas = await pool.request()
      .input('userId', sql.Int, admin.Id)
      .query(`
        SELECT * FROM VW_BANDEJAS_POR_USUARIO
        WHERE UsuarioId = @userId
      `);

    if (bandejas.recordset.length === 0) {
      console.log("❌ No se encontraron bandejas en la vista\n");
    } else {
      console.log(`Total: ${bandejas.recordset.length} bandejas\n`);
      bandejas.recordset.forEach(b => {
        console.log(`  Bandeja: ${b.BandejaNombre} (ID: ${b.BandejaId})`);
        console.log(`  Estado: ${b.BandejaEstado}`);
        console.log();
      });
    }

    // Query del API
    console.log("4. Query del API /api/bandejas/usuario:");
    console.log("-".repeat(80));
    const apiQuery = await pool.request()
      .input('userId', sql.Int, admin.Id)
      .query(`
        SELECT DISTINCT b.Id, b.Nombre, b.Descripcion, b.Estado
        FROM VW_BANDEJAS_POR_USUARIO vw
        INNER JOIN TD_BANDEJAS b ON vw.BandejaId = b.Id
        WHERE vw.UsuarioId = @userId AND b.Estado = 'Activa'
        ORDER BY b.Nombre
      `);

    if (apiQuery.recordset.length === 0) {
      console.log("❌ La query del API no devuelve bandejas\n");
    } else {
      console.log(`Total: ${apiQuery.recordset.length} bandejas\n`);
      apiQuery.recordset.forEach(b => {
        console.log(`  Id: ${b.Id}`);
        console.log(`  Nombre: ${b.Nombre}`);
        console.log(`  Descripcion: ${b.Descripcion || 'NULL'}`);
        console.log(`  Estado: ${b.Estado}`);
        console.log();
      });
    }

    // Asignaciones directas de bandeja
    console.log("5. Asignaciones directas (TR_BANDEJA_USUARIO):");
    console.log("-".repeat(80));
    const directas = await pool.request()
      .input('userId', sql.Int, admin.Id)
      .query(`
        SELECT bu.*, b.Nombre as BandejaNombre
        FROM TR_BANDEJA_USUARIO bu
        INNER JOIN TD_BANDEJAS b ON bu.BandejaId = b.Id
        WHERE bu.UsuarioId = @userId
      `);

    if (directas.recordset.length === 0) {
      console.log("No hay asignaciones directas\n");
    } else {
      directas.recordset.forEach(a => {
        console.log(`- ${a.BandejaNombre} (BandejaId: ${a.BandejaId})`);
      });
      console.log();
    }

    // Asignaciones por rol
    console.log("6. Asignaciones por rol (TR_BANDEJA_ROL):");
    console.log("-".repeat(80));
    const porRol = await pool.request()
      .input('userId', sql.Int, admin.Id)
      .query(`
        SELECT DISTINCT br.BandejaId, b.Nombre as BandejaNombre, r.Nombre as RolNombre
        FROM TR_USUARIO_ROL ur
        INNER JOIN TR_BANDEJA_ROL br ON ur.RolId = br.RolId
        INNER JOIN TD_BANDEJAS b ON br.BandejaId = b.Id
        INNER JOIN TD_ROLES r ON ur.RolId = r.Id
        WHERE ur.UsuarioId = @userId
      `);

    if (porRol.recordset.length === 0) {
      console.log("No hay asignaciones por rol\n");
    } else {
      porRol.recordset.forEach(a => {
        console.log(`- ${a.BandejaNombre} (BandejaId: ${a.BandejaId}) via rol "${a.RolNombre}"`);
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
