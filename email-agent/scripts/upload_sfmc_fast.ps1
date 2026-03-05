$html = Get-Content 'email-agent\output\2026-02-26-finclass-venda-vitalicio.html' -Raw
# Otimização básica para reduzir tamanho
$html = $html -replace "\s+", " "

$authPayload = @{
    client_id = 'xrttn26q5nobbq3ty5vsthgw'
    client_secret = 'kd2cmIW3Gufk00wfB7pIXjvu'
    grant_type = 'client_credentials'
    account_id = '518005767'
}
$authResponse = Invoke-RestMethod -Method Post -Uri 'https://mcn29v1t3hsj32w921hh7z9yz2xm.auth.marketingcloudapis.com/v2/token' -Body ($authPayload | ConvertTo-Json) -ContentType 'application/json'
$accessToken = $authResponse.access_token

$assetPayload = @{
    name = "2026-02-26-finclass-venda-vitalicio-gemini"
    assetType = @{ id = 208 }
    # Usando a pasta padrão de campanhas da Finclass identificada no brand.json
    category = @{ id = 275626 } 
    views = @{
        html = @{ content = $html }
        subjectline = @{ content = "hackearam o financeiro da Finclass?" }
        preheader = @{ content = "Só isso explicaria 50% OFF no vitalício hoje." }
    }
}

$response = Invoke-RestMethod -Method Post -Uri "https://mcn29v1t3hsj32w921hh7z9yz2xm.rest.marketingcloudapis.com/asset/v1/content/assets" -Headers @{ Authorization = "Bearer $accessToken" } -Body ($assetPayload | ConvertTo-Json -Depth 10) -ContentType "application/json"
Write-Output "SUCCESS: Asset ID: $($response.id)"
