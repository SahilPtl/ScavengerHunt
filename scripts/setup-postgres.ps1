# Creates only a dedicated local cluster; never alters an installed service.
$ErrorActionPreference='Stop'
$taskRoot=Split-Path $PSScriptRoot -Parent
Set-Location $taskRoot
$pgBin='C:\Program Files\PostgreSQL\17\bin'
if (!(Test-Path "$pgBin\initdb.exe")) { throw 'Install PostgreSQL 17, or configure server/.env for your existing PostgreSQL service.' }
if (Test-Path '.local\postgres\PG_VERSION') { Write-Host 'Project cluster already exists. Run npm run demo.'; exit 0 }
if (Test-Path 'server\.env') { throw 'server/.env already exists. Preserve it; use that database or move the file aside explicitly before creating a project cluster.' }
New-Item -ItemType Directory -Force .local | Out-Null
$taskBytes=New-Object byte[] 24
$taskRng=[System.Security.Cryptography.RandomNumberGenerator]::Create()
$taskRng.GetBytes($taskBytes)
$taskPassword=([BitConverter]::ToString($taskBytes)).Replace('-','').ToLower()
[IO.File]::WriteAllText((Join-Path $taskRoot '.local\pg-password'),$taskPassword)
& "$pgBin\initdb.exe" -D .local\postgres -U hunt_app --pwfile=.local\pg-password --auth=scram-sha-256 --encoding=UTF8 --locale=C
if ($LASTEXITCODE -ne 0) { throw 'initdb failed' }
& "$pgBin\pg_ctl.exe" -D .local\postgres -l .local\postgres.log -o '-p 55432 -h 127.0.0.1' start
if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL startup failed' }
$env:PGPASSWORD=$taskPassword
try { & "$pgBin\createdb.exe" -h 127.0.0.1 -p 55432 -U hunt_app scavenger_hunt; if ($LASTEXITCODE -ne 0) { throw 'Database creation failed' } } finally { Remove-Item Env:PGPASSWORD }
[IO.File]::WriteAllText((Join-Path $taskRoot 'server\.env'),"DATABASE_URL=postgresql://hunt_app:${taskPassword}@127.0.0.1:55432/scavenger_hunt`nOPENAI_API_KEY=`n")
Write-Host 'Dedicated PostgreSQL database ready on 127.0.0.1:55432. Password stays local.'
