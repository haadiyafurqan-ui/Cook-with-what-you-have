# A tiny local web server for testing the site, which can also save dish pictures (see make-dish-images.md).
# Run from PowerShell:  powershell -ExecutionPolicy Bypass -File tools\serve.ps1   then open http://localhost:8765/
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$l = New-Object System.Net.HttpListener; $l.Prefixes.Add("http://localhost:8765/"); $l.Start()
$types = @{".html"="text/html; charset=utf-8";".js"="text/javascript; charset=utf-8";".css"="text/css";".png"="image/png";".webmanifest"="application/manifest+json";".json"="application/json";".svg"="image/svg+xml";".xml"="application/xml";".txt"="text/plain";".jpg"="image/jpeg"}
while ($l.IsListening) { $c = $l.GetContext(); $p = [Uri]::UnescapeDataString($c.Request.Url.AbsolutePath.TrimStart('/')); if ($p -eq "") { $p = "index.html" }
  if ($c.Request.HttpMethod -eq "POST" -and $p -match "^__save/([a-z0-9-]+\.jpg)$") { $n = $Matches[1]; $d = Join-Path $root "images\dishes"; New-Item -ItemType Directory -Force $d | Out-Null; $ms = New-Object IO.MemoryStream; $c.Request.InputStream.CopyTo($ms); [IO.File]::WriteAllBytes((Join-Path $d $n), $ms.ToArray()); $c.Response.StatusCode = 204; $c.Response.Close(); continue }
  $f = Join-Path $root $p; if (Test-Path $f -PathType Container) { $f = Join-Path $f "index.html" }; $c.Response.Headers.Add("Cache-Control","no-store")
  if ((Test-Path $f -PathType Leaf) -and ([IO.Path]::GetFullPath($f).StartsWith($root))) { $b = [IO.File]::ReadAllBytes($f); $e=[IO.Path]::GetExtension($f); if ($types[$e]) { $c.Response.ContentType = $types[$e] }; $c.Response.OutputStream.Write($b,0,$b.Length) } else { $c.Response.StatusCode = 404 }
  $c.Response.Close() }
