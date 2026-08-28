[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [uri]$BaseUrl,
  [string]$ExpectedCommit,
  [ValidateRange(5, 120)]
  [int]$TimeoutSec = 20
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

if ($BaseUrl.Scheme -ne "https" -and $BaseUrl.Host -notin @("localhost", "127.0.0.1")) {
  throw "Hosted verification requires HTTPS. HTTP is accepted only for localhost."
}

$checks = [System.Collections.Generic.List[object]]::new()

function Resolve-PortalUri([string]$Path) {
  return [uri]::new($BaseUrl, $Path)
}

function Test-PublicPage([string]$Path, [string]$ExpectedText) {
  $response = Invoke-WebRequest -UseBasicParsing -Uri (Resolve-PortalUri $Path) -Method Get -TimeoutSec $TimeoutSec
  $passed = $response.StatusCode -eq 200 -and $response.Content.Contains($ExpectedText)
  $checks.Add([pscustomobject]@{ Check = $Path; Result = if ($passed) { "Passed" } else { "Failed" }; Detail = "Public page" })
  if (-not $passed) { throw "$Path did not return the expected public content." }
}

function Test-ProtectedPage([string]$Path, [string]$ForbiddenText) {
  $response = Invoke-WebRequest -UseBasicParsing -Uri (Resolve-PortalUri $Path) -Method Get -TimeoutSec $TimeoutSec
  $denied = $response.Content.Contains("Sign in") -or (
    $response.Content.Contains("NEXT_REDIRECT") -and $response.Content.Contains("/login")
  )
  $protectedContentAbsent = -not $response.Content.Contains($ForbiddenText)
  $passed = $response.StatusCode -eq 200 -and $denied -and $protectedContentAbsent
  $checks.Add([pscustomobject]@{ Check = $Path; Result = if ($passed) { "Passed" } else { "Failed" }; Detail = "Anonymous access denied" })
  if (-not $passed) { throw "$Path exposed protected content to an anonymous request." }
}

Test-PublicPage "/" "SCCB Digital Learning Hub"
Test-PublicPage "/login" "One account has one role"
Test-PublicPage "/forgot-password" "Reset your password"
Test-PublicPage "/privacy" "How SCCB Digital Learning Hub handles learner data"
Test-PublicPage "/register" "Student accounts are invitation only"
Test-PublicPage "/update-password" "Choose a new password"
Test-PublicPage "/course-entry-readiness" "Course Entry &amp; Readiness Assessment"

$release = Invoke-RestMethod -Uri (Resolve-PortalUri "/api/release") -Method Get -TimeoutSec $TimeoutSec
if ($release.status -ne "ok" -or $release.service -ne "sccb-digital-learning-hub") {
  throw "/api/release did not return the expected safe release identity. Deploy the current application before verification."
}
$releaseCommit = if ($release.commit) { [string]$release.commit } else { "unavailable" }
$checks.Add([pscustomobject]@{ Check = "/api/release"; Result = "Passed"; Detail = "Commit $releaseCommit | $($release.environment)" })

if ($ExpectedCommit) {
  $expected = $ExpectedCommit.Trim().ToLowerInvariant()
  $actual = [string]$release.commit
  if (-not $actual -or -not ($actual.StartsWith($expected) -or $expected.StartsWith($actual))) {
    throw "The hosted commit '$actual' does not match expected commit '$expected'."
  }
  $checks.Add([pscustomobject]@{ Check = "release commit"; Result = "Passed"; Detail = $actual })
}

Test-ProtectedPage "/dashboard" "Continue learning"
Test-ProtectedPage "/admin" "Administration dashboard"
Test-ProtectedPage "/help" "How the portal works"
Test-ProtectedPage "/curriculum" "My curriculum"
Test-ProtectedPage "/progress" "My progress"
Test-ProtectedPage "/portfolio" "My work"
Test-ProtectedPage "/rewards" "Rewards shop"
Test-ProtectedPage "/teacher/content" "Curriculum configuration"
Test-ProtectedPage "/teacher/sample-report" "Evidence report"
Test-ProtectedPage "/teacher/classes/00000000-0000-0000-0000-000000000000" "Student group"
Test-ProtectedPage "/teacher/learners/00000000-0000-0000-0000-000000000000" "Learner record"
Test-ProtectedPage "/teacher/learners/00000000-0000-0000-0000-000000000000/evidence?classId=00000000-0000-0000-0000-000000000000" "Learner evidence"
Test-ProtectedPage "/learn/network-security" "Protecting a college network"
Test-ProtectedPage "/learn/00000000-0000-0000-0000-000000000000" "Lesson"
Test-ProtectedPage "/learn/00000000-0000-0000-0000-000000000000/activities/00000000-0000-0000-0000-000000000000" "Activity"
Test-ProtectedPage "/curriculum/units/10" "Big Data"
Test-ProtectedPage "/curriculum/units/10/starting-point" "Starting point"
Test-ProtectedPage "/curriculum/units/10/papers" "Practice papers"
Test-ProtectedPage "/curriculum/units/10/project" "Project"
Test-ProtectedPage "/curriculum/units/10/topics/A1" "Pearson topic"
Test-ProtectedPage "/curriculum/units/10/topics/A1/practice" "Practice"

$checks | Format-Table -AutoSize
Write-Output "Hosted public verification passed. No account, invitation or learner evidence was created or changed."
