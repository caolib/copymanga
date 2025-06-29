# 发布脚本 - 自动化版本发布流程
param(
    [Parameter()]
    [string]$Version
)

#region 参数验证
# 交互式菜单选择函数
function Show-InteractiveMenu {
    param(
        [string[]]$Options,
        [string]$Title = "请选择选项"
    )
    
    $selectedIndex = 0
    $lastSelectedIndex = -1
    
    # 初始显示
    Clear-Host
    Write-Host $Title -ForegroundColor Cyan
    Write-Host ""
    
    # 记录菜单开始的行位置
    $menuStartRow = [Console]::CursorTop
    
    for ($i = 0; $i -lt $Options.Length; $i++) {
        if ($i -eq $selectedIndex) {
            Write-Host "→ $($Options[$i])" -ForegroundColor Green
        } else {
            Write-Host "  $($Options[$i])" -ForegroundColor White
        }
    }
    
    Write-Host ""
    Write-Host "使用 ↑↓ 选择，回车确认，ESC 退出" -ForegroundColor Yellow
    
    while ($true) {
        $key = $host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        
        switch ($key.VirtualKeyCode) {
            38 { # 上箭头
                $selectedIndex = if ($selectedIndex -eq 0) { $Options.Length - 1 } else { $selectedIndex - 1 }
            }
            40 { # 下箭头
                $selectedIndex = if ($selectedIndex -eq $Options.Length - 1) { 0 } else { $selectedIndex + 1 }
            }
            13 { # 回车
                return $selectedIndex
            }
            27 { # ESC
                return -1
            }
            default {
                continue # 忽略其他按键，不重绘
            }
        }
        
        # 只在选择发生变化时重绘菜单选项
        if ($selectedIndex -ne $lastSelectedIndex) {
            # 移动光标到菜单开始位置
            [Console]::SetCursorPosition(0, $menuStartRow)
            
            # 重绘菜单选项
            for ($i = 0; $i -lt $Options.Length; $i++) {
                if ($i -eq $selectedIndex) {
                    Write-Host "→ $($Options[$i])" -ForegroundColor Green
                } else {
                    Write-Host "  $($Options[$i])" -ForegroundColor White
                }
            }
            
            $lastSelectedIndex = $selectedIndex
        }
    }
}

# 显示最新的tag并生成预设选项
try {
    $latestTag = git describe --tags --abbrev=0 2>$null
    if ($LASTEXITCODE -eq 0 -and $latestTag) {
        Write-Host "当前最新的标签: $latestTag" -ForegroundColor Green
        
        # 解析版本号 (支持 v1.2.3 格式)
        if ($latestTag -match '^v?(\d+)\.(\d+)\.(\d+)') {
            $major = [int]$matches[1]
            $minor = [int]$matches[2]
            $patch = [int]$matches[3]
            
            # 生成预设版本选项
            $patchVersion = "v$major.$minor.$($patch + 1)"
            $minorVersion = "v$major.$($minor + 1).0"
            $majorVersion = "v$($major + 1).0.0"
            
            $options = @(
                "$patchVersion (补丁版本 - bug修复)",
                "$minorVersion (次要版本 - 新功能)",
                "$majorVersion (主要版本 - 重大更新)",
                "手动输入版本号"
            )
            
            $choice = Show-InteractiveMenu -Options $options -Title "选择版本类型 (当前: $latestTag)"
            
            if ($choice -eq -1) {
                Write-Host "已取消操作" -ForegroundColor Yellow
                exit 0
            }
            
            switch ($choice) {
                0 { $Version = $patchVersion }
                1 { $Version = $minorVersion }
                2 { $Version = $majorVersion }
                3 { 
                    Clear-Host
                    $Version = Read-Host "请手动输入版本号"
                }
            }
        } else {
            Write-Host "无法解析当前标签格式，请手动输入版本号" -ForegroundColor Yellow
            $Version = Read-Host "请输入版本号"
        }
    } else {
        Write-Host "未找到任何标签，这可能是第一个版本" -ForegroundColor Yellow
        Write-Host "建议使用 v1.0.0 作为第一个版本" -ForegroundColor Cyan
        $Version = Read-Host "请输入版本号 (建议: v1.0.0)"
    }
} catch {
    Write-Host "获取标签信息失败，请手动输入版本号" -ForegroundColor Yellow
    $Version = Read-Host "请输入版本号"
}

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

#region 模块导入
# 导入所有发布相关的模块
. "$PSScriptRoot\scripts\version-manager.ps1"
. "$PSScriptRoot\scripts\git-manager.ps1"
. "$PSScriptRoot\scripts\release-generator.ps1"
. "$PSScriptRoot\scripts\release-workflow.ps1"
#endregion

#region 主执行流程
# 发布流程菜单选择
$workflowOptions = @(
    "执行完整发布流程",
    "1. 版本号准备与更新",
    "2. 生成发布信息", 
    "3. 提交更改",
    "4. 推送代码",
    "5. 打标签并推送"
)

$workflowChoice = Show-InteractiveMenu -Options $workflowOptions -Title "发布流程菜单 - 版本: $Version"

if ($workflowChoice -eq -1) {
    Write-Host "已取消发布流程。" -ForegroundColor Yellow
    exit 0
}

try {
    switch ($workflowChoice) {
        0 {
            # 执行完整流程
            Invoke-PreparationAndVersionBumping -VersionNumber $VersionNumber
            Invoke-ReleaseInformationGeneration -Version $Version
            Write-Host "\n请在编辑器中审查并修改 docs/RELEASE.md 发布信息，确认无误后按回车继续..." -ForegroundColor Yellow
            Read-Host | Out-Null
            Invoke-CommitChanges -Version $Version
            Invoke-PushCodeChanges
            Invoke-TaggingAndPushTag -Version $Version
            Write-Host "🎉 所有操作执行完成！版本 $Version 已发布" -ForegroundColor Green
        }
        1 { Invoke-PreparationAndVersionBumping -VersionNumber $VersionNumber }
        2 { Invoke-ReleaseInformationGeneration -Version $Version }
        3 { Invoke-CommitChanges -Version $Version }
        4 { Invoke-PushCodeChanges }
        5 { Invoke-TaggingAndPushTag -Version $Version }
    }
}
catch {
    Write-Host "执行过程中发生错误: $($_.Exception.Message)" -ForegroundColor Red
    Invoke-CleanupOnError -Version $Version
    exit 1
}
#endregion
