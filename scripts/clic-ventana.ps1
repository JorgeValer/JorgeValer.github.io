# Hace clic en una coordenada relativa a la ventana y captura el resultado.
# La app de ITERUM es React Native for Windows: no hay DOM al que apuntar, así
# que se navega por coordenadas sobre la ventana ya maximizada.
#
#   powershell -File clic-ventana.ps1 -Titulo "Iterum" -X 105 -Y 247 -Salida "...\paso.png"
param(
  [Parameter(Mandatory = $true)][string]$Titulo,
  [Parameter(Mandatory = $true)][int]$X,
  [Parameter(Mandatory = $true)][int]$Y,
  [string]$Salida = "",
  [int]$EsperaMs = 2500
)

Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WinClic {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint f, uint dx, uint dy, uint d, int extra);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  public const uint ABAJO = 0x0002, ARRIBA = 0x0004;
}
"@

$proc = Get-Process | Where-Object { $_.MainWindowTitle -eq $Titulo } | Select-Object -First 1
if (-not $proc) { Write-Error "No hay ventana con título '$Titulo'"; exit 1 }

$h = $proc.MainWindowHandle
[WinClic]::ShowWindow($h, 3) | Out-Null
Start-Sleep -Milliseconds 700
[WinClic]::SetForegroundWindow($h) | Out-Null
Start-Sleep -Milliseconds 900

$r = New-Object WinClic+RECT
[WinClic]::GetWindowRect($h, [ref]$r) | Out-Null

[WinClic]::SetCursorPos($r.Left + $X, $r.Top + $Y) | Out-Null
Start-Sleep -Milliseconds 350
[WinClic]::mouse_event([WinClic]::ABAJO, 0, 0, 0, 0)
Start-Sleep -Milliseconds 90
[WinClic]::mouse_event([WinClic]::ARRIBA, 0, 0, 0, 0)

Start-Sleep -Milliseconds $EsperaMs

if ($Salida) {
  [WinClic]::GetWindowRect($h, [ref]$r) | Out-Null
  $ancho = $r.Right - $r.Left; $alto = $r.Bottom - $r.Top
  $bmp = New-Object System.Drawing.Bitmap $ancho, $alto
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.CopyFromScreen($r.Left, $r.Top, 0, 0, $bmp.Size)
  $bmp.Save($Salida, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
  Write-Output "Clic en ($X,$Y) -> $Salida"
} else {
  Write-Output "Clic en ($X,$Y)"
}
