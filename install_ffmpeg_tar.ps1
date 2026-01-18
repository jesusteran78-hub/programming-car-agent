
if (Test-Path "ffmpeg.zip") {
    Rename-Item "ffmpeg.zip" "ff.zip" -Force
}

if (-not (Test-Path "ff.zip")) {
    Write-Error "ff.zip not found!"
    exit 1
}

Write-Host "📦 Extracting with tar..."
tar -xf ff.zip

Write-Host "📂 Searching for extracted folder..."
$extractedDir = Get-ChildItem -Directory | Where-Object { $_.Name -like "ffmpeg-*-essentials_build" } | Select-Object -First 1

if ($extractedDir) {
    Write-Host "✅ Found directory: $($extractedDir.FullName)"
    $binPath = Join-Path $extractedDir.FullName "bin\ffmpeg.exe"
    
    if (Test-Path $binPath) {
        Copy-Item $binPath -Destination ".\ffmpeg.exe" -Force
        Write-Host "🚀 ffmpeg.exe installed successfully!"
        
        # Cleanup
        Remove-Item "ff.zip" -Force
        Remove-Item $extractedDir.FullName -Recurse -Force
    }
    else {
        Write-Error "❌ ffmpeg.exe not found in bin folder."
    }
}
else {
    Write-Error "❌ Extracted directory not found. Listing all dirs:"
    Get-ChildItem -Directory
}
