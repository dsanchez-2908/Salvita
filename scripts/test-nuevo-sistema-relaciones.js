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

async function testNuevoSistema() {
  try {
    await sql.connect(config);
    console.log('✓ Conectado a SQL Server\n');

    console.log('=== VERIFICANDO NUEVO SISTEMA ===\n');

    // 1. Ver tabla TR_MODULO_REGISTRO_RELACION
    console.log('📋 TR_MODULO_REGISTRO_RELACION:');
    const relaciones = await sql.query`
      SELECT 
        r.Id,
        mp.Nombre as ModuloPadre,
        r.RegistroPadreId,
        mh.Nombre as ModuloHijo,
        r.RegistroHijoId,
        r.FechaCreacion
      FROM TR_MODULO_REGISTRO_RELACION r
      INNER JOIN TD_MODULOS mp ON r.ModuloPadreId = mp.Id
      INNER JOIN TD_MODULOS mh ON r.ModuloHijoId = mh.Id
      WHERE mp.Nombre LIKE '%v3' OR mh.Nombre LIKE '%v3'
      ORDER BY r.FechaCreacion DESC
    `;
    console.log(`Total relaciones V3: ${relaciones.recordset.length}`);
    if (relaciones.recordset.length > 0) {
      console.table(relaciones.recordset.slice(0, 10));
    }

    // 2. Ver registros de Alumnos v3
    console.log('\n📋 ALUMNOS V3:');
    const alumnos = await sql.query`
      SELECT Id, NombreCompleto, FechaCreacion
      FROM TD_MODULO_Alumnosv3
      ORDER BY FechaCreacion DESC
    `;
    console.log(`Total: ${alumnos.recordset.length}`);
    alumnos.recordset.forEach(a => {
      console.log(`  [${a.Id}] ${a.NombreCompleto}`);
    });

    // 3. Ver Notas v3 y sus relaciones
    console.log('\n📋 NOTAS V3:');
    const notas = await sql.query`
      SELECT 
        n.Id,
        n.FechaCreacion,
        r.RegistroPadreId as AlumnoId,
        a.NombreCompleto as Alumno
      FROM TD_MODULO_Notasv3 n
      LEFT JOIN TR_MODULO_REGISTRO_RELACION r 
        ON r.RegistroHijoId = n.Id 
        AND r.ModuloHijoId = (SELECT Id FROM TD_MODULOS WHERE Nombre = 'Notas v3')
      LEFT JOIN TD_MODULO_Alumnosv3 a ON r.RegistroPadreId = a.Id
      ORDER BY n.FechaCreacion DESC
    `;
    console.log(`Total: ${notas.recordset.length}`);
    notas.recordset.forEach(n => {
      const alumno = n.Alumno || '⚠️ SIN RELACIÓN';
      console.log(`  [${n.Id}] Alumno: ${alumno} (AlumnoId: ${n.AlumnoId || 'NULL'})`);
    });

    // 4. Ver Faltas v3 y sus relaciones
    console.log('\n📋 FALTAS V3:');
    const faltas = await sql.query`
      SELECT 
        f.Id,
        f.Fecha,
        f.FechaCreacion,
        r.ModuloPadreId,
        mp.Nombre as ModuloPadre,
        r.RegistroPadreId
      FROM TD_MODULO_Faltasv3 f
      LEFT JOIN TR_MODULO_REGISTRO_RELACION r 
        ON r.RegistroHijoId = f.Id 
        AND r.ModuloHijoId = (SELECT Id FROM TD_MODULOS WHERE Nombre = 'Faltas v3')
      LEFT JOIN TD_MODULOS mp ON r.ModuloPadreId = mp.Id
      ORDER BY f.FechaCreacion DESC
    `;
    console.log(`Total: ${faltas.recordset.length}`);
    faltas.recordset.forEach(f => {
      const padre = f.ModuloPadre || '⚠️ SIN RELACIÓN';
      console.log(`  [${f.Id}] Padre: ${padre} (PadreId: ${f.RegistroPadreId || 'NULL'})`);
    });

    console.log('\n=== PRUEBA AHORA ===');
    console.log('1. Entra al detalle de "Prueba 3" (Alumnos v3)');
    console.log('2. Crea una Nota v3 y una Falta v3');
    console.log('3. Verifica que aparezcan en las secciones');
    console.log('4. Crea un Profesor v3 nuevo');
    console.log('5. Entra al detalle del Profesor y agrega una Falta v3');
    console.log('6. Verifica que NO veas las faltas del alumno');
    console.log('7. Regresa al alumno y verifica que siga viendo sus faltas');

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await sql.close();
  }
}

testNuevoSistema();
