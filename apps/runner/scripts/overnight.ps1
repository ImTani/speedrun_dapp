# Unattended mainnet Conclave run (see src/overnight.ts). Keeps Windows awake only while it runs,
# appends to %TEMP%\fpst\overnight.log, and exits when the run ends; nothing is left running.
$ErrorActionPreference = "Continue"
$log = Join-Path $env:TEMP "fpst\overnight.log"
New-Item -ItemType Directory -Force (Split-Path $log) | Out-Null
$sig = '[DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint esFlags);'
$k = Add-Type -MemberDefinition $sig -Name Power -Namespace Overnight -PassThru
# ES_CONTINUOUS | ES_SYSTEM_REQUIRED: no system sleep while this process lives (the screen may still turn off).
[void]$k::SetThreadExecutionState(0x80000001)
Set-Location (Join-Path $PSScriptRoot "..")
"detached run started $(Get-Date -Format o) (pid $PID)" | Out-File $log -Append -Encoding utf8
& node node_modules/tsx/dist/cli.mjs src/overnight.ts --net avalanche --house 13 --k 3 --conc 4 --budget-usd 8 --avax-usd 9.84 --every-min 45 --max-hours 10 *>> $log
$code = $LASTEXITCODE
[void]$k::SetThreadExecutionState(0x80000000)
"exited $(Get-Date -Format o) code $code" | Out-File $log -Append -Encoding utf8
