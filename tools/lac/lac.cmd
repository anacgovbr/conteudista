@echo off
rem lac no Windows: tools\lac\lac.cmd c apostila.md  (ou ponha tools\lac no PATH e use "lac")
node "%~dp0lac.mjs" %*
