$ErrorActionPreference = "Stop"

$steps = @(
  @{ Name = "Environment"; Args = @("run", "audit:env") },
  @{ Name = "Schema drift"; Args = @("run", "check:drift") },
  @{ Name = "Lint"; Args = @("run", "lint") },
  @{ Name = "Typecheck"; Args = @("run", "typecheck") },
  @{ Name = "Build"; Args = @("run", "build") }
)

function Invoke-BuildStep {
  $nextPath = Join-Path (Get-Location) ".next"
  if (Test-Path $nextPath) {
    Remove-Item -LiteralPath $nextPath -Recurse -Force
  }

  & npm.cmd run build
}

foreach ($step in $steps) {
  Write-Host ""
  Write-Host "== $($step.Name) =="
  if ($step.Name -eq "Build") {
    Invoke-BuildStep
  } else {
    & npm.cmd @($step.Args)
  }
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
}
