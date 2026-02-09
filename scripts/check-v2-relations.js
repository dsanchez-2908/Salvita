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

async function checkRelations() {
  try {
    await sql.connect(config);
    console.log('✓ Conectado a SQL Server\n');

    // 1. Ver todos los módulos V2
    console.log('=== MÓDULOS V2 ===');
    const modulos = await sql.query`
      SELECT Id, Nombre, NombreTabla, MostrarEnMenu, Estado 
      FROM TD_MODULOS 
      ORDER BY Nombre
    `;
    modulos.recordset.forEach(m => {
      console.log(`${m.Id}: ${m.Nombre} (${m.NombreTabla}) - ${m.MostrarEnMenu ? 'En menú' : 'No en menú'}`);
    });

    // 2. Ver todas las relaciones
    console.log('\n=== RELACIONES ===');
    const relaciones = await sql.query`
      SELECT 
        r.Id,
        r.ModuloPadreId,
        mp.Nombre as ModuloPadre,
        r.ModuloHijoId,
        mh.Nombre as ModuloHijo,
        r.Orden
      FROM TR_MODULO_RELACION r
      INNER JOIN TD_MODULOS mp ON r.ModuloPadreId = mp.Id
      INNER JOIN TD_MODULOS mh ON r.ModuloHijoId = mh.Id
      ORDER BY mp.Nombre, r.Orden
    `;
    
    if (relaciones.recordset.length === 0) {
      console.log('No hay relaciones registradas');
    } else {
      relaciones.recordset.forEach(r => {
        console.log(`${r.ModuloPadre} → ${r.ModuloHijo} (Orden: ${r.Orden})`);
      });
    }

    // 3. Buscar específicamente Alumnos v3
    console.log('\n=== ALUMNOS V3 Y SUS RELACIONES ===');
    const alumnosV3 = await sql.query`
      SELECT Id, Nombre FROM TD_MODULOS 
      WHERE Nombre LIKE '%Alumno%' AND Nombre LIKE '%v3%'
    `;
    
    if (alumnosV3.recordset.length > 0) {
      const alumnoId = alumnosV3.recordset[0].Id;
      console.log(`Alumno V3 ID: ${alumnoId}`);
      
      const relacionesAlumno = await sql.query`
        SELECT 
          r.ModuloHijoId,
          m.Nombre as ModuloHijo
        FROM TR_MODULO_RELACION r
        INNER JOIN TD_MODULOS m ON r.ModuloHijoId = m.Id
        WHERE r.ModuloPadreId = ${alumnoId}
        ORDER BY r.Orden
      `;
      
      if (relacionesAlumno.recordset.length === 0) {
        console.log('No tiene módulos relacionados');
      } else {
        console.log('Módulos relacionados:');
        relacionesAlumno.recordset.forEach(r => {
          console.log(`  - ${r.ModuloHijo} (ID: ${r.ModuloHijoId})`);
        });
      }
    } else {
      console.log('No se encontró ningún módulo "Alumno v3"');
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await sql.close();
  }
}

checkRelations();
