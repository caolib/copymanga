
# 发布脚本 - 创建临时标签并获取提交信息
param(
    [Parameter()]
    [string]$Version
)

# 如果没有提供版本号参数，则提示用户输入
if (-not $Version) {
    $Version = Read-Host "请输入版本号"
}

# 验证版本号不为空
if (-not $Version) {
    Write-Host "错误: 版本号不能为空" -ForegroundColor Red
    exit 1
}

# 去掉版本号前缀v（如果有的话）
$VersionNumber = $Version -replace '^v', ''

# 更新 Cargo.toml 版本号
Write-Host "正在更新 Cargo.toml 版本号..." -ForegroundColor Green
try {
    $cargoPath = "src-tauri\Cargo.toml"
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

# 更新 tauri.conf.json 版本号
Write-Host "正在更新 tauri.conf.json 版本号..." -ForegroundColor Green
try {
    $tauriConfPath = "src-tauri\tauri.conf.json"
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

function Get-GitTags {
    try {
        $tags = git tag --sort=-version:refname
        if ($LASTEXITCODE -ne 0) {
            throw "无法获取 Git 标签"
        }
        return $tags | Where-Object { $_ -match '^v?\d+\.\d+\.\d+' }
    }
    catch {
        Write-Error "错误: $_"
        exit 1
    }
}

function Get-CommitsBetweenTags {
    param($LatestTag, $PreviousTag)
    
    try {
        if ($PreviousTag) {
            $commits = git log "$PreviousTag..$LatestTag" --pretty=format:'%H|%h|%s|%an|%ad' --date=short --reverse
        } else {
            $commits = git log $LatestTag --pretty=format:'%H|%h|%s|%an|%ad' --date=short --reverse
        }
        
        if ($LASTEXITCODE -ne 0) {
            throw "无法获取提交记录"
        }
        
        $commitList = @()
        foreach ($commit in $commits) {
            if ([string]::IsNullOrWhiteSpace($commit)) { continue }
            
            $parts = $commit -split '\|', 5
            if ($parts.Length -eq 5) {
                $commitObj = @{
                    ShortHash = $parts[1]
                    Message = $parts[2]
                }
                
                # 过滤合并提交和文档提交
                if ($commitObj.Message -match "^Merge (branch|pull request)" -or 
                    $commitObj.Message -match "^(docs?:|README|\.md)") {
                    continue
                }
                
                $commitList += $commitObj
            }
        }
        
        return $commitList
    }
    catch {
        Write-Error "错误: $_"
        exit 1
    }
}

function Generate-ReleaseInfo {
    param($LatestTag, $PreviousTag, $Commits)
    
    $output = "## Commit`n`n"
    foreach ($commit in $Commits) {
        $output += "- [$($commit.ShortHash)] $($commit.Message)`n"
    }
    
    $output += "`n---`n"
    $output += "📋 [查看完整更新日志](https://github.com/caolib/copymanga/compare/$PreviousTag...$LatestTag)`n"
      try {
        # 脚本现在在项目根目录，直接使用 docs 路径
        $outputPath = "docs\release.txt"
        $output | Out-File -FilePath $outputPath -Encoding UTF8
        Write-Host "✅ 发布信息已保存到: $outputPath" -ForegroundColor Green
    }
    catch {
        Write-Error "无法写入文件: $_"
    }
}

try {
    Write-Host "正在创建临时标签: $Version" -ForegroundColor Green
    git tag $Version
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "错误: 创建标签失败" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "正在获取提交信息..." -ForegroundColor Green
    
    # 获取标签信息
    $tags = Get-GitTags
    $latestTag = $tags[0]
    $previousTag = if ($tags.Count -gt 1) { $tags[1] } else { $null }
    
    Write-Host "🏷️  最新标签: $latestTag" -ForegroundColor Cyan
    if ($previousTag) {
        Write-Host "🏷️  上一个标签: $previousTag" -ForegroundColor Cyan
    } else {
        Write-Host "🏷️  这是第一个标签" -ForegroundColor Cyan
    }
    
    # 获取提交记录
    $commits = Get-CommitsBetweenTags -LatestTag $latestTag -PreviousTag $previousTag
    
    if ($commits.Count -eq 0) {
        Write-Warning "未找到任何提交记录"
    } else {
        Write-Host "✅ 找到 $($commits.Count) 个提交" -ForegroundColor Green
        Generate-ReleaseInfo -LatestTag $latestTag -PreviousTag $previousTag -Commits $commits
    }
    
    Write-Host "正在删除临时标签: $Version" -ForegroundColor Green
    git tag -d $Version
      if ($LASTEXITCODE -ne 0) {
        Write-Host "警告: 删除标签失败" -ForegroundColor Yellow
    } else {
        Write-Host "🎉 发布脚本执行完成!" -ForegroundColor Green
    }    # 重新创建标签并推送
    Write-Host "正在重新创建标签: $Version" -ForegroundColor Green
    git tag $Version
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "错误: 重新创建标签失败" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "正在暂存所有更改..." -ForegroundColor Green
    git add .
    
    Write-Host "正在提交更改..." -ForegroundColor Green
    git commit -m "🐳 chore: 发布新版本"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "警告: 提交失败，可能没有需要提交的更改" -ForegroundColor Yellow
    }
    
    Write-Host "正在推送代码..." -ForegroundColor Green
    git push
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "错误: 推送代码失败" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "正在推送标签..." -ForegroundColor Green
    git push origin $Version
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "错误: 推送标签失败" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "🎉 所有操作执行完成！版本 $Version 已发布" -ForegroundColor Green
}
catch {
    Write-Host "执行过程中发生错误: $($_.Exception.Message)" -ForegroundColor Red
    
    # 如果出错，尝试清理临时标签
    Write-Host "正在清理临时标签..." -ForegroundColor Yellow
    git tag -d $Version 2>$null
    
    exit 1
}