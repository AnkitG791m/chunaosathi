$body = @{
    contents = @(@{ parts = @(@{ text = "NOTA kya hai? 2 lines mein Hindi mein batao." }) })
} | ConvertTo-Json -Depth 10

$apiKey = "AIzaSyBBYnZzLOOrDugx_5KEPeIrDUeldwBOBsQ"
$models = @("gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.0-flash-lite")

foreach ($model in $models) {
    $url = "https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=$apiKey"
    try {
        $response = Invoke-RestMethod -Uri $url -Method POST -Body $body -ContentType "application/json" -TimeoutSec 10
        Write-Host "SUCCESS with model: $model"
        Write-Host "---"
        Write-Host $response.candidates[0].content.parts[0].text
        Write-Host "---"
        Write-Host "WORKING_MODEL=$model"
        exit 0
    } catch {
        $status = $_.Exception.Response.StatusCode.value__
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errMsg = ($reader.ReadToEnd() | ConvertFrom-Json).error.message
        Write-Host "FAIL: $model => HTTP $status | $($errMsg.Substring(0, [Math]::Min(100, $errMsg.Length)))"
    }
}
Write-Host "ALL_FAILED"
