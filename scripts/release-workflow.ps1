# 发布工作流模块 - 处理发布流程的主要阶段

# 导入依赖模块
. "$PSScriptRoot\git-manager.ps1"
. "$PSScriptRoot\release-generator.ps1"

function Invoke-ReleaseInformationGeneration {
    param([string]$Version)
    
    Write-Host "Phase 2: Generate Release Information" -ForegroundColor Magenta
    Write-Host "创建临时标签 $Version 以收集提交记录..." -ForegroundColor Green
    git tag $Version # Create $Version tag temporarily on current HEAD
    if ($LASTEXITCODE -ne 0) {
        Write-Host "错误: 创建临时标签 $Version 失败" -ForegroundColor Red
        throw "创建临时标签 $Version 失败"
    }
    
    $allTags = Get-GitTags
    
    # 检查是否有标签
    if (-not $allTags -or $allTags.Count -eq 0) {
        Write-Warning "未找到任何有效的版本标签，将生成所有提交的发布说明"
        $currentVersionTagForCommits = $Version
        $previousActualTag = $null
    } else {
        $currentVersionTagForCommits = $allTags[0] # This is $Version
        $previousActualTag = if ($allTags.Count -gt 1) { $allTags[1] } else { $null }
    }

    Write-Host "🏷️  当前版本 (用于提交收集): $currentVersionTagForCommits" -ForegroundColor Cyan
    if ($previousActualTag) {
        Write-Host "🏷️  上一个实际版本: $previousActualTag" -ForegroundColor Cyan
    } else {
        Write-Host "🏷️  这是第一个可识别的标签" -ForegroundColor Cyan
    }

    $commits = Get-CommitsBetweenTags -LatestTag $currentVersionTagForCommits -PreviousTag $previousActualTag

    if ($commits.feat.Count -eq 0 -and $commits.fix.Count -eq 0) {
        Write-Warning "在 $previousActualTag 和 $currentVersionTagForCommits 之间未找到任何 feat 或 fix 类型的提交记录用于生成发布说明"
    } else {
        $totalCommits = $commits.feat.Count + $commits.fix.Count
        Write-Host "✅ 找到 $totalCommits 个有效提交用于发布说明 (feat: $($commits.feat.Count), fix: $($commits.fix.Count))" -ForegroundColor Green
        Generate-ReleaseInfo -LatestTag $currentVersionTagForCommits -PreviousTag $previousActualTag -Commits $commits
    }

    Write-Host "正在删除临时标签 $Version..." -ForegroundColor Green
    git tag -d $Version # Delete the temporary $Version tag
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "警告: 删除临时标签 $Version 失败。如果后续步骤失败，可能需要手动清理。"
    }
}
