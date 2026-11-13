' Resonix Music Silent Desktop Launcher
Set objShell = CreateObject("WScript.Shell")
strProjectDir = "C:\Users\KISHOR SRE\OneDrive\Music lol"
objShell.CurrentDirectory = strProjectDir

strCommand = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & strProjectDir & "\launch_app.ps1"""
objShell.Run strCommand, 0, False
