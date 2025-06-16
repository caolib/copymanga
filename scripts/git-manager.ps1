# Git 操作管理模块 - 处理 Git 相关操作

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
          $commitList = @{
            feat = @()
            fix = @()
            others = @()
        }
        
        foreach ($commit in $commits) {
            if ([string]::IsNullOrWhiteSpace($commit)) { continue }
            $parts = $commit -split '\|', 5
            if ($parts.Length -eq 5) {
                $commitObj = @{
                    ShortHash = $parts[1]
                    Message = $parts[2]
                }
                  # 过滤合并提交
                if ($commitObj.Message -match "^Merge (branch|pull request)") {
                    continue
                }
                
                # 分类提交类型
                if ($commitObj.Message -match "^(✨\s+)?feat(\(.+\))?:\s*(.+)$") {
                    $commitList.feat += $commitObj
                }
                elseif ($commitObj.Message -match "^(🐛\s+)?fix(\(.+\))?:\s*(.+)$") {
                    $commitList.fix += $commitObj
                }
                else {
                    # 其他类型的提交都放入 others 分类
                    $commitList.others += $commitObj
                }
            }
        }
        
        return $commitList
    }
    catch {
        Write-Error "错误: $_"
        exit 1
    }
}

function Invoke-CommitChanges {
    param([string]$Version)
    
    Write-Host "Phase 3: Commit Changes" -ForegroundColor Magenta
    Write-Host "正在暂存所有更改 (版本文件, RELEASE.md)..." -ForegroundColor Green
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
}

function Invoke-PushCodeChanges {
    Write-Host "Phase 4: Push Code Changes" -ForegroundColor Magenta
    Write-Host "正在推送代码..." -ForegroundColor Green
    git push
    if ($LASTEXITCODE -ne 0) {
        Write-Host "错误: 推送代码失败" -ForegroundColor Red
        throw "推送代码失败"
    }
    Write-Host "代码推送成功！" -ForegroundColor Green
}

function Invoke-TaggingAndPushTag {
    param([string]$Version)
    
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
}

function Invoke-CleanupOnError {
    param([string]$Version)
    
    Write-Host "正在清理可能存在的标签 $Version 由于错误..." -ForegroundColor Yellow
    git tag -d $Version 2>$null # Attempt to clean up the specific $Version tag if it exists
}
