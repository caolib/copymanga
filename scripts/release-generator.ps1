# 发布信息生成模块 - 处理发布日志生成

function Generate-ReleaseInfo {
    param($LatestTag, $PreviousTag, $Commits)
    
    $output = "## Commit`n`n"
    
    # 生成 feat 部分
    if ($Commits.feat.Count -gt 0) {
        $output += "### feat`n"
        foreach ($commit in $Commits.feat) {
            $output += "- [$($commit.ShortHash)] $($commit.Message)`n"
        }
        $output += "`n"
    }
    
    # 生成 fix 部分
    if ($Commits.fix.Count -gt 0) {
        $output += "### fix`n"
        foreach ($commit in $Commits.fix) {
            $output += "- [$($commit.ShortHash)] $($commit.Message)`n"
        }
        $output += "`n"
    }
    
    # 如果没有任何 feat 或 fix 提交
    if ($Commits.feat.Count -eq 0 -and $Commits.fix.Count -eq 0) {
        $output += "本次发布没有新功能或修复内容。`n`n"
    }
    
    $output += "---`n"
    $output += "📋 [查看完整更新日志](https://github.com/caolib/copymanga/compare/$PreviousTag...$LatestTag)`n"
    
    try {
        # 脚本现在在项目根目录，直接使用 docs 路径
        $outputPath = "docs\\RELEASE.md"
        $output | Out-File -FilePath $outputPath -Encoding UTF8
        Write-Host "✅ 发布信息已保存到: $outputPath" -ForegroundColor Green
    }
    catch {
        Write-Error "无法写入文件: $_"
    }
}
