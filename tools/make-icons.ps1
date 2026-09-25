# 開発用：icons/icon.svg と同じ図形を System.Drawing で描き、PNG アイコンを作る（Windows PowerShell）。
#   powershell -ExecutionPolicy Bypass -File tools/make-icons.ps1
# デザインを変えたときは icon.svg とこのスクリプトの両方を直す。

Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $PSScriptRoot
$blue = [System.Drawing.ColorTranslator]::FromHtml('#0b6bcb')
$orange = [System.Drawing.ColorTranslator]::FromHtml('#ffb547')
$white = [System.Drawing.Color]::White

foreach ($size in 180, 192, 512) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.ScaleTransform($size / 512, $size / 512)
  $g.Clear($blue)

  $round = [System.Drawing.Drawing2D.LineCap]::Round
  $penW = New-Object System.Drawing.Pen $white, 28
  $penW.StartCap = $round; $penW.EndCap = $round
  $g.DrawLine($penW, 190, 128, 190, 384)

  $penO = New-Object System.Drawing.Pen $orange, 28
  $penO.StartCap = $round; $penO.EndCap = $round
  $g.DrawBezier($penO, 190, 262, 190, 200, 250, 184, 322, 184)

  $bw = New-Object System.Drawing.SolidBrush $white
  $bo = New-Object System.Drawing.SolidBrush $orange
  foreach ($cy in 140, 262, 384) { $g.FillEllipse($bw, 152, $cy - 38, 76, 76) }
  $g.FillEllipse($bo, 292, 146, 76, 76)

  $penM = New-Object System.Drawing.Pen $white, 20
  $g.DrawEllipse($penM, 284, 284, 92, 92)
  $penH = New-Object System.Drawing.Pen $white, 22
  $penH.StartCap = $round; $penH.EndCap = $round
  $g.DrawLine($penH, 362, 362, 396, 396)

  $out = Join-Path $root "icons/icon-$size.png"
  $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
  Write-Output "saved $out"
}
