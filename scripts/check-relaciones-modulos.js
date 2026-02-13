const sql = require('mssql');

const config = {
  server: '172.16.16.60',
  port: 1433,
  database: 'salvita',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  },
  authentication: {
    type: 'default',
    options: {
      userName: 'sa',
      password: 'Lpa1234$'
    }
  }
};

async function checkRelaciones() {
  try {
    await sql.connect(config);
    
    // Ver todos los módulos
    const modulosResult = await sql.query`
      SELECT Id, Nombre, MostrarEnMenu, Icono, Orden
      FROM TD_MODULOS
      ORDER BY Orden, Nombre
    `;
    
    console.log('\n=== Módulos ===');
    console.table(modulosResult.recordset);
    
    // Ver todas las relaciones
    const relacionesResult = await sql.query`
      SELECT 
        r.Id,
        r.ModuloPadreId,
        mp.Nombre AS ModuloPadre,
        r.ModuloHijoId,
        mh.Nombre AS ModuloHijo,
        r.Orden
      FROM TR_MODULO_RELACION r
      INNER JOIN TD_MODULOS mp ON r.ModuloPadreId = mp.Id
      INNER JOIN TD_MODULOS mh ON r.ModuloHijoId = mh.Id
      ORDER BY mp.Nombre, r.Orden
    `;
    
    console.log('\n=== Relaciones entre módulos ===');
    if (relacionesResult.recordset.length === 0) {
      console.log('No hay relaciones configuradas');
    } else {
      console.table(relacionesResult.recordset);
    }
    
    await sql.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkRelaciones();
