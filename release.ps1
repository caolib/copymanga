# 发布脚本 - 自动化版本发布流程
param(
    [Parameter()]
    [string]$Version
)

#region 参数验证
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
#endregion

#region 辅助函数
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
            if ($cargoLines[$i] -match '^\\[package\\]') {
                $inPackageSection = $true
            }
            elseif ($cargoLines[$i] -match '^\\[') {
                $inPackageSection = $false
            }
            elseif ($inPackageSection -and $cargoLines[$i] -match '^version\\s*=' -and -not $versionReplaced) {
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
        $tauriContent = $tauriContent -replace '("productName": ".*",\\r?\\n\\s*)"version": "[\\d\\.]+"', "`$1`"version`": `"$VersionNumber`""
        $tauriContent | Set-Content $tauriConfPath -Encoding UTF8
        Write-Host "✅ tauri.conf.json 版本号已更新为: $VersionNumber" -ForegroundColor Green
    }
    catch {
        Write-Error "更新 tauri.conf.json 失败: $_"
        exit 1
    }
}

function Get-GitTags {
    try {
        $tags = git tag --sort=-version:refname
        if ($LASTEXITCODE -ne 0) {
            throw "无法获取 Git 标签"
        }
        return $tags | Where-Object { $_ -match '^v?\\d+\\.\\d+\\.\\d+' }
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
            
            $parts = $commit -split '\\|', 5
            if ($parts.Length -eq 5) {
                $commitObj = @{
                    ShortHash = $parts[1]
                    Message = $parts[2]
                }
                
                # 过滤合并提交和文档提交
                if ($commitObj.Message -match "^Merge (branch|pull request)" -or 
                    $commitObj.Message -match "^(docs?:|README|\\.md)") {
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
        $outputPath = "docs\\release.txt"
        $output | Out-File -FilePath $outputPath -Encoding UTF8
        Write-Host "✅ 发布信息已保存到: $outputPath" -ForegroundColor Green
    }
    catch {
        Write-Error "无法写入文件: $_"
    }
}

try {
    # == Phase 1: Preparation and Version Bumping ==
    Write-Host "Phase 1: Preparation and Version Bumping" -ForegroundColor Magenta
    Update-CargoVersion -VersionNumber $VersionNumber
    Update-TauriConfig -VersionNumber $VersionNumber

    # == Phase 2: Generate Release Information ==
    Write-Host "Phase 2: Generate Release Information" -ForegroundColor Magenta
    Write-Host "创建临时标签 $Version 以收集提交记录..." -ForegroundColor Green
    git tag $Version # Create $Version tag temporarily on current HEAD
    if ($LASTEXITCODE -ne 0) {
        Write-Host "错误: 创建临时标签 $Version 失败" -ForegroundColor Red
        throw "创建临时标签 $Version 失败"
    }

    $allTags = Get-GitTags
    $currentVersionTagForCommits = $allTags[0] # This is $Version
    $previousActualTag = if ($allTags.Count -gt 1) { $allTags[1] } else { $null }

    Write-Host "🏷️  当前版本 (用于提交收集): $currentVersionTagForCommits" -ForegroundColor Cyan
    if ($previousActualTag) {
        Write-Host "🏷️  上一个实际版本: $previousActualTag" -ForegroundColor Cyan
    } else {
        Write-Host "🏷️  这是第一个可识别的标签" -ForegroundColor Cyan
    }

    $commits = Get-CommitsBetweenTags -LatestTag $currentVersionTagForCommits -PreviousTag $previousActualTag

    if ($commits.Count -eq 0) {
        Write-Warning "在 $previousActualTag 和 $currentVersionTagForCommits 之间未找到任何提交记录用于生成发布说明"
    } else {
        Write-Host "✅ 找到 $($commits.Count) 个提交用于发布说明" -ForegroundColor Green
        Generate-ReleaseInfo -LatestTag $currentVersionTagForCommits -PreviousTag $previousActualTag -Commits $commits
    }

    Write-Host "正在删除临时标签 $Version..." -ForegroundColor Green
    git tag -d $Version # Delete the temporary $Version tag
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "警告: 删除临时标签 $Version 失败。如果后续步骤失败，可能需要手动清理。"
    }

    # == Phase 3: Commit Changes (Version Bumps & Release Notes) ==
    Write-Host "Phase 3: Commit Changes" -ForegroundColor Magenta
    Write-Host "正在暂存所有更改 (版本文件, release.txt)..." -ForegroundColor Green
    git add .
    
    $gitStatus = git status --porcelain
    if (-not [string]::IsNullOrWhiteSpace($gitStatus)) {
        Write-Host "正在提交版本更新和发布说明..." -ForegroundColor Green
        git commit -m "🐳 chore: 发布新版本 $Version"
        if ($LASTEXITCODE -ne 0) {
            Write-Host "错误: 提交版本更新失败" -ForegroundColor Red
            throw "提交版本更新失败"
        }
    } else {
        Write-Host "没有需要提交的更改。" -ForegroundColor Yellow
    }

    # == Phase 4: Push Code Changes ==
    Write-Host "Phase 4: Push Code Changes" -ForegroundColor Magenta
    Write-Host "正在推送代码..." -ForegroundColor Green
    git push
    if ($LASTEXITCODE -ne 0) {
        Write-Host "错误: 推送代码失败" -ForegroundColor Red
        throw "推送代码失败"
    }
    Write-Host "代码推送成功！" -ForegroundColor Green

    # == Phase 5: Tagging and Pushing Tag ==
    Write-Host "Phase 5: Tagging and Pushing Tag" -ForegroundColor Magenta
    # Ensure no local tag with $Version exists from a failed previous run or the temp tag process
    Write-Host "清理可能存在的旧本地标签 $Version (以防万一)..." -ForegroundColor Yellow
    git tag -d $Version 2>$null # Suppress error if tag doesn't exist

    Write-Host "正在创建最终标签 $Version..." -ForegroundColor Green
    git tag $Version # Create the final $Version tag on the new commit
    if ($LASTEXITCODE -ne 0) {
        Write-Host "错误: 创建最终标签 $Version 失败" -ForegroundColor Red
        throw "创建最终标签 $Version 失败"
    }

    Write-Host "正在推送标签 $Version..." -ForegroundColor Green
    git push origin $Version
    if ($LASTEXITCODE -ne 0) {
        Write-Host "错误: 推送标签 $Version 失败" -ForegroundColor Red
        throw "推送标签 $Version 失败"
    }

    Write-Host "🎉 所有操作执行完成！版本 $Version 已发布" -ForegroundColor Green
}
catch {
    Write-Host "执行过程中发生错误: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "正在清理可能存在的标签 $Version 由于错误..." -ForegroundColor Yellow
    git tag -d $Version 2>$null # Attempt to clean up the specific $Version tag if it exists
    exit 1
}