# Create Desktop Shortcut for Resonix Music
$desktop = [Environment]::GetFolderPath('Desktop')
if (-not (Test-Path $desktop)) {
    if (Test-Path "$env:USERPROFILE\Desktop") {
        $desktop = "$env:USERPROFILE\Desktop"
    } elseif (Test-Path "$env:USERPROFILE\OneDrive\Desktop") {
        $desktop = "$env:USERPROFILE\OneDrive\Desktop"
    }
}

$projectDir = $PSScriptRoot
if (-not $projectDir) {
    $projectDir = "C:\Users\KISHOR SRE\OneDrive\Music lol"
}

$iconPath = Join-Path $projectDir "resonix.ico"
$vbsLauncher = Join-Path $projectDir "ResonixMusic.vbs"
$shortcutFile = Join-Path $desktop "Resonix Music.lnk"

$wsh = New-Object -ComObject WScript.Shell
$shortcut = $wsh.CreateShortcut($shortcutFile)
$shortcut.TargetPath = "wscript.exe"
$shortcut.Arguments = "`"$vbsLauncher`""
$shortcut.WorkingDirectory = $projectDir
$shortcut.IconLocation = "$iconPath,0"
$shortcut.Description = "Resonix Music - Premium Music Streaming App"
$shortcut.Save()

Write-Host "===========================================================" -ForegroundColor Green
Write-Host " [SUCCESS] Resonix Music Shortcut Created on your Desktop!" -ForegroundColor Green
Write-Host " Location: $shortcutFile" -ForegroundColor Cyan
Write-Host " Double-click 'Resonix Music' on your desktop to launch!" -ForegroundColor Yellow
Write-Host "===========================================================" -ForegroundColor Green
