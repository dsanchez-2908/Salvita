# Guía rápida para habilitar TCP/IP en SQL Server Express

## Problema
SQL Server Express por defecto NO tiene habilitado TCP/IP, solo Named Pipes.  
La librería `mssql` con el driver `tedious` tiene problemas conectándose via Named Pipes.

## Solución: Habilitar TCP/IP manualmente

### Opción 1: SQL Server Configuration Manager (Recomendada)

1. **Abrir SQL Server Configuration Manager:**
   - Presiona `Win + R`
   - Escribe: `SQLServerManager17.msc` (si no funciona, prueba `SQLServerManager16.msc` o busca "SQL Server Configuration Manager" en el menú inicio)
   - Presiona Enter

2. **Habilitar TCP/IP:**
   - En el árbol izquierdo, expande "SQL Server Network Configuration"
   - Haz clic en "Protocols for SQLEXPRESS"
   - En el panel derecho, haz clic derecho en "TCP/IP" → **Enable**

3. **Configurar puerto (opcional pero recomendado):**
   - Haz clic derecho en "TCP/IP" → **Properties**
   - Ve a la pestaña "IP Addresses"
   - Baja hasta la sección "IPAll"
   - Limpia el campo "TCP Dynamic Ports" (déjalo vacío)
   - En "TCP Port" escribe: `1433`
   - Clic en **OK**

4. **Reiniciar SQL Server:**
   ```powershell
   Restart-Service -Name "MSSQL$SQLEXPRESS" -Force
   ```

5. **Iniciar SQL Browser:**
   ```powershell
   Start-Service -Name "SQLBrowser"
   Set-Service -Name "SQLBrowser" -StartupType Automatic
   ```

### Opción 2: PowerShell (requiere permisos de administrador)

Abre PowerShell **como Administrador** y ejecuta:

```powershell
# Importar módulo WMI
$wmi = New-Object ('Microsoft.SqlServer.Management.Smo.Wmi.ManagedComputer')

# Obtener configuración TCP/IP
$uri = "ManagedComputer[@Name='$env:COMPUTERNAME']/ServerInstance[@Name='SQLEXPRESS']/ServerProtocol[@Name='Tcp']"
$Tcp = $wmi.GetSmoObject($uri)

# Habilitar TCP/IP
$Tcp.IsEnabled = $true
$Tcp.Alter()

# Configurar puerto 1433
$ipAll = $Tcp.IPAddresses['IPAll']
$ipAll.IPAddressProperties['TcpDynamicPorts'].Value = ''
$ipAll.IPAddressProperties['TcpPort'].Value = '1433'
$Tcp.Alter()

# Reiniciar SQL Server
Restart-Service -Name "MSSQL$SQLEXPRESS" -Force

# Iniciar SQL Browser
Start-Service -Name "SQLBrowser"
Set-Service -Name "SQLBrowser" -StartupType Automatic

Write-Host "✓ TCP/IP habilitado en puerto 1433" -ForegroundColor Green
```

### Verificar que funciona

```powershell
# Verificar que el puerto esté abierto
Test-NetConnection -ComputerName localhost -Port 1433

# Si TcpTestSucceeded es True, está funcionando
```

### Actualizar configuración de la aplicación

Después de habilitar TCP/IP, la aplicación debería conectarse automáticamente.

Si usaste el puerto 1433, asegúrate de que `.env.local` tenga:

```env
DB_SERVER=localhost
DB_USER=salvita_user
DB_PASSWORD=Salvita2024!
```

O puedes mantener la instancia nombrada:

```env
DB_SERVER=localhost\SQLEXPRESS
DB_USER=salvita_user
DB_PASSWORD=Salvita2024!
```

### Probar la conexión

```powershell
node test-connection.js
```

Deberías ver:
```
✓ Conexión exitosa!
SQL Server Version: Microsoft SQL Server 2025...
Usuarios en BD: 1
✓ Test completado!
```

---

## ¿Por qué es necesario?

- SQL Server Express por defecto solo acepta conexiones locales por Named Pipes
- La librería `mssql` para Node.js usa `tedious`, que tiene problemas con Named Pipes en Windows
- `msnodesqlv8` podría funcionar, pero tiene problemas de compatibilidad con Node.js v24
- Habilitar TCP/IP es la solución más estable y compatible

## Alternativas (no recomendadas)

- Downgrade a Node.js v18 LTS y usar `msnodesqlv8`
- Usar una librería diferente como `node-sqlserver-v8` directamente
- Conectarse remotamente a SQL Server desde otro contenedor/máquina
