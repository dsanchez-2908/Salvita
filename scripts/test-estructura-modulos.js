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

async function testEstructuraModulos() {
  try {
    await sql.connect(config);
    console.log('✓ Conectado a SQL Server\n');

    console.log('=== ESTRUCTURA DE MÓDULOS PARA ROLES ===\n');

    // Obtener módulos activos
    const modulos = await sql.query`
      SELECT 
        Id,
        Nombre,
        Estado,
        Orden
      FROM TD_MODULOS
      WHERE Estado = 'Activo'
      ORDER BY Orden, Nombre
    `;

    console.log(`📋 Módulos activos: ${modulos.recordset.length}`);

    // Obtener relaciones
    const relaciones = await sql.query`
      SELECT DISTINCT
        mp.Nombre as ModuloPadre,
        mh.Nombre as ModuloHijo,
        r.Orden
      FROM TR_MODULO_RELACION r
      INNER JOIN TD_MODULOS mp ON r.ModuloPadreId = mp.Id
      INNER JOIN TD_MODULOS mh ON r.ModuloHijoId = mh.Id
      ORDER BY mp.Nombre, r.Orden
    `;

    console.log(`\n📋 Relaciones activas: ${relaciones.recordset.length}`);
    console.table(relaciones.recordset);

    // Identificar padres e hijos
    const todosLosHijos = new Set();
    const hijosPorPadre = {};

    relaciones.recordset.forEach(rel => {
      todosLosHijos.add(rel.ModuloHijo);
      if (!hijosPorPadre[rel.ModuloPadre]) {
        hijosPorPadre[rel.ModuloPadre] = [];
      }
      hijosPorPadre[rel.ModuloPadre].push(rel.ModuloHijo);
    });

    console.log('\n=== ESTRUCTURA JERÁRQUICA ===\n');
    
    modulos.recordset.forEach(modulo => {
      const esHijo = todosLosHijos.has(modulo.Nombre);
      const tieneHijos = hijosPorPadre[modulo.Nombre] && hijosPorPadre[modulo.Nombre].length > 0;
      
      if (!esHijo) {
        // Es un módulo principal
        console.log(`\n📘 Principal: ${modulo.Nombre} (ID: ${modulo.Id})`);
        if (tieneHijos) {
          console.log(`   ✓ Tiene ${hijosPorPadre[modulo.Nombre].length} hijo(s)`);
          console.log(`   ⚠️  "Ver Agrupado" DEBE aparecer`);
          hijosPorPadre[modulo.Nombre].forEach(hijo => {
            console.log(`      └─ ${hijo}`);
          });
        } else {
          console.log(`   ⚠️  No tiene hijos - "Ver Agrupado" NO debe aparecer`);
        }
      }
    });

    console.log('\n=== VERIFICAR EN PANTALLA ROLES ===');
    console.log('1. Ve a http://localhost:3000/dashboard/roles');
    console.log('2. Haz clic en "Nuevo Rol"');
    console.log('3. Verifica que:');
    console.log('   - Los módulos principales aparezcan con badge azul "Principal"');
    console.log('   - Sus hijos aparezcan indentados con badge gris "Secundario"');
    console.log('   - "Ver Agrupado" solo tenga checkbox para principales CON hijos');
    console.log('   - "Ver Agrupado" muestre "N/A" para principales SIN hijos y secundarios');

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await sql.close();
  }
}

testEstructuraModulos();
