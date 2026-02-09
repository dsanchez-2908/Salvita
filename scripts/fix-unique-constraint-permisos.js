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

async function fixUniqueConstraint() {
  try {
    await sql.connect(config);
    console.log('✓ Conectado a SQL Server\n');

    // Paso 1: Ver constraints actuales
    console.log('📋 Verificando constraints actuales...');
    const constraints = await sql.query`
      SELECT 
        CONSTRAINT_NAME,
        CONSTRAINT_TYPE
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
      WHERE TABLE_NAME = 'TR_ROL_MODULO_PERMISO'
    `;
    
    console.log('Constraints actuales:');
    constraints.recordset.forEach(c => {
      console.log(`  • ${c.CONSTRAINT_NAME} (${c.CONSTRAINT_TYPE})`);
    });

    // Paso 2: Verificar si existe UQ_Rol_Modulo
    const tieneUQRolModulo = constraints.recordset.some(c => c.CONSTRAINT_NAME === 'UQ_Rol_Modulo');
    
    if (tieneUQRolModulo) {
      console.log('\n📦 Eliminando constraint antigua UQ_Rol_Modulo...');
      await sql.query`
        ALTER TABLE [dbo].[TR_ROL_MODULO_PERMISO]
        DROP CONSTRAINT UQ_Rol_Modulo
      `;
      console.log('✓ Constraint UQ_Rol_Modulo eliminada');
    } else {
      console.log('\n⚠️  Constraint UQ_Rol_Modulo no existe, saltando eliminación');
    }

    // Paso 3: Crear nueva constraint que incluya ModuloPadreId
    console.log('\n📦 Creando nueva constraint UQ_Rol_ModuloPadre_Modulo...');
    
    // Primero verificar si ya existe
    const tieneNuevaConstraint = constraints.recordset.some(c => c.CONSTRAINT_NAME === 'UQ_Rol_ModuloPadre_Modulo');
    
    if (tieneNuevaConstraint) {
      console.log('⚠️  Constraint UQ_Rol_ModuloPadre_Modulo ya existe');
    } else {
      await sql.query`
        ALTER TABLE [dbo].[TR_ROL_MODULO_PERMISO]
        ADD CONSTRAINT UQ_Rol_ModuloPadre_Modulo 
        UNIQUE (RolId, ModuloPadreId, ModuloId)
      `;
      console.log('✓ Constraint UQ_Rol_ModuloPadre_Modulo creada');
    }

    console.log('\n📋 Verificando constraints finales...');
    const constraintsFinal = await sql.query`
      SELECT 
        CONSTRAINT_NAME,
        CONSTRAINT_TYPE
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
      WHERE TABLE_NAME = 'TR_ROL_MODULO_PERMISO'
    `;
    
    console.log('Constraints finales:');
    constraintsFinal.recordset.forEach(c => {
      console.log(`  • ${c.CONSTRAINT_NAME} (${c.CONSTRAINT_TYPE})`);
    });

    console.log('\n✅ CORRECCIÓN COMPLETADA');
    console.log('Ahora puedes crear roles con Faltas v4 en múltiples contextos');

  } catch (err) {
    console.error('\n❌ Error:', err.message);
    console.error(err);
  } finally {
    await sql.close();
  }
}

fixUniqueConstraint();
