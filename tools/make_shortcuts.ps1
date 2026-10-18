# Shortcuts that open Jemma's Library in its own Chrome window (no tabs or address bar), as for Jemma's Sim World.
# Run:  powershell -ExecutionPolicy Bypass -File tools\make_shortcuts.ps1
# Makes "Jemma's Library" in the project folder, on the Desktop and in the Start menu. Delete them any time.

$root   = Split-Path -Parent $PSScriptRoot
$page   = 'file:///' + ((Join-Path $root 'site\index.html') -replace '\\', '/')
$icon   = Join-Path $root 'site\icon.ico'
$chrome = @("$env:ProgramFiles\Google\Chrome\Application\chrome.exe", "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
            "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe", "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe") |
          Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $chrome) { throw 'Neither Chrome nor Edge was found.' }

$shell = New-Object -ComObject WScript.Shell
foreach ($dir in @($root, [Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs'))) {
    $lnk = $shell.CreateShortcut((Join-Path $dir "Jemma's Library.lnk"))
    $lnk.TargetPath       = $chrome
    $lnk.Arguments        = "--app=`"$page`""
    $lnk.IconLocation     = "$icon,0"
    $lnk.WorkingDirectory = Join-Path $root 'site'
    $lnk.Description      = "Jemma's Library"
    $lnk.Save()
    "Made $($lnk.FullName)"
}
