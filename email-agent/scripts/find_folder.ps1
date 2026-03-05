$authPayload = @{
    client_id = 'xrttn26q5nobbq3ty5vsthgw'
    client_secret = 'kd2cmIW3Gufk00wfB7pIXjvu'
    grant_type = 'client_credentials'
    account_id = '518005767'
}
$authResponse = Invoke-RestMethod -Method Post -Uri 'https://mcn29v1t3hsj32w921hh7z9yz2xm.auth.marketingcloudapis.com/v2/token' -Body ($authPayload | ConvertTo-Json) -ContentType 'application/json'
$accessToken = $authResponse.access_token

$headers = @{ Authorization = "Bearer $accessToken" }

# Busca todas as categorias para encontrar "00 Gemini"
$categories = Invoke-RestMethod -Method Get -Uri "https://mcn29v1t3hsj32w921hh7z9yz2xm.rest.marketingcloudapis.com/asset/v1/content/categories?`$pagesize=500" -Headers $headers
$targetFolder = $categories.items | Where-Object { $_.Name -eq "00 Gemini" }

if ($targetFolder) {
    Write-Output "FOUND: $($targetFolder.Name) ID: $($targetFolder.Id)"
} else {
    Write-Output "NOT FOUND. Listing similar names:"
    $categories.items | Where-Object { $_.Name -like "*Gemini*" } | Select-Object Name, Id
}
