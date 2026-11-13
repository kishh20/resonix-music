# Resonix Music Desktop App Launcher
$projectDir = "C:\Users\KISHOR SRE\OneDrive\Music lol"
Set-Location $projectDir

# 1. Check if backend (port 8000) is running
$backendRunning = $false
try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $tcp.Connect("127.0.0.1", 8000)
    $backendRunning = $true
    $tcp.Close()
} catch {}

if (-not $backendRunning) {
    $pythonExe = Join-Path $projectDir "backend\venv\Scripts\python.exe"
    $runPy = Join-Path $projectDir "backend\run.py"
    $backendDir = Join-Path $projectDir "backend"
    Start-Process -FilePath $pythonExe -ArgumentList "`"$runPy`"" -WorkingDirectory $backendDir -WindowStyle Hidden
}

# 2. Check if frontend (port 5173) is running
$frontendRunning = $false
try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $tcp.Connect("127.0.0.1", 5173)
    $frontendRunning = $true
    $tcp.Close()
} catch {}

if (-not $frontendRunning) {
    $frontendDir = Join-Path $projectDir "frontend"
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c call npm.cmd run dev -- --host 0.0.0.0" -WorkingDirectory $frontendDir -WindowStyle Hidden
}

# 3. Wait up to 10 seconds for frontend to become responsive
for ($i = 0; $i -lt 20; $i++) {
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.Connect("127.0.0.1", 5173)
        $tcp.Close()
        break
    } catch {
        Start-Sleep -Milliseconds 500
    }
}

# 4. Find standalone app runner (Microsoft Edge or Google Chrome in --app mode)
$edgePath = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edgePath)) {
    $edgePath = "${env:ProgramFiles}\Microsoft\Edge\Application\msedge.exe"
}
$chromePath = "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $chromePath)) {
    $chromePath = "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe"
}

$url = "http://localhost:5173"
$appArgs = "--app=$url --app-id=resonix-music"

if (Test-Path $edgePath) {
    Start-Process -FilePath $edgePath -ArgumentList $appArgs
} elseif (Test-Path $chromePath) {
    Start-Process -FilePath $chromePath -ArgumentList $appArgs
} else {
    Start-Process -FilePath $url
}
