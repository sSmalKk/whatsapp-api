# Configurações da sessão
$sessionId = "ABCD"
$apiUrl = "http://localhost:3000/session/start/$sessionId"
$webhookUrl = "http://localhost:3000/webhook"
$headers = @{
    "accept" = "*/*"
    "x-api-key" = "teste"
    "Content-Type" = "application/json"
}

# Iniciar a sessão
try {
    Write-Host "Iniciando sessão para o ID: $sessionId..."
    $response = Invoke-WebRequest -Uri $apiUrl -Method GET -Headers $headers -ErrorAction Stop
    Write-Host "Sessão iniciada com sucesso!"
    Write-Host "Resposta do servidor:"
    $response.Content | ConvertFrom-Json | Format-List
} catch {
    Write-Host "Erro ao iniciar a sessão:"
    Write-Host $_.Exception.Message
}

# Configurações do corpo da requisição para o webhook
$body = @{
    "sessionId" = $sessionId
    "dataType" = "test"
    "data" = @{
        "key" = "value"
    }
} | ConvertTo-Json

# Enviar requisição ao webhook
try {
    Write-Host "Enviando requisição ao webhook para o ID: $sessionId..."
    $response = Invoke-WebRequest -Uri $webhookUrl -Method POST -Headers $headers -Body $body -ErrorAction Stop
    Write-Host "Requisição ao webhook enviada com sucesso!"
    Write-Host "Resposta do servidor:"
    $response.Content | ConvertFrom-Json | Format-List
} catch {
    Write-Host "Erro ao enviar a requisição ao webhook:"
    Write-Host $_.Exception.Message
}