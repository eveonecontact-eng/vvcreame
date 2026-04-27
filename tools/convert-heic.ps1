param(
  [Parameter(Mandatory = $true)]
  [string]$InputPath,

  [Parameter(Mandatory = $true)]
  [string]$OutputPath
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Runtime.WindowsRuntime | Out-Null

# WinRT type activation
[void][Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
[void][Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType = WindowsRuntime]
[void][Windows.Graphics.Imaging.BitmapEncoder, Windows.Graphics.Imaging, ContentType = WindowsRuntime]

function Await-WinRtOperation {
  param(
    [Parameter(Mandatory = $true)]
    $Operation,

    [Parameter(Mandatory = $true)]
    [Type]$ResultType
  )

  $asTaskMethod = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and
    $_.IsGenericMethodDefinition -and
    $_.GetParameters().Count -eq 1 -and
    $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
  } | Select-Object -First 1

  if (-not $asTaskMethod) {
    throw "Could not find AsTask<T>(IAsyncOperation<T>)"
  }

  $generic = $asTaskMethod.MakeGenericMethod($ResultType)
  $task = $generic.Invoke($null, @($Operation))
  return $task.Result
}

function Wait-WinRtAction {
  param(
    [Parameter(Mandatory = $true)]
    $Action
  )

  $asTaskAction = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and
    -not $_.IsGenericMethodDefinition -and
    $_.GetParameters().Count -eq 1 -and
    $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncAction'
  } | Select-Object -First 1

  if (-not $asTaskAction) {
    throw "Could not find AsTask(IAsyncAction)"
  }

  $task = $asTaskAction.Invoke($null, @($Action))
  $task.Wait()
}

$inFull = (Resolve-Path -LiteralPath $InputPath).Path

# Ensure output directory exists
$outDir = Split-Path -Parent $OutputPath
if ($outDir -and -not (Test-Path -LiteralPath $outDir)) {
  New-Item -ItemType Directory -Path $outDir | Out-Null
}

# If output doesn't exist yet, create it
if (-not (Test-Path -LiteralPath $OutputPath)) {
  New-Item -ItemType File -Path $OutputPath | Out-Null
}

$outFull = (Resolve-Path -LiteralPath $OutputPath).Path

$inFileOp = [Windows.Storage.StorageFile]::GetFileFromPathAsync($inFull)
$inFile = Await-WinRtOperation $inFileOp ([Windows.Storage.StorageFile])
$inStreamOp = $inFile.OpenAsync([Windows.Storage.FileAccessMode]::Read)
$inStream = Await-WinRtOperation $inStreamOp ([Windows.Storage.Streams.IRandomAccessStream])

try {
  $decoderOp = [Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($inStream)
  $decoder = Await-WinRtOperation $decoderOp ([Windows.Graphics.Imaging.BitmapDecoder])

  $pixelDataOp = $decoder.GetPixelDataAsync()
  $pixelData = Await-WinRtOperation $pixelDataOp ([Windows.Graphics.Imaging.PixelDataProvider])
  $pixels = $pixelData.DetachPixelData()

  $outFileOp = [Windows.Storage.StorageFile]::GetFileFromPathAsync($outFull)
  $outFile = Await-WinRtOperation $outFileOp ([Windows.Storage.StorageFile])
  $outStreamOp = $outFile.OpenAsync([Windows.Storage.FileAccessMode]::ReadWrite)
  $outStream = Await-WinRtOperation $outStreamOp ([Windows.Storage.Streams.IRandomAccessStream])

  try {
    $encoderOp = [Windows.Graphics.Imaging.BitmapEncoder]::CreateAsync(
      [Windows.Graphics.Imaging.BitmapEncoder]::JpegEncoderId,
      $outStream
    )
    $encoder = Await-WinRtOperation $encoderOp ([Windows.Graphics.Imaging.BitmapEncoder])

    $encoder.SetPixelData(
      $decoder.BitmapPixelFormat,
      $decoder.BitmapAlphaMode,
      $decoder.PixelWidth,
      $decoder.PixelHeight,
      $decoder.DpiX,
      $decoder.DpiY,
      $pixels
    )

    $flushOp = $encoder.FlushAsync()
    Wait-WinRtAction $flushOp
  }
  finally {
    $outStream.Dispose()
  }
}
finally {
  $inStream.Dispose()
}

Write-Output "Wrote $outFull"

