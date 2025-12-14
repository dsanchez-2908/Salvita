# Script para habilitar TCP/IP en SQL Server Express
Write-Host "Habilitando TCP/IP en SQL Server Express..." -ForegroundColor Yellow

# Importar el módulo SQL Server
$regPath = "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\MSSQL*\MSSQLServer\SuperSocketNetLib\Tcp"

# Habilitar TCP/IP
try {
    # Buscar la ruta correcta
    $sqlPaths = Get-ChildItem -Path "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server" -ErrorAction SilentlyContinue | 
                Where-Object { $_.PSChildName -like "MSSQL*" }
    
    foreach ($path in $sqlPaths) {
        $tcpPath = Join-Path $path.PSPath "MSSQLServer\SuperSocketNetLib\Tcp"
        if (Test-Path $tcpPath) {
            Write-Host "Encontrado: $tcpPath" -ForegroundColor Green
            
            # Configurar IPAll con puerto 1433
            $ipAllPath = Join-Path $tcpPath "IPAll"
            if (Test-Path $ipAllPath) {
                Set-ItemProperty -Path $ipAllPath -Name "TcpPort" -Value "1433"
                Set-ItemProperty -Path $ipAllPath -Name "TcpDynamicPorts" -Value ""
                Write-Host "✓ Puerto 1433 configurado" -ForegroundColor Green
            }
            
            # Habilitar TCP/IP
            $protocolPath = $path.PSPath + "\MSSQLServer\SuperSocketNetLib\Tcp"
            Set-ItemProperty -Path $protocolPath -Name "Enabled" -Value 1
            Write-Host "✓ TCP/IP habilitado" -ForegroundColor Green
        }
    }
    
    Write-Host "`nReiniciando SQL Server..." -ForegroundColor Yellow
    Restart-Service -Name "MSSQL`$SQLEXPRESS" -Force
    Write-Host "✓ SQL Server reiniciado" -ForegroundColor Green
    
    Write-Host "`nIniciando SQL Server Browser..." -ForegroundColor Yellow
    Start-Service -Name "SQLBrowser"
    Set-Service -Name "SQLBrowser" -StartupType Automatic
    Write-Host "✓ SQL Server Browser iniciado" -ForegroundColor Green
    
    Write-Host "`n¡Configuración completada!" -ForegroundColor Green
    Write-Host "Ahora puedes conectarte usando: localhost\SQLEXPRESS o localhost,1433" -ForegroundColor Cyan
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "`nEste script requiere permisos de administrador." -ForegroundColor Yellow
    Write-Host "Cierra PowerShell y ábrelo como Administrador, luego ejecuta:" -ForegroundColor Yellow
    Write-Host "  .\enable-tcp.ps1" -ForegroundColor Cyan
}
