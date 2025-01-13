# Configurações da sessão
$sessionId = "ABCD"
$apiUrl = "http://localhost:3000/session/start/$sessionId"
$headers = @{
    "accept" = "*/*"
    "x-api-key" = "teste"
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
