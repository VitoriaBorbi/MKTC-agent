$html = Get-Content 'email-agent\output\2026-02-26-finclass-venda-vitalicio.html' -Raw
$authPayload = @{
    client_id = 'xrttn26q5nobbq3ty5vsthgw'
    client_secret = 'kd2cmIW3Gufk00wfB7pIXjvu'
    grant_type = 'client_credentials'
    account_id = '518005767'
}
$authResponse = Invoke-RestMethod -Method Post -Uri 'https://mcn29v1t3hsj32w921hh7z9yz2xm.auth.marketingcloudapis.com/v2/token' -Body ($authPayload | ConvertTo-Json) -ContentType 'application/json'
$accessToken = $authResponse.access_token

# 1. Tenta buscar a categoria "00 Gemini"
$catUrl = "https://mcn29v1t3hsj32w921hh7z9yz2xm.rest.marketingcloudapis.com/asset/v1/content/categories?`$filter=Name%20eq%20'00%20Gemini'"
$catResponse = Invoke-RestMethod -Method Get -Uri $catUrl -Headers @{ Authorization = "Bearer $accessToken" }
$catId = $catResponse.items[0].id

if (-not $catId) {
    # Se não existe, cria a pasta na raiz (parentId=0 ou similar)
    # Por segurança, usaremos o category_id padrão da Finclass do brand.json se não acharmos a 00 Gemini
    $catId = 275626 # ID da pasta Campanha no brand.json
}

# 2. Upload do Asset
$assetPayload = @{
    name = "2026-02-26-finclass-venda-vitalicio-gemini"
    assetType = @{ id = 208 }
    category = @{ id = $catId }
    views = @{
        html = @{ content = $html }
        subjectline = @{ content = "hackearam o financeiro da Finclass?" }
        preheader = @{ content = "Só isso explicaria 50% OFF no vitalício hoje." }
    }
}

$response = Invoke-RestMethod -Method Post -Uri "https://mcn29v1t3hsj32w921hh7z9yz2xm.rest.marketingcloudapis.com/asset/v1/content/assets" -Headers @{ Authorization = "Bearer $accessToken" } -Body ($assetPayload | ConvertTo-Json -Depth 10) -ContentType "application/json"
Write-Output "SUCCESS: Uploaded to Category $catId. Asset ID: $($response.id)"
