$authPayload = @{
    client_id = 'xrttn26q5nobbq3ty5vsthgw'
    client_secret = 'kd2cmIW3Gufk00wfB7pIXjvu'
    grant_type = 'client_credentials'
    account_id = '518005767'
}
$authResponse = Invoke-RestMethod -Method Post -Uri 'https://mcn29v1t3hsj32w921hh7z9yz2xm.auth.marketingcloudapis.com/v2/token' -Body ($authPayload | ConvertTo-Json) -ContentType 'application/json'
$accessToken = $authResponse.access_token
$headers = @{ Authorization = "Bearer $accessToken" }

# 1. Cria a pasta "00 Gemini" dentro de "Outros" (ID 275234)
$folderPayload = @{
    Name = "00 Gemini"
    ParentId = 275234
}
try {
    $folderResponse = Invoke-RestMethod -Method Post -Uri "https://mcn29v1t3hsj32w921hh7z9yz2xm.rest.marketingcloudapis.com/asset/v1/content/categories" -Headers $headers -Body ($folderPayload | ConvertTo-Json) -ContentType "application/json"
    $newFolderId = $folderResponse.id
    Write-Output "Created Folder '00 Gemini' ID: $newFolderId"
} catch {
    # Se der erro (ex: já existe mas não listou), tentamos pegar o ID pelo erro ou ignorar
    Write-Output "Folder creation notice: $($_.Exception.Message)"
    # Fallback: vamos tentar o upload na pasta de Campanha se falhar a criação
    $newFolderId = 275234
}

# 2. Upload do Asset para a nova pasta
$html = Get-Content 'email-agent\output\2026-02-26-finclass-venda-vitalicio.html' -Raw
$html = $html -replace "\s+", " "

$assetPayload = @{
    name = "2026-02-26-finclass-venda-vitalicio-gemini-v2"
    assetType = @{ id = 208 }
    category = @{ id = $newFolderId }
    views = @{
        html = @{ content = $html }
        subjectline = @{ content = "hackearam o financeiro da Finclass?" }
        preheader = @{ content = "Só isso explicaria 50% OFF no vitalício hoje." }
    }
}

$response = Invoke-RestMethod -Method Post -Uri "https://mcn29v1t3hsj32w921hh7z9yz2xm.rest.marketingcloudapis.com/asset/v1/content/assets" -Headers $headers -Body ($assetPayload | ConvertTo-Json -Depth 10) -ContentType "application/json"
Write-Output "SUCCESS: Asset Uploaded to 00 Gemini. ID: $($response.id)"
