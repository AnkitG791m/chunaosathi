$brain = "C:\Users\User\.gemini\antigravity\brain\b4185762-2b44-4eb5-bcd3-e6975aaf1d33"

$files = @(
    "$brain\home_1777041546303.png",
    "$brain\chat_new_1777041649414.png",
    "$brain\booth_1777042057497.png",
    "$brain\fakcheck_final_1777042230013.png",
    "$brain\quiz_actual_final_1777042347557.png"
)

$found = @()
foreach ($f in $files) {
    if (Test-Path $f) {
        Write-Host "EXISTS: $f"
        $found += $f
    } else {
        Write-Host "MISSING: $f"
    }
}

Write-Host ""
Write-Host "Found files: $($found.Count)"
