# Jemma's Library as an installed Chrome app (18 Oct): a small local server starts at login (tools/serve.py, no window),
# and Chrome installs http://localhost:8020 as an app with its own window, taskbar group and a sharp icon. Chrome makes
# the app's own Desktop and Start menu shortcuts when she installs it.
# Run:  powershell -ExecutionPolicy Bypass -File tools\make_shortcuts.ps1
# Makes "Jemma's Library server" in her Startup folder, starts the server now, and removes the old shortcuts that opened
# the page from the folder (Desktop, Start menu, project folder). Delete the Startup shortcut to stop it starting.

$root    = Split-Path -Parent $PSScriptRoot
$pythonw = "$env:LOCALAPPDATA\Programs\Python\Python313\pythonw.exe"
if (-not (Test-Path $pythonw)) { throw "pythonw.exe not found at $pythonw" }

$shell = New-Object -ComObject WScript.Shell
$lnk = $shell.CreateShortcut((Join-Path ([Environment]::GetFolderPath('Startup')) "Jemma's Library server.lnk"))
$lnk.TargetPath       = $pythonw
$lnk.Arguments        = "`"$(Join-Path $root 'tools\serve.py')`""
$lnk.WorkingDirectory = $root
$lnk.IconLocation     = "$(Join-Path $root 'site\icon.ico'),0"
$lnk.Description      = "Serves Jemma's Library to its Chrome app (this computer only)"
$lnk.Save()
"Made $($lnk.FullName)"

Start-Process -FilePath $pythonw -ArgumentList "`"$(Join-Path $root 'tools\serve.py')`"" -WorkingDirectory $root -WindowStyle Hidden
"Server started: http://localhost:8020/"

foreach ($dir in @($root, [Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs'))) {
    $old = Join-Path $dir "Jemma's Library.lnk"
    if ((Test-Path $old) -and ($shell.CreateShortcut($old).Arguments -match 'file:///')) { Remove-Item $old; "Removed old $old" }
}

# Until the app is installed, a Desktop shortcut opens the site in Chrome, where the sidebar offers "Install as app".
# Once Chrome has made the app's own shortcut ("Jemma’s Library", curly apostrophe), this one goes.
$chrome  = @("$env:ProgramFiles\Google\Chrome\Application\chrome.exe", "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
             "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
$desk    = [Environment]::GetFolderPath('Desktop')
$temp    = Join-Path $desk "Jemma's Library.lnk"
$appLnk  = @((Join-Path $desk "Jemma$([char]0x2019)s Library.lnk"), (Join-Path ([Environment]::GetFolderPath('Programs')) "Chrome Apps\Jemma$([char]0x2019)s Library.lnk")) | Where-Object { Test-Path $_ }
if ($appLnk) { if (Test-Path $temp) { Remove-Item $temp; "App installed: removed $temp" } }
elseif ($chrome) {
    $lnk = $shell.CreateShortcut($temp)
    $lnk.TargetPath   = $chrome
    $lnk.Arguments    = "http://localhost:8020/"
    $lnk.IconLocation = "$(Join-Path $root 'site\icon.ico'),0"
    $lnk.Description  = "Jemma's Library (install it as an app from the sidebar)"
    $lnk.Save()
    "Made $temp (until the app is installed)"
}
