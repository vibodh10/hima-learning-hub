param(
  [int]$Port = 55434,
  [string]$PostgresBin = "C:\Program Files\PostgreSQL\16\bin",
  [string]$TestName = ""
)

$ErrorActionPreference = "Stop"
$psql = Join-Path $PostgresBin "psql.exe"
if (-not (Test-Path -LiteralPath $psql)) {
  throw "PostgreSQL psql was not found at $psql"
}

$env:PGPASSWORD = "postgres"
$tests = Get-ChildItem "$PSScriptRoot\..\supabase\tests\*.sql" |
  Where-Object { $_.Name -ne "local_bootstrap.sql" } |
  Sort-Object Name
if ($TestName) {
  $tests = @($tests | Where-Object { $_.Name -eq $TestName })
  if ($tests.Count -ne 1) { throw "Database journey not found: $TestName" }
}
$migrations = Get-ChildItem "$PSScriptRoot\..\supabase\migrations\*.sql" |
  Sort-Object Name
$bootstrap = Get-Item "$PSScriptRoot\..\supabase\tests\local_bootstrap.sql"
$seeds = @(
  Get-Item "$PSScriptRoot\..\supabase\seed.sql"
  Get-Item "$PSScriptRoot\..\supabase\seed_adaptive_python_pilot.sql"
  Get-Item "$PSScriptRoot\..\supabase\seed_complete_system.sql"
)

$index = 0
foreach ($test in $tests) {
  $index += 1
  $database = "hima_contract_{0:d2}" -f $index
  & $psql -h 127.0.0.1 -p $Port -U postgres -d postgres -v ON_ERROR_STOP=1 -q -o NUL -c "drop database if exists $database"
  if ($LASTEXITCODE -ne 0) { throw "Could not reset $database" }
  & $psql -h 127.0.0.1 -p $Port -U postgres -d postgres -v ON_ERROR_STOP=1 -q -o NUL -c "create database $database"
  if ($LASTEXITCODE -ne 0) { throw "Could not create $database" }

  $files = @($bootstrap) + @($migrations) + @($seeds) + @($test)
  foreach ($file in $files) {
    & $psql -h 127.0.0.1 -p $Port -U postgres -d $database -v ON_ERROR_STOP=1 -q -o NUL -f $file.FullName
    if ($LASTEXITCODE -ne 0) {
      throw "Database contract failed: $($test.Name) while applying $($file.Name)"
    }
  }
  Write-Output "PASS $($test.Name)"
}

Write-Output "PASS all $($tests.Count) independent database journeys"
