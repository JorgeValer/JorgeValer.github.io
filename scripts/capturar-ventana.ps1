# Captura una ventana de escritorio por título. Se usa para la app de ITERUM
# (React Native for Windows), que no se puede fotografiar con Playwright.
#
#   powershell -File capturar-ventana.ps1 -Titulo "Iterum" -Salida "..\assets\shots\iterum-app.png"
param(
  [Parameter(Mandatory = $true)][string]$Titulo,
  [Parameter(Mandatory = $true)][string]$Salida
)

Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
"@

$proc = Get-Process | Where-Object { $_.MainWindowTitle -eq $Titulo } | Select-Object -First 1
if (-not $proc) { Write-Error "No hay ventana con título '$Titulo'"; exit 1 }

$h = $proc.MainWindowHandle
[Win]::ShowWindow($h, 3) | Out-Null   # 3 = maximizada
Start-Sleep -Milliseconds 900
[Win]::SetForegroundWindow($h) | Out-Null
Start-Sleep -Milliseconds 1600

$r = New-Object Win+RECT
[Win]::GetWindowRect($h, [ref]$r) | Out-Null
$ancho = $r.Right - $r.Left
$alto = $r.Bottom - $r.Top
if ($ancho -le 0 -or $alto -le 0) { Write-Error "Dimensiones inválidas: ${ancho}x${alto}"; exit 1 }

$bmp = New-Object System.Drawing.Bitmap $ancho, $alto
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($r.Left, $r.Top, 0, 0, $bmp.Size)
$bmp.Save($Salida, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()

Write-Output "Guardado ${ancho}x${alto} -> $Salida"
