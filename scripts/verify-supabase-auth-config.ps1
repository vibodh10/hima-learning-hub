[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern("^[a-z0-9]{20}$")]
  [string]$ProjectRef,
  [Parameter(Mandatory = $true)]
  [uri]$ExpectedOrigin,
  [string]$AccessToken = $env:SUPABASE_ACCESS_TOKEN,
  [ValidateRange(5, 120)]
  [int]$TimeoutSec = 20
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

if ($ExpectedOrigin.Scheme -ne "https") {
  throw "The expected production origin must use HTTPS."
}

if ($ExpectedOrigin.AbsolutePath -ne "/" -or $ExpectedOrigin.Query -or $ExpectedOrigin.Fragment) {
  throw "ExpectedOrigin must contain only the public origin, with no path, query or fragment."
}

if ([string]::IsNullOrWhiteSpace($AccessToken)) {
  throw "Set SUPABASE_ACCESS_TOKEN to a Supabase personal access token with permission to read this project's Auth configuration."
}

$origin = $ExpectedOrigin.GetLeftPart([System.UriPartial]::Authority).TrimEnd("/")
$endpoint = "https://api.supabase.com/v1/projects/$ProjectRef/config/auth"
$headers = @{ Authorization = "Bearer $AccessToken" }

try {
  $config = Invoke-RestMethod -Method Get -Uri $endpoint -Headers $headers -TimeoutSec $TimeoutSec
} catch {
  throw "The Supabase Auth configuration could not be read. Check the project reference, token permission and network connection."
}

$actualSiteUrl = ([string]$config.site_url).TrimEnd("/")
if ($actualSiteUrl -ne $origin) {
  throw "Supabase Auth Site URL mismatch. Expected '$origin' but found '$actualSiteUrl'. Password and invitation links are not release-ready."
}

$allowedRedirects = @(
  ([string]$config.uri_allow_list).Split(",", [System.StringSplitOptions]::RemoveEmptyEntries) |
    ForEach-Object { $_.Trim() }
)
$requiredCallback = "$origin/auth/callback?next=/update-password"
$callbackAllowed = $allowedRedirects -contains $requiredCallback -or
  $allowedRedirects -contains "$origin/auth/callback**" -or
  $allowedRedirects -contains "$origin/**"

if (-not $callbackAllowed) {
  throw "Supabase Auth redirect allow list does not permit '$requiredCallback'. Password and invitation links are not release-ready."
}

[pscustomobject]@{
  Check = "Supabase Auth Site URL"
  Result = "Passed"
  Detail = $actualSiteUrl
}, [pscustomobject]@{
  Check = "Password callback allow list"
  Result = "Passed"
  Detail = $requiredCallback
} | Format-Table -AutoSize

Write-Output "Supabase Auth configuration verification passed. No configuration, account, invitation or learner evidence was changed."
