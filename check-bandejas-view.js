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

async function checkBandejasView() {
  try {
    await sql.connect(config);
    console.log('Conectado a la base de datos\n');

    // Verificar si existe la vista
    console.log('=== VERIFICANDO VISTA VW_BANDEJAS_POR_USUARIO ===');
    const vistaExiste = await sql.query`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.VIEWS
      WHERE TABLE_NAME = 'VW_BANDEJAS_POR_USUARIO'
    `;

    if (vistaExiste.recordset.length > 0) {
      console.log('✓ Vista VW_BANDEJAS_POR_USUARIO existe');
      
      // Obtener definición de la vista
      console.log('\n=== DEFINICIÓN DE LA VISTA ===');
      const definicion = await sql.query`
        SELECT OBJECT_DEFINITION(OBJECT_ID('VW_BANDEJAS_POR_USUARIO')) AS Definicion
      `;
      console.log(definicion.recordset[0].Definicion);
    } else {
      console.log('✗ Vista VW_BANDEJAS_POR_USUARIO NO existe');
      console.log('\nCreando vista...');
      
      await sql.query`
        CREATE VIEW VW_BANDEJAS_POR_USUARIO AS
        -- Bandejas asignadas directamente al usuario
        SELECT 
          bu.UsuarioId,
          bu.BandejaId
        FROM TR_BANDEJA_USUARIO bu
        
        UNION
        
        -- Bandejas asignadas a través de roles del usuario
        SELECT 
          ur.UsuarioId,
          br.BandejaId
        FROM TR_USUARIO_ROL ur
        INNER JOIN TR_BANDEJA_ROL br ON ur.RolId = br.RolId
      `;
      
      console.log('✓ Vista creada exitosamente');
    }

    // Verificar estructura de TD_BANDEJAS
    console.log('\n=== ESTRUCTURA TD_BANDEJAS ===');
    const columnas = await sql.query`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'TD_BANDEJAS'
      ORDER BY ORDINAL_POSITION
    `;
    
    columnas.recordset.forEach(col => {
      console.log(`${col.COLUMN_NAME.padEnd(25)} ${col.DATA_TYPE}`);
    });

    // Probar una consulta de ejemplo (asumiendo userId = 1 para admin)
    console.log('\n=== BANDEJAS DEL USUARIO ADMIN (ID=1) ===');
    const bandejas = await sql.query`
      SELECT DISTINCT b.Id, b.Nombre, b.Estado
      FROM TD_BANDEJAS b
      INNER JOIN VW_BANDEJAS_POR_USUARIO vw ON b.Id = vw.BandejaId
      WHERE vw.UsuarioId = 1 AND b.Estado = 'Activa'
      ORDER BY b.Nombre
    `;
    
    bandejas.recordset.forEach(b => {
      console.log(`ID: ${b.Id} - ${b.Nombre} (${b.Estado})`);
    });

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
  } finally {
    await sql.close();
  }
}

checkBandejasView();
