/**
 * Script de creación de base de datos desde cero
 * Ejecutar con: node scripts/setup-db-from-scratch.js
 * 
 * Este script:
 * 1. Crea la base de datos salvita si no existe
 * 2. Ejecuta el schema.sql completo
 * 3. Crea el usuario admin con contraseña hasheada
 */

const bcrypt = require('bcryptjs');
const sql = require('mssql');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Configuración para conectar a master primero
const masterConfig = {
  server: process.env.DB_SERVER || '172.16.16.60',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'Lpa1234$',
  database: 'master',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  },
  requestTimeout: 60000,
  connectionTimeout: 60000
};

// Configuración para conectar a salvita
const dbConfig = {
  ...masterConfig,
  database: 'salvita'
};

async function setupDatabase() {
  let masterPool = null;
  let dbPool = null;

  try {
    console.log('='.repeat(60));
    console.log('INICIALIZANDO BASE DE DATOS SALVITA DESDE CERO');
    console.log('='.repeat(60));
    console.log('');

    // Paso 1: Conectar a master y crear/recrear la base de datos
    console.log('1. Conectando al servidor SQL Server (master)...');
    masterPool = await sql.connect(masterConfig);
    console.log('   ✓ Conexión exitosa');

    // Verificar si la base de datos existe
    console.log('2. Verificando si la base de datos salvita existe...');
    const dbCheckResult = await masterPool.request()
      .query(`SELECT name FROM sys.databases WHERE name = 'salvita'`);

    if (dbCheckResult.recordset.length > 0) {
      console.log('   ⚠ La base de datos salvita ya existe. Eliminándola...');
      
      // Cerrar todas las conexiones activas
      await masterPool.request().query(`
        ALTER DATABASE salvita SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
      `);
      
      // Eliminar la base de datos
      await masterPool.request().query(`DROP DATABASE salvita;`);
      console.log('   ✓ Base de datos eliminada');
    }

    // Crear la base de datos
    console.log('3. Creando la base de datos salvita...');
    await masterPool.request().query(`CREATE DATABASE salvita;`);
    console.log('   ✓ Base de datos creada');

    // Cerrar conexión a master
    await masterPool.close();
    masterPool = null;

    // Paso 2: Conectar a salvita y ejecutar el schema
    console.log('4. Conectando a la base de datos salvita...');
    dbPool = await sql.connect(dbConfig);
    console.log('   ✓ Conexión exitosa');

    // Paso 3: Crear las tablas manualmente para asegurar que se crean
    console.log('6. Creando estructura de tablas...');
    
    // Tabla TD_PARAMETROS
    await dbPool.request().query(`
      CREATE TABLE [dbo].[TD_PARAMETROS] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [Parametro] VARCHAR(250) NOT NULL UNIQUE,
        [Valor] VARCHAR(MAX) NOT NULL,
        [FechaCreacion] DATETIME DEFAULT GETDATE(),
        [FechaModificacion] DATETIME DEFAULT GETDATE()
      );
    `);
    console.log('   ✓ Tabla TD_PARAMETROS creada');

    // Tabla TD_ROLES
    await dbPool.request().query(`
      CREATE TABLE [dbo].[TD_ROLES] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [Nombre] VARCHAR(100) NOT NULL UNIQUE,
        [Descripcion] VARCHAR(500),
        [Estado] VARCHAR(20) DEFAULT 'Activo' CHECK ([Estado] IN ('Activo', 'Inactivo')),
        [AccesoTrazas] BIT NOT NULL DEFAULT 0,
        [FechaCreacion] DATETIME DEFAULT GETDATE(),
        [FechaModificacion] DATETIME DEFAULT GETDATE(),
        [UsuarioCreacion] VARCHAR(100),
        [UsuarioModificacion] VARCHAR(100)
      );
    `);
    console.log('   ✓ Tabla TD_ROLES creada');

    // Tabla TD_USUARIOS
    await dbPool.request().query(`
      CREATE TABLE [dbo].[TD_USUARIOS] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [Nombre] VARCHAR(200) NOT NULL,
        [Usuario] VARCHAR(100) NOT NULL UNIQUE,
        [Clave] VARCHAR(255) NOT NULL,
        [Estado] VARCHAR(20) DEFAULT 'Activo' CHECK ([Estado] IN ('Activo', 'Baja')),
        [FechaAlta] DATETIME DEFAULT GETDATE(),
        [FechaModificacion] DATETIME DEFAULT GETDATE(),
        [UsuarioCreacion] VARCHAR(100),
        [UsuarioModificacion] VARCHAR(100)
      );
    `);
    console.log('   ✓ Tabla TD_USUARIOS creada');

    // Tabla TR_USUARIO_ROL
    await dbPool.request().query(`
      CREATE TABLE [dbo].[TR_USUARIO_ROL] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [UsuarioId] INT NOT NULL,
        [RolId] INT NOT NULL,
        [FechaAsignacion] DATETIME DEFAULT GETDATE(),
        [UsuarioAsignacion] VARCHAR(100),
        CONSTRAINT FK_TR_USUARIO_ROL_Usuario FOREIGN KEY ([UsuarioId]) REFERENCES [dbo].[TD_USUARIOS]([Id]) ON DELETE CASCADE,
        CONSTRAINT FK_TR_USUARIO_ROL_Rol FOREIGN KEY ([RolId]) REFERENCES [dbo].[TD_ROLES]([Id]) ON DELETE CASCADE,
        CONSTRAINT UQ_Usuario_Rol UNIQUE ([UsuarioId], [RolId])
      );
    `);
    console.log('   ✓ Tabla TR_USUARIO_ROL creada');

    // Tabla TD_MODULOS
    await dbPool.request().query(`
      CREATE TABLE [dbo].[TD_MODULOS] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [Nombre] VARCHAR(100) NOT NULL UNIQUE,
        [NombreTabla] VARCHAR(150) NOT NULL UNIQUE,
        [Tipo] VARCHAR(20) NOT NULL CHECK ([Tipo] IN ('Principal', 'Secundario', 'Independiente')),
        [ModuloPrincipalId] INT NULL,
        [Estado] VARCHAR(20) DEFAULT 'Activo' CHECK ([Estado] IN ('Activo', 'Inactivo')),
        [Icono] VARCHAR(50),
        [Orden] INT DEFAULT 0,
        [FechaCreacion] DATETIME DEFAULT GETDATE(),
        [FechaModificacion] DATETIME DEFAULT GETDATE(),
        [UsuarioCreacion] VARCHAR(100),
        [UsuarioModificacion] VARCHAR(100),
        CONSTRAINT FK_TD_MODULOS_ModuloPrincipal FOREIGN KEY ([ModuloPrincipalId]) REFERENCES [dbo].[TD_MODULOS]([Id])
      );
    `);
    console.log('   ✓ Tabla TD_MODULOS creada');

    // Tabla TD_LISTAS
    await dbPool.request().query(`
      CREATE TABLE [dbo].[TD_LISTAS] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [Nombre] VARCHAR(100) NOT NULL UNIQUE,
        [Descripcion] VARCHAR(500),
        [Estado] VARCHAR(20) DEFAULT 'Activo' CHECK ([Estado] IN ('Activo', 'Inactivo')),
        [FechaCreacion] DATETIME DEFAULT GETDATE(),
        [FechaModificacion] DATETIME DEFAULT GETDATE(),
        [UsuarioCreacion] VARCHAR(100),
        [UsuarioModificacion] VARCHAR(100)
      );
    `);
    console.log('   ✓ Tabla TD_LISTAS creada');

    // Tabla TD_CAMPOS
    await dbPool.request().query(`
      CREATE TABLE [dbo].[TD_CAMPOS] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [ModuloId] INT NOT NULL,
        [Nombre] VARCHAR(100) NOT NULL,
        [NombreColumna] VARCHAR(100) NOT NULL,
        [TipoDato] VARCHAR(50) NOT NULL CHECK ([TipoDato] IN ('Texto', 'Descripcion', 'Numero', 'Fecha', 'FechaHora', 'Lista', 'Archivo')),
        [Largo] INT NULL,
        [ListaId] INT NULL,
        [Orden] INT DEFAULT 0,
        [Visible] BIT DEFAULT 1,
        [VisibleEnGrilla] BIT DEFAULT 1,
        [Obligatorio] BIT DEFAULT 0,
        [FechaCreacion] DATETIME DEFAULT GETDATE(),
        [UsuarioCreacion] VARCHAR(100),
        CONSTRAINT FK_TD_CAMPOS_Modulo FOREIGN KEY ([ModuloId]) REFERENCES [dbo].[TD_MODULOS]([Id]) ON DELETE CASCADE,
        CONSTRAINT UQ_Campo_Modulo UNIQUE ([ModuloId], [NombreColumna])
      );
    `);
    console.log('   ✓ Tabla TD_CAMPOS creada');

    // Tabla TD_VALORES_LISTA
    await dbPool.request().query(`
      CREATE TABLE [dbo].[TD_VALORES_LISTA] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [ListaId] INT NOT NULL,
        [Valor] VARCHAR(200) NOT NULL,
        [Orden] INT DEFAULT 0,
        [Estado] VARCHAR(20) DEFAULT 'Activo' CHECK ([Estado] IN ('Activo', 'Inactivo')),
        [FechaCreacion] DATETIME DEFAULT GETDATE(),
        [UsuarioCreacion] VARCHAR(100),
        CONSTRAINT FK_TD_VALORES_LISTA_Lista FOREIGN KEY ([ListaId]) REFERENCES [dbo].[TD_LISTAS]([Id]) ON DELETE CASCADE
      );
    `);
    console.log('   ✓ Tabla TD_VALORES_LISTA creada');

    // Tabla TR_ROL_MODULO_PERMISO
    await dbPool.request().query(`
      CREATE TABLE [dbo].[TR_ROL_MODULO_PERMISO] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [RolId] INT NOT NULL,
        [ModuloId] INT NOT NULL,
        [PermisoAgregar] BIT DEFAULT 0,
        [PermisoModificar] BIT DEFAULT 0,
        [PermisoEliminar] BIT DEFAULT 0,
        [PermisoVer] BIT DEFAULT 1,
        [PermisoVerAgrupado] BIT DEFAULT 0,
        [FechaAsignacion] DATETIME DEFAULT GETDATE(),
        [UsuarioAsignacion] VARCHAR(100),
        CONSTRAINT FK_TR_ROL_MODULO_PERMISO_Rol FOREIGN KEY ([RolId]) REFERENCES [dbo].[TD_ROLES]([Id]) ON DELETE CASCADE,
        CONSTRAINT FK_TR_ROL_MODULO_PERMISO_Modulo FOREIGN KEY ([ModuloId]) REFERENCES [dbo].[TD_MODULOS]([Id]) ON DELETE CASCADE,
        CONSTRAINT UQ_Rol_Modulo UNIQUE ([RolId], [ModuloId])
      );
    `);
    console.log('   ✓ Tabla TR_ROL_MODULO_PERMISO creada');

    // Tabla TD_DOCUMENTOS
    await dbPool.request().query(`
      CREATE TABLE [dbo].[TD_DOCUMENTOS] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [DocumentoId] VARCHAR(100) NOT NULL UNIQUE,
        [NombreArchivo] VARCHAR(500) NOT NULL,
        [ContentType] VARCHAR(100),
        [ModuloId] INT NOT NULL,
        [RegistroId] INT NOT NULL,
        [CampoId] INT NOT NULL,
        [FechaCreacion] DATETIME DEFAULT GETDATE(),
        [UsuarioCreacion] VARCHAR(100),
        CONSTRAINT FK_TD_DOCUMENTOS_Modulo FOREIGN KEY ([ModuloId]) REFERENCES [dbo].[TD_MODULOS]([Id]),
        CONSTRAINT FK_TD_DOCUMENTOS_Campo FOREIGN KEY ([CampoId]) REFERENCES [dbo].[TD_CAMPOS]([Id])
      );
    `);
    console.log('   ✓ Tabla TD_DOCUMENTOS creada');

    // Tabla TD_MODULO_TRAZAS (trazas de auditoría)
    await dbPool.request().query(`
      CREATE TABLE [dbo].[TD_MODULO_TRAZAS] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [UsuarioId] INT NOT NULL,
        [Usuario] VARCHAR(100) NOT NULL,
        [Accion] VARCHAR(50) NOT NULL,
        [Proceso] VARCHAR(100),
        [Detalle] VARCHAR(MAX),
        [FechaHora] DATETIME DEFAULT GETDATE()
      );
    `);
    console.log('   ✓ Tabla TD_MODULO_TRAZAS creada');

    // Tabla TD_DASHBOARD_CONFIG
    await dbPool.request().query(`
      CREATE TABLE [dbo].[TD_DASHBOARD_CONFIG] (
        [Id] INT IDENTITY(1,1) PRIMARY KEY,
        [RolId] INT NOT NULL,
        [ModuloId] INT NOT NULL,
        [TipoVisualizacion] VARCHAR(50) NOT NULL CHECK ([TipoVisualizacion] IN ('Agrupamiento', 'DetalleFiltrado')),
        [CampoAgrupamiento] VARCHAR(100) NULL,
        [CampoFiltro] VARCHAR(100) NULL,
        [ValorFiltro] VARCHAR(MAX) NULL,
        [Orden] INT DEFAULT 0,
        [FechaCreacion] DATETIME DEFAULT GETDATE(),
        [FechaModificacion] DATETIME DEFAULT GETDATE(),
        [UsuarioCreacion] VARCHAR(100),
        [UsuarioModificacion] VARCHAR(100),
        CONSTRAINT FK_TD_DASHBOARD_CONFIG_Rol FOREIGN KEY ([RolId]) REFERENCES [dbo].[TD_ROLES]([Id]) ON DELETE CASCADE,
        CONSTRAINT FK_TD_DASHBOARD_CONFIG_Modulo FOREIGN KEY ([ModuloId]) REFERENCES [dbo].[TD_MODULOS]([Id]) ON DELETE CASCADE
      );
    `);
    console.log('   ✓ Tabla TD_DASHBOARD_CONFIG creada');

    // Crear índices
    console.log('7. Creando índices...');
    await dbPool.request().query(`
      CREATE NONCLUSTERED INDEX IX_TD_USUARIOS_Usuario ON [dbo].[TD_USUARIOS]([Usuario]);
      CREATE NONCLUSTERED INDEX IX_TD_USUARIOS_Estado ON [dbo].[TD_USUARIOS]([Estado]);
      CREATE NONCLUSTERED INDEX IX_TD_MODULOS_Tipo ON [dbo].[TD_MODULOS]([Tipo]);
      CREATE NONCLUSTERED INDEX IX_TD_MODULOS_Estado ON [dbo].[TD_MODULOS]([Estado]);
      CREATE NONCLUSTERED INDEX IX_TD_CAMPOS_ModuloId ON [dbo].[TD_CAMPOS]([ModuloId]);
      CREATE NONCLUSTERED INDEX IX_TD_DOCUMENTOS_ModuloRegistro ON [dbo].[TD_DOCUMENTOS]([ModuloId], [RegistroId]);
      CREATE NONCLUSTERED INDEX IX_TD_MODULO_TRAZAS_FechaHora ON [dbo].[TD_MODULO_TRAZAS]([FechaHora]);
      CREATE NONCLUSTERED INDEX IX_TD_MODULO_TRAZAS_UsuarioId ON [dbo].[TD_MODULO_TRAZAS]([UsuarioId]);
      CREATE NONCLUSTERED INDEX IX_TD_MODULO_TRAZAS_Proceso ON [dbo].[TD_MODULO_TRAZAS]([Proceso]);
    `);
    console.log('   ✓ Índices creados');

    // Insertar datos iniciales
    console.log('8. Insertando datos iniciales...');
    
    // Insertar parámetros
    await dbPool.request().query(`
      INSERT INTO [dbo].[TD_PARAMETROS] ([Parametro], [Valor]) VALUES
      ('Nombre Proyecto', 'Salvita'),
      ('URL Token', 'http://172.16.16.60:8981/realms/aditus/protocol/openid-connect/token'),
      ('Usuario Token', 'dsanchez'),
      ('Clave Token', '12345'),
      ('URL BASE Agregar Documento', 'http://172.16.16.60:8093/documents/base64'),
      ('URL BASE Modificar Documento', 'http://172.16.16.60:8093/documents'),
      ('URL BASE Visor', 'http://172.16.16.60:6095/LPAViewer/virtualviewer'),
      ('Codigo libreria', '32a76e80-1d2d-47fe-9b9d-d423cf644d73'),
      ('Codigo de clase', '7a6f0e1e-51e1-4ea1-b34c-804a72cbc994'),
      ('Logo', ''),
      ('Descripcion Login', 'Bienvenido al Sistema Salvita');
    `);
    
    // Insertar rol Administrador
    await dbPool.request().query(`
      INSERT INTO [dbo].[TD_ROLES] ([Nombre], [Descripcion], [AccesoTrazas], [UsuarioCreacion]) 
      VALUES ('Administrador', 'Acceso completo al sistema', 1, 'system');
    `);
    
    console.log('   ✓ Datos iniciales insertados');

    // Paso 4: Crear usuario administrador
    console.log('9. Configurando usuario administrador...');
    const hashedPassword = await bcrypt.hash('123', 10);
    
    // Insertar usuario admin
    await dbPool.request()
      .input('nombre', sql.VarChar, 'Administrador')
      .input('usuario', sql.VarChar, 'admin')
      .input('clave', sql.VarChar, hashedPassword)
      .input('usuarioCreacion', sql.VarChar, 'system')
      .query(`
        INSERT INTO TD_USUARIOS ([Nombre], [Usuario], [Clave], [UsuarioCreacion]) 
        VALUES (@nombre, @usuario, @clave, @usuarioCreacion)
      `);
    
    // Asignar rol Administrador al usuario admin
    await dbPool.request().query(`
      INSERT INTO [dbo].[TR_USUARIO_ROL] ([UsuarioId], [RolId], [UsuarioAsignacion]) 
      VALUES (1, 1, 'system')
    `);
    
    console.log('   ✓ Usuario admin configurado');

    // Cerrar conexión
    await dbPool.close();

    console.log('');
    console.log('='.repeat(60));
    console.log('✓ BASE DE DATOS INICIALIZADA CORRECTAMENTE');
    console.log('='.repeat(60));
    console.log('');
    console.log('Configuración de conexión:');
    console.log(`  Servidor: ${process.env.DB_SERVER || '172.16.16.60'}`);
    console.log(`  Base de datos: salvita`);
    console.log(`  Usuario DB: ${process.env.DB_USER || 'sa'}`);
    console.log('');
    console.log('Credenciales de acceso a la aplicación:');
    console.log('  Usuario: admin');
    console.log('  Contraseña: 123');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('✗ Error durante la inicialización:', error.message);
    console.error('');
    console.error('Detalles:', error);
    process.exit(1);
  } finally {
    // Asegurarse de cerrar las conexiones
    if (masterPool) {
      try { await masterPool.close(); } catch (e) {}
    }
    if (dbPool) {
      try { await dbPool.close(); } catch (e) {}
    }
  }
}

setupDatabase();
