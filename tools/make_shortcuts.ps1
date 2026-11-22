# Shortcuts that open Jemma's Library in its own app window (no tabs or address bar), as for Jemma's Sim World.
# Since 22 Nov her Desktop and Start menu shortcuts open the Library through Jemma's Journals (its tools\open_site.pyw, port 8050),
# which also keeps dark mode the same in every app window. Running this again would point them back at http://localhost:8020
# (that works, the Library's own server serves /family/ too, but dark mode wouldn't carry across): don't, unless she asks.
# (The git-ignored shortcut in this folder is a copy of the Desktop one, 22 Nov.)
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
$icon       = Join-Path $root 'site\app-v2.ico'   # a new name for each new picture: Windows keeps old icons by file name
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

# Windows knows the window by the app id Chrome gives it: "Chrome." + its address as Chrome writes it ("localhost_/") +
# "." + the profile ("Chrome.Default", from ...\Jemmas Library\Chrome\Default). Read from the open window on 18 Oct.
# The shortcuts carry the same id, so Windows can match the window to them and use their sharp icon on the taskbar
# (Chrome's own window icon is its 32px tab icon stretched).
$appId = "Chrome.localhost_/.Chrome.Default"
Add-Type -TypeDefinition @'
using System; using System.Runtime.InteropServices;
public static class ShortcutAppId {
  [StructLayout(LayoutKind.Sequential, Pack = 4)] struct PROPERTYKEY { public Guid fmtid; public uint pid; }
  [StructLayout(LayoutKind.Explicit, Size = 24)] struct PROPVARIANT { [FieldOffset(0)] public ushort vt; [FieldOffset(8)] public IntPtr p; }
  [ComImport, Guid("886D8EEB-8CF2-4446-8D02-CDBA1DBDCF99"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IPropertyStore { [PreserveSig] int GetCount(out uint c); [PreserveSig] int GetAt(uint i, out PROPERTYKEY k);
    [PreserveSig] int GetValue(ref PROPERTYKEY k, out PROPVARIANT v); [PreserveSig] int SetValue(ref PROPERTYKEY k, ref PROPVARIANT v); [PreserveSig] int Commit(); }
  [ComImport, Guid("0000010b-0000-0000-C000-000000000046"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IPersistFile { void GetClassID(out Guid c); [PreserveSig] int IsDirty(); void Load([MarshalAs(UnmanagedType.LPWStr)] string f, uint mode);
    void Save([MarshalAs(UnmanagedType.LPWStr)] string f, bool remember); void SaveCompleted([MarshalAs(UnmanagedType.LPWStr)] string f); void GetCurFile(out IntPtr f); }
  public static void Set(string path, string id) {
    var link = Activator.CreateInstance(Type.GetTypeFromCLSID(new Guid("00021401-0000-0000-C000-000000000046")));
    ((IPersistFile)link).Load(path, 2);
    var key = new PROPERTYKEY { fmtid = new Guid("9F4C2855-9F79-4B39-A8D0-E1D42DE1D5F3"), pid = 5 };
    var v = new PROPVARIANT { vt = 31, p = Marshal.StringToCoTaskMemUni(id) };
    var st = (IPropertyStore)link;
    Marshal.ThrowExceptionForHR(st.SetValue(ref key, ref v)); Marshal.ThrowExceptionForHR(st.Commit());
    ((IPersistFile)link).Save(path, true);
    Marshal.FreeCoTaskMem(v.p);
  }
}
'@

foreach ($dir in @($root, [Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs'))) {
    $lnk = $shell.CreateShortcut((Join-Path $dir "Jemma's Library.lnk"))
    $lnk.TargetPath       = $chrome
    $lnk.Arguments        = "--user-data-dir=`"$profileDir`" --no-first-run --no-default-browser-check --app=`"http://localhost:8020/`""
    $lnk.IconLocation     = "$icon,0"
    $lnk.WorkingDirectory = Join-Path $root 'site'
    $lnk.Description      = "Jemma's Library"
    $lnk.Save()
    [ShortcutAppId]::Set($lnk.FullName, $appId)
    "Made $($lnk.FullName)"
}
