
Add-Type -AssemblyName System.IO.Compression.FileSystem

$zipPath = "$PWD\ff.zip"
$destFolder = "$PWD\ffmpeg_final"

if (-not (Test-Path $zipPath)) {
    Write-Error "Zip file not found: $zipPath"
    exit 1
}

Write-Host "Extracting zip..."
if (Test-Path $destFolder) { Remove-Item $destFolder -Recurse -Force }

try {
    [System.IO.Compression.ZipFile]::ExtractToDirectory($zipPath, $destFolder)
    Write-Host "Extraction done."
    
    $ffmpegExe = Get-ChildItem -Path $destFolder -Recurse -Filter "ffmpeg.exe" | Select-Object -First 1
    if ($ffmpegExe) {
        Move-Item $ffmpegExe.FullName -Destination ".\ffmpeg.exe" -Force
        Write-Host "SUCCESS: ffmpeg.exe installed."
        
        Remove-Item $destFolder -Recurse -Force
        Remove-Item $zipPath -Force
    }
    else {
        Write-Error "ERROR: ffmpeg.exe not found in extracted files."
        Get-ChildItem -Path $destFolder -Recurse
    }
}
catch {
    Write-Error "ERROR: Extraction failed: $_"
}
