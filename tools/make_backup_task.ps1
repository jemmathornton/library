# The Windows task "Jemma's Library - weekly backup": every Sunday at 09:30 runs tools/backup.py (no window).
# If the laptop is off then, it runs the next time it's on. Run again to change it; delete it in Task Scheduler to stop.
# Run:  powershell -ExecutionPolicy Bypass -File tools\make_backup_task.ps1

$root    = Split-Path -Parent $PSScriptRoot
$pythonw = "$env:LOCALAPPDATA\Programs\Python\Python313\pythonw.exe"
$action  = New-ScheduledTaskAction -Execute $pythonw -Argument "`"$(Join-Path $root 'tools\backup.py')`"" -WorkingDirectory $root
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At 9:30am
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 30)
Register-ScheduledTask -TaskName "Jemma's Library - weekly backup" -Action $action -Trigger $trigger -Settings $settings `
    -Description "Saves Jemma's Library to git and pushes it to her GitHub copy." -Force | Out-Null
# 09:30 on the clock all year: without this the time is pinned to the time zone it was made in (made in summer, it ran at
# 08:30 in winter; found 21 Nov)
$t = Get-ScheduledTask -TaskName "Jemma's Library - weekly backup"
$t.Triggers[0].StartBoundary = $t.Triggers[0].StartBoundary.Substring(0, 19)
Set-ScheduledTask -InputObject $t | Out-Null
"Made the task: every Sunday 09:30"
