$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Parse("127.0.0.1"), 5173)
$listener.Start()

function Send-Response($stream, [int]$status, [string]$statusText, [string]$contentType, [byte[]]$body) {
  $header = "HTTP/1.1 $status $statusText`r`nContent-Type: $contentType`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
  $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
  $stream.Write($headerBytes, 0, $headerBytes.Length)
  if ($body.Length -gt 0) {
    $stream.Write($body, 0, $body.Length)
  }
}

while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
    $stream = $client.GetStream()
    $buffer = New-Object byte[] 4096
    $read = $stream.Read($buffer, 0, $buffer.Length)
    if ($read -le 0) {
      $client.Close()
      continue
    }

    $request = [System.Text.Encoding]::ASCII.GetString($buffer, 0, $read)
    $requestLine = ($request -split "`r`n")[0]
    $parts = $requestLine -split " "
    $path = if ($parts.Length -ge 2) { [System.Uri]::UnescapeDataString($parts[1].TrimStart("/")) } else { "" }
    if ([string]::IsNullOrWhiteSpace($path)) { $path = "index.html" }

    $full = [System.IO.Path]::GetFullPath((Join-Path $root $path))
    if (-not $full.StartsWith($root)) {
      Send-Response $stream 403 "Forbidden" "text/plain; charset=utf-8" ([System.Text.Encoding]::UTF8.GetBytes("Forbidden"))
      continue
    }

    if (-not [System.IO.File]::Exists($full)) {
      Send-Response $stream 404 "Not Found" "text/plain; charset=utf-8" ([System.Text.Encoding]::UTF8.GetBytes("Not Found"))
      continue
    }

    $types = @{
      ".html" = "text/html; charset=utf-8"
      ".css" = "text/css; charset=utf-8"
      ".js" = "text/javascript; charset=utf-8"
    }
    $ext = [System.IO.Path]::GetExtension($full).ToLowerInvariant()
    $contentType = if ($types.ContainsKey($ext)) { $types[$ext] } else { "application/octet-stream" }
    Send-Response $stream 200 "OK" $contentType ([System.IO.File]::ReadAllBytes($full))
  } finally {
    $client.Close()
  }
}
