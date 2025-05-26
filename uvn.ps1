# update_version.ps1

$types = @(
    @{Name="大版本 (major)"; Value="major"},
    @{Name="功能版本 (minor)"; Value="minor"},
    @{Name="修复版本 (patch)"; Value="patch"}
)

Write-Host "请选择要更新的版本类型："
for ($i=0; $i -lt $types.Count; $i++) {
    Write-Host "$($i+1). $($types[$i].Name)"
}
$choice = Read-Host "输入数字 (1/2/3)"

switch ($choice) {
    "1" { $Type = "major" }
    "2" { $Type = "minor" }
    "3" { $Type = "patch" }
    default {
        Write-Host "无效选择，脚本退出。"
        exit 1
    }
}

$CargoFile = "src-tauri/Cargo.toml"
$TauriConf = "src-tauri/tauri.conf.json"
$PkgJson = "package.json"

function Get-Version {
    param($file, $pattern)
    $content = Get-Content $file
    foreach ($line in $content) {
        if ($line -match $pattern) {
            return $matches[1]
        }
    }
}

function Set-Version {
    param($file, $pattern, $newVersion)
    (Get-Content $file) -replace $pattern, "version = `"$newVersion`"" | Set-Content $file
}

$version = Get-Version $CargoFile 'version = "([\d\.]+)"'
if (-not $version) {
    Write-Error "未能在 $CargoFile 中找到版本号"
    exit 1
}
$parts = $version.Split('.')
$major = [int]$parts[0]
$minor = [int]$parts[1]
$patch = [int]$parts[2]

switch ($Type) {
    "major" { $major++; $minor=0; $patch=0 }
    "minor" { $minor++; $patch=0 }
    "patch" { $patch++ }
}
$newVersion = "$major.$minor.$patch"

Set-Version $CargoFile 'version = "[\d\.]+"' $newVersion

# 只修改 tauri.conf.json 的 version 字段
$tauriObj = Get-Content $TauriConf -Raw | ConvertFrom-Json
$tauriObj.version = $newVersion
$tauriObj | ConvertTo-Json -Depth 100 | Set-Content $TauriConf

# 同步修改 package.json 的 version 字段
if (Test-Path $PkgJson) {
    $pkgObj = Get-Content $PkgJson -Raw | ConvertFrom-Json
    $pkgObj.version = $newVersion
    $pkgObj | ConvertTo-Json -Depth 100 | Set-Content $PkgJson
    Write-Host "package.json 版本号已同步为 $newVersion"
} else {
    Write-Host "未找到 package.json，跳过同步。"
}

Write-Host "版本号已更新为 $newVersion"

git add $CargoFile $TauriConf $PkgJson package.json pnpm-lock.yaml
git commit -m "🐳 chore: bump version to $newVersion"
