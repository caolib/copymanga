# 版本管理模块 - 处理版本号更新相关操作

function Update-CargoVersion {
    param([string]$VersionNumber)
    
    Write-Host "正在更新 Cargo.toml 版本号..." -ForegroundColor Green
    try {
        $cargoPath = "src-tauri\\Cargo.toml"
        $cargoLines = Get-Content $cargoPath
        
        # 只替换 [package] 部分中的 version 行
        $inPackageSection = $false
        $versionReplaced = $false
        for ($i = 0; $i -lt $cargoLines.Length; $i++) {
            if ($cargoLines[$i] -match '^\[package\]') {
                $inPackageSection = $true
            }
            elseif ($cargoLines[$i] -match '^\[') {
                $inPackageSection = $false
            }
            elseif ($inPackageSection -and $cargoLines[$i] -match '^version\s*=' -and -not $versionReplaced) {
                $cargoLines[$i] = "version = `"$VersionNumber`""
                $versionReplaced = $true
                break
            }
        }
        
        $cargoLines | Set-Content $cargoPath -Encoding UTF8
        Write-Host "✅ Cargo.toml 版本号已更新为: $VersionNumber" -ForegroundColor Green
    }
    catch {
        Write-Error "更新 Cargo.toml 失败: $_"
        exit 1
    }
}

function Update-TauriConfig {
    param([string]$VersionNumber)
    
    Write-Host "正在更新 tauri.conf.json 版本号..." -ForegroundColor Green
    try {
        $tauriConfPath = "src-tauri\\tauri.conf.json"
        $tauriContent = Get-Content $tauriConfPath -Raw
        # 只替换文件开头的 version 字段，避免影响其他地方的版本号
        $tauriContent = $tauriContent -replace '("productName": ".*",\r?\n\s*)"version": "[\d\.]+"', "`$1`"version`": `"$VersionNumber`""
        $tauriContent | Set-Content $tauriConfPath -Encoding UTF8
        Write-Host "✅ tauri.conf.json 版本号已更新为: $VersionNumber" -ForegroundColor Green
    }
    catch {
        Write-Error "更新 tauri.conf.json 失败: $_"
        exit 1
    }
}

function Invoke-PreparationAndVersionBumping {
    param([string]$VersionNumber)
    
    # 只保留主版本号部分（如 1.2.3-beta -> 1.2.3）
    $VersionNumber = $VersionNumber -replace '^([0-9]+\.[0-9]+\.[0-9]+).*', '$1'
    Write-Host "Phase 1: Preparation and Version Bumping" -ForegroundColor Magenta
    Update-CargoVersion -VersionNumber $VersionNumber
    Update-TauriConfig -VersionNumber $VersionNumber
}
