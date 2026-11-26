@echo off
title Delveria - Lokalny Serwer Gry
cd /d "%~dp0"
echo Uruchamianie lokalnego serwera Delverii na http://127.0.0.1:8080 ...
echo Nie zamykaj tego okna podczas gry.
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$root = (Get-Location).Path; " ^
  "$listener = New-Object System.Net.HttpListener; " ^
  "$listener.Prefixes.Add('http://127.0.0.1:8080/'); " ^
  "$listener.Start(); " ^
  "Start-Process 'http://127.0.0.1:8080/'; " ^
  "$mime = @{ '.html'='text/html; charset=utf-8'; '.js'='application/javascript; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.png'='image/png'; '.jpg'='image/jpeg'; '.svg'='image/svg+xml'; '.json'='application/json'; '.ico'='image/x-icon' }; " ^
  "while ($listener.IsListening) { " ^
  "  $ctx = $listener.GetContext(); " ^
  "  $rel = $ctx.Request.Url.AbsolutePath.TrimStart('/'); " ^
  "  if ([string]::IsNullOrEmpty($rel)) { $rel = 'index.html' }; " ^
  "  $file = Join-Path $root ($rel -replace '/', '\'); " ^
  "  if (Test-Path $file -PathType Leaf) { " ^
  "    $ext = [System.IO.Path]::GetExtension($file).ToLower(); " ^
  "    $ctx.Response.ContentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }; " ^
  "    $bytes = [System.IO.File]::ReadAllBytes($file); " ^
  "    $ctx.Response.ContentLength64 = $bytes.Length; " ^
  "    $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length); " ^
  "  } else { $ctx.Response.StatusCode = 404 }; " ^
  "  $ctx.Response.Close(); " ^
  "}"
