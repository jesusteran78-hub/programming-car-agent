
Add-Type -AssemblyName System.IO.Compression.FileSystem

$zipPath = "$PWD\ff.zip"
$destFolder = "$PWD\ffmpeg_final"

if (-not (Test-Path $zipPath)) {
    Write-Error "Zip file not found: $zipPath"
    exit 1
}

Write-Host "📦 Extracting $zipPath to $destFolder..."
if (Test-Path $destFolder) { Remove-Item $destFolder -Recurse -Force }

try {
    [System.IO.Compression.ZipFile]::ExtractToDirectory($zipPath, $destFolder)
    Write-Host "✅ Extraction successful."
    
    $ffmpegExe = Get-ChildItem -Path $destFolder -Recurse -Filter "ffmpeg.exe" | Select-Object -First 1
    if ($ffmpegExe) {
        Move-Item $ffmpegExe.FullName -Destination ".\ffmpeg.exe" -Force
        Write-Host "🚀 ffmpeg.exe installed at project root."
        
        # Cleanup
        Remove-Item $destFolder -Recurse -Force
        Remove-Item $zipPath -Force
    }
    else {
        Write-Error "❌ ffmpeg.exe not found in extracted files."
        Get-ChildItem -Path $destFolder -Recurse
    }
}
catch {
    Write-Error "❌ Extraction failed: $_"
}
