# Shortcuts that open Jemma's Library in its own app window (no tabs or address bar), as for Jemma's Sim World.
# Run:  powershell -ExecutionPolicy Bypass -File tools\make_shortcuts.ps1
# - "Jemma's Library server" in her Startup folder: tools/serve.py (no window) serves the site at http://localhost:8020,
#   this computer only. Started now too.
# - "Jemma's Library" on the Desktop, in the Start menu and in the project folder: opens http://localhost:8020 as an app
#   window in its own Chrome profile, so Windows gives it its own taskbar group, apart from the Sims site (18 Oct).
#   Coming from the server rather than the folder, it can also be installed as a Chrome app (Chrome menu > Install),
#   which is the only way Chrome gives it a sharp taskbar icon (see TODO.md).
# Delete them any time; deleting the Startup one stops the server starting.

$root       = Split-Path -Parent $PSScriptRoot
$pythonw    = "$env:LOCALAPPDATA\Programs\Python\Python313\pythonw.exe"
$profileDir = Join-Path $env:LOCALAPPDATA "Jemmas Library\Chrome"
$icon       = Join-Path $root 'site\icon.ico'
$chrome = @("$env:ProgramFiles\Google\Chrome\Application\chrome.exe", "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
            "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe", "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe") |
          Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not (Test-Path $pythonw)) { throw "pythonw.exe not found at $pythonw" }
if (-not $chrome) { throw 'Neither Chrome nor Edge was found.' }

$shell = New-Object -ComObject WScript.Shell
$lnk = $shell.CreateShortcut((Join-Path ([Environment]::GetFolderPath('Startup')) "Jemma's Library server.lnk"))
$lnk.TargetPath       = $pythonw
$lnk.Arguments        = "`"$(Join-Path $root 'tools\serve.py')`""
$lnk.WorkingDirectory = $root
$lnk.IconLocation     = "$icon,0"
$lnk.Description      = "Serves Jemma's Library to its app window (this computer only)"
$lnk.Save()
"Made $($lnk.FullName)"
Start-Process -FilePath $pythonw -ArgumentList "`"$(Join-Path $root 'tools\serve.py')`"" -WorkingDirectory $root -WindowStyle Hidden
"Server started: http://localhost:8020/"

foreach ($dir in @($root, [Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs'))) {
    $lnk = $shell.CreateShortcut((Join-Path $dir "Jemma's Library.lnk"))
    $lnk.TargetPath       = $chrome
    $lnk.Arguments        = "--user-data-dir=`"$profileDir`" --no-first-run --no-default-browser-check --app=`"http://localhost:8020/`""
    $lnk.IconLocation     = "$icon,0"
    $lnk.WorkingDirectory = Join-Path $root 'site'
    $lnk.Description      = "Jemma's Library"
    $lnk.Save()
    "Made $($lnk.FullName)"
}
