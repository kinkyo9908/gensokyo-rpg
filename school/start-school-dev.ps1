$ErrorActionPreference = 'Stop'
$gameRoot = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$gamePort = 8896
$listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $gamePort)
$mime = @{ '.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.mjs'='text/javascript; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.png'='image/png'; '.jpg'='image/jpeg'; '.webp'='image/webp'; '.gif'='image/gif'; '.svg'='image/svg+xml'; '.mp3'='audio/mpeg'; '.ogg'='audio/ogg'; '.wav'='audio/wav'; '.json'='application/json; charset=utf-8'; '.woff'='font/woff' }
try {
    $listener.Start(100)
    $gameUrl = "http://localhost:$gamePort/"
    Write-Host "Gensokyo RPG School Development: $gameUrl"
    Write-Host 'Keep this window open while playing. Press Ctrl+C to stop.'
    Start-Process $gameUrl
    while ($true) {
        $client = $listener.AcceptTcpClient()
        $file = $null
        try {
            $client.ReceiveTimeout = 1500
            $client.SendTimeout = 30000
            $stream = $client.GetStream()
            $header = [Collections.Generic.List[byte]]::new()
            while ($header.Count -lt 16384) {
                $b = $stream.ReadByte()
                if ($b -lt 0) { break }
                $header.Add([byte]$b)
                $n = $header.Count
                if ($n -ge 4 -and $header[$n-4] -eq 13 -and $header[$n-3] -eq 10 -and $header[$n-2] -eq 13 -and $header[$n-1] -eq 10) { break }
            }
            $request = [Text.Encoding]::ASCII.GetString($header.ToArray())
            $first = ($request -split "`r`n")[0] -split ' '
            if ($first.Count -lt 2) { continue }
            $method = $first[0]
            $path = [Uri]::UnescapeDataString(($first[1] -split '\?')[0])
            if ($path -eq '/') { $path = '/index.html' }
            $relative = $path.TrimStart('/').Replace('/', [IO.Path]::DirectorySeparatorChar)
            $full = [IO.Path]::GetFullPath([IO.Path]::Combine($gameRoot, $relative))
            $allowed = $full.StartsWith($gameRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)
            $status = '200 OK'; $extra = ''; $start = [long]0; $count = [long]0
            if ($method -notin @('GET','HEAD')) { $status = '405 Method Not Allowed' }
            elseif (-not $allowed -or -not [IO.File]::Exists($full)) { $status = '404 Not Found' }
            else {
                $file = [IO.File]::OpenRead($full)
                $count = $file.Length
                $range = [regex]::Match($request, '(?im)^Range: bytes=(\d*)-(\d*)\s*$')
                if ($range.Success -and $file.Length -gt 0) {
                    if ($range.Groups[1].Value -eq '') {
                        $suffix = [long]$range.Groups[2].Value
                        $start = [Math]::Max([long]0, $file.Length - $suffix)
                        $end = $file.Length - 1
                    } else {
                        $start = [long]$range.Groups[1].Value
                        $end = $file.Length - 1
                        if ($range.Groups[2].Value -ne '') { $end = [Math]::Min($end, [long]$range.Groups[2].Value) }
                    }
                    if ($start -ge $file.Length -or $end -lt $start) {
                        $status = '416 Range Not Satisfiable'; $count = 0
                        $extra = "Content-Range: bytes */$($file.Length)`r`n"
                    } else {
                        $status = '206 Partial Content'; $count = $end - $start + 1
                        $extra = "Content-Range: bytes $start-$end/$($file.Length)`r`n"
                        [void]$file.Seek($start, [IO.SeekOrigin]::Begin)
                    }
                }
            }
            $type = 'application/octet-stream'
            $ext = [IO.Path]::GetExtension($full).ToLowerInvariant()
            if ($mime.ContainsKey($ext)) { $type = $mime[$ext] }
            $response = "HTTP/1.1 $status`r`nContent-Type: $type`r`nContent-Length: $count`r`nAccept-Ranges: bytes`r`nCache-Control: no-cache`r`nConnection: close`r`n$extra`r`n"
            $bytes = [Text.Encoding]::ASCII.GetBytes($response)
            $stream.Write($bytes, 0, $bytes.Length)
            if ($file -and $method -eq 'GET' -and $count -gt 0) {
                $buffer = [byte[]]::new(65536)
                $remaining = $count
                while ($remaining -gt 0) {
                    $read = $file.Read($buffer, 0, [int][Math]::Min($remaining, $buffer.Length))
                    if ($read -eq 0) { break }
                    $stream.Write($buffer, 0, $read)
                    $remaining -= $read
                }
            }
        } catch {
            # Browser cancellation / speculative idle connections are normal.
        } finally {
            if ($file) { $file.Dispose() }
            $client.Dispose()
        }
    }
} catch {
    Write-Host 'Cannot start the local game server.'
    Write-Host $_.Exception.Message
    Write-Host 'If port 8765 is already in use, close the previous game console first.'
    Write-Host 'Do not change the port: saved games belong to this exact browser address.'
} finally {
    $listener.Stop()
}
