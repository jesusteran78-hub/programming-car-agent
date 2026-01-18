
$Url = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
$ZipPath = "ffmpeg.zip"
$DestDir = "ffmpeg_temp"

Write-Host "⬇️ Downloading FFmpeg..."
Invoke-WebRequest -Uri $Url -OutFile $ZipPath

Write-Host "📦 Extracting..."
Expand-Archive -Path $ZipPath -DestinationPath $DestDir -Force

Write-Host "📂 Locating ffmpeg.exe..."
$ffmpegPath = Get-ChildItem -Path $DestDir -Recurse -Filter "ffmpeg.exe" | Select-Object -First 1

if ($ffmpegPath) {
    Write-Host "✅ Found ffmpeg.exe at $($ffmpegPath.FullName)"
    Move-Item -Path $ffmpegPath.FullName -Destination ".\ffmpeg.exe" -Force
    Write-Host "🚀 ffmpeg.exe moved to project root."
} else {
    Write-Error "❌ Could not find ffmpeg.exe in the downloaded archive."
}

Write-Host "🧹 Cleaning up..."
Remove-Item $ZipPath -Force
Remove-Item $DestDir -Recurse -Force

Write-Host "✨ FFmpeg installation complete!"
