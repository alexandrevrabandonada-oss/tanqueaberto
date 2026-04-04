$ErrorActionPreference = "Stop"

$steps = @(
  @{ Name = "Environment"; Args = @("run", "audit:env") },
  @{ Name = "Schema drift"; Args = @("run", "check:drift") },
  @{ Name = "Lint"; Args = @("run", "lint") },
  @{ Name = "Typecheck"; Args = @("run", "typecheck") },
  @{ Name = "Build"; Args = @("run", "build") }
)

foreach ($step in $steps) {
  Write-Host ""
  Write-Host "== $($step.Name) =="
  & npm.cmd @($step.Args)
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
}
