Add-Type -AssemblyName System.IO.Compression.FileSystem
$zipPath = Resolve-Path "docs\Sarathi_Student_Portal_Project_Documentation.docx"
$extractPath = Join-Path $PSScriptRoot "docx_out"

if (Test-Path $extractPath) {
    Remove-Item -Recurse -Force $extractPath
}

[System.IO.Compression.ZipFile]::ExtractToDirectory($zipPath, $extractPath)
$xmlPath = Join-Path $extractPath "word\document.xml"
$content = Get-Content $xmlPath -Raw -Encoding UTF8

# Regex extract all w:t tags
$regex = [regex]'<w:t[^>]*>(.*?)</w:t>'
$matches = $regex.Matches($content)
$lines = @()
$currentLine = ""

# Better: parse by paragraphs <w:p>
$pRegex = [regex]'<w:p[^>]*>(.*?)</w:p>'
$pMatches = $pRegex.Matches($content)

Write-Output "=== TOTAL PARAGRAPHS FOUND: $($pMatches.Count) ==="
foreach ($p in $pMatches) {
    $tMatches = $regex.Matches($p.Value)
    $pText = ($tMatches | ForEach-Object { $_.Groups[1].Value }) -join ''
    if ($pText.Trim().Length -gt 0) {
        Write-Output $pText
    }
}
