# Git 提交记录生成脚本
# 获取两个标签之间的所有提交并生成格式化列表

param(
    [string]$OutputFormat = "markdown",         # 输出格式: markdown, text, json
    [string]$OutputFile = "./docs/release.txt", # 输出文件路径（默认保存到docs/release.txt）
    [switch]$ExcludeMerge = $true,              # 排除合并提交
    [switch]$ShowHelp                           # 显示帮助
)

function Show-Help {
    Write-Host @"
Git 提交记录生成器

用法:
    .\get-commits.ps1 [-OutputFormat <format>] [-OutputFile <file>] [-ExcludeMerge] [-ShowHelp]

参数:
    -OutputFormat   输出格式 (markdown, text, json) [默认: markdown]
    -OutputFile     输出文件路径 (可选，不指定则输出到控制台)
    -ExcludeMerge   排除合并提交 [默认: true]
    -ShowHelp       显示此帮助信息

示例:
    .\get-commits.ps1
    .\get-commits.ps1 -OutputFormat text
    .\get-commits.ps1 -OutputFile commits.md
    .\get-commits.ps1 -OutputFormat json -OutputFile commits.json
"@
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
                    FullHash = $parts[0]
                    ShortHash = $parts[1]
                    Message = $parts[2]
                    Author = $parts[3]
                    Date = $parts[4]
                }
                
                # 过滤合并提交
                if ($ExcludeMerge -and $commitObj.Message -match "^Merge (branch|pull request)") {
                    continue
                }
                
                # 过滤文档相关提交
                if ($commitObj.Message -match "^(docs?:|README|\.md)") {
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

function Format-Commits {
    param($Commits, $LatestTag, $PreviousTag, $Format)
    
    $output = ""
    $totalCommits = $Commits.Count
    
    switch ($Format.ToLower()) {        "markdown" {
            $output += "## Commit`n`n"
            foreach ($commit in $Commits) {
                $output += "- [$($commit.ShortHash)] $($commit.Message)`n"
            }
            
            $output += "`n---`n"
            $output += "📋 [查看完整更新日志](https://github.com/caolib/copymanga/compare/$PreviousTag...$LatestTag)`n"
        }
        
        "text" {
            $output += "提交记录`n"
            $output += "=========`n`n"
            if ($PreviousTag) {
                $output += "标签范围: $PreviousTag..$LatestTag`n"
            } else {
                $output += "标签范围: 首次发布..$LatestTag`n"
            }
            $output += "提交数量: $totalCommits`n`n"
            
            foreach ($commit in $Commits) {
                $output += "[$($commit.ShortHash)] $($commit.Message) - $($commit.Author) ($($commit.Date))`n"
            }
        }
        
        "json" {
            $data = @{
                latestTag = $LatestTag
                previousTag = $PreviousTag
                totalCommits = $totalCommits
                commits = $Commits
                generatedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            }
            $output = $data | ConvertTo-Json -Depth 3 -Compress:$false
        }
    }
    
    return $output
}

# 主程序
if ($ShowHelp) {
    Show-Help
    exit 0
}

Write-Host "🔍 获取 Git 提交记录..." -ForegroundColor Green

# 检查是否在 Git 仓库中
if (-not (Test-Path ".git") -and -not (git rev-parse --git-dir 2>$null)) {
    Write-Error "当前目录不是 Git 仓库"
    exit 1
}

# 获取标签
Write-Host "📌 获取标签列表..." -ForegroundColor Yellow
$tags = Get-GitTags

if ($tags.Count -eq 0) {
    Write-Error "未找到任何标签"
    exit 1
}

$latestTag = $tags[0]
$previousTag = if ($tags.Count -gt 1) { $tags[1] } else { $null }

Write-Host "🏷️  最新标签: $latestTag" -ForegroundColor Cyan
if ($previousTag) {
    Write-Host "🏷️  上一个标签: $previousTag" -ForegroundColor Cyan
} else {
    Write-Host "🏷️  这是第一个标签" -ForegroundColor Cyan
}

# 获取提交记录
Write-Host "📋 获取提交记录..." -ForegroundColor Yellow
$commits = Get-CommitsBetweenTags -LatestTag $latestTag -PreviousTag $previousTag

if ($commits.Count -eq 0) {
    Write-Warning "未找到任何提交记录"
    exit 0
}

Write-Host "✅ 找到 $($commits.Count) 个提交" -ForegroundColor Green

# 格式化输出
$formattedOutput = Format-Commits -Commits $commits -LatestTag $latestTag -PreviousTag $previousTag -Format $OutputFormat

# 输出结果
if ($OutputFile) {
    try {
        $formattedOutput | Out-File -FilePath $OutputFile -Encoding UTF8
        Write-Host "✅ 结果已保存到: $OutputFile" -ForegroundColor Green
    }
    catch {
        Write-Error "无法写入文件 '$OutputFile': $_"
        exit 1
    }
} else {
    Write-Host "`n" + "="*50 -ForegroundColor Magenta
    Write-Host $formattedOutput
    Write-Host "="*50 -ForegroundColor Magenta
}

Write-Host "`n🎉 完成!" -ForegroundColor Green
