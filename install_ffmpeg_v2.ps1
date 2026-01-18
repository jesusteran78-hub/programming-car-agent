
$ZipPath = "ffmpeg.zip"
$DestDir = "ffmpeg_temp"

# Re-download only if zip doesn't exist (it should exist from previous run if expansion failed, but better safe)
if (-not (Test-Path $ZipPath)) {
    Write-Host "⬇️ Redownloading FFmpeg..."
    $Url = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
    Invoke-WebRequest -Uri $Url -OutFile $ZipPath
}

Write-Host "📦 Extracting..."
Expand-Archive -Path $ZipPath -DestinationPath $DestDir -Force

Write-Host "📂 Searching for ffmpeg.exe recursively..."
$ffmpegFile = Get-ChildItem -Path $DestDir -Recurse -Filter "ffmpeg.exe" | Select-Object -First 1

if ($ffmpegFile) {
    Write-Host "✅ Found ffmpeg.exe at $($ffmpegFile.FullName)"
    Move-Item -Path $ffmpegFile.FullName -Destination ".\ffmpeg.exe" -Force
    Write-Host "🚀 ffmpeg.exe moved to project root."
} else {
    Write-Error "❌ STILL could not find ffmpeg.exe. Listing directory contents for debug:"
    Get-ChildItem -Path $DestDir -Recurse | Select-Object FullName
}

Write-Host "🧹 Cleaning up..."
if (Test-Path ".\ffmpeg.exe") {
    Remove-Item $ZipPath -Force
    Remove-Item $DestDir -Recurse -Force
    Write-Host "✨ FFmpeg installation complete!"
} else {
    Write-Host "⚠️ Cleanup skipped for debug."
}
