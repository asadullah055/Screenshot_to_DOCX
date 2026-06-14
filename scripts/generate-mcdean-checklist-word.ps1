$ErrorActionPreference = "Stop"

$root = Resolve-Path "."
$outPath = Join-Path $root "Checkout - SWR BKR 2B - Primary Block.docx"
$assets = Join-Path $root "assets"

$wdFormatXMLDocument = 16
$wdExportFormatPDF = 17
$wdStatisticPages = 2
$wdCollapseEnd = 0
$wdAlignLeft = 0
$wdAlignCenter = 1
$wdAlignRight = 2
$wdCellAlignVerticalCenter = 1
$wdHeaderFooterPrimary = 1
$wdHeaderFooterFirstPage = 2
$wdContentControlDropdownList = 4
$wdRowHeightAtLeast = 1

function Inches($value) { return [double]$value * 72.0 }
function Set-RangeFont($range, $size = 9, $bold = $false, $color = 0) {
  $range.Font.Name = "Arial"
  $range.Font.Size = $size
  $range.Font.Bold = if ($bold) { -1 } else { 0 }
  $range.Font.Color = $color
}

function Set-CellText($cell, $text, $size = 9, $bold = $false, $align = 0) {
  $r = $cell.Range
  $r.Text = $text
  $r.End = $r.End - 1
  Set-RangeFont $r $size $bold
  $r.ParagraphFormat.Alignment = $align
  $cell.VerticalAlignment = $wdCellAlignVerticalCenter
}

function Format-GridTable($table, $widthsInches) {
  $table.AllowAutoFit = $false
  $table.Borders.Enable = 1
  $table.Range.Font.Name = "Arial"
  $table.Range.Font.Size = 9
  $table.Range.ParagraphFormat.SpaceBefore = 0
  $table.Range.ParagraphFormat.SpaceAfter = 0
  $table.TopPadding = 4
  $table.BottomPadding = 4
  $table.LeftPadding = 6
  $table.RightPadding = 6
  for ($i = 0; $i -lt $widthsInches.Count; $i++) {
    for ($r = 1; $r -le $table.Rows.Count; $r++) {
      $table.Cell($r, $i + 1).Width = Inches $widthsInches[$i]
    }
  }
}

function Format-NoBorderTable($table, $widthsInches) {
  $table.AllowAutoFit = $false
  $table.Borders.Enable = 0
  $table.Range.Font.Name = "Arial"
  $table.Range.Font.Size = 9
  $table.Range.ParagraphFormat.SpaceBefore = 0
  $table.Range.ParagraphFormat.SpaceAfter = 0
  $table.TopPadding = 0
  $table.BottomPadding = 0
  $table.LeftPadding = 0
  $table.RightPadding = 0
  for ($i = 0; $i -lt $widthsInches.Count; $i++) {
    for ($r = 1; $r -le $table.Rows.Count; $r++) {
      $table.Cell($r, $i + 1).Width = Inches $widthsInches[$i]
    }
  }
}

function Add-Paragraph($selection, $text, $size = 9, $bold = $false, $align = 0, $after = 4) {
  $selection.Font.Name = "Arial"
  $selection.Font.Size = $size
  $selection.Font.Bold = if ($bold) { -1 } else { 0 }
  $selection.ParagraphFormat.Alignment = $align
  $selection.ParagraphFormat.SpaceBefore = 0
  $selection.ParagraphFormat.SpaceAfter = $after
  $selection.TypeText($text)
  $selection.TypeParagraph()
}

function Move-AfterTable($selection, $table) {
  $range = $table.Range
  $range.Collapse($wdCollapseEnd)
  $selection.SetRange($range.End, $range.End)
  $selection.TypeParagraph()
}

function Add-Header($section, $firstPage) {
  $header = $section.Headers.Item($(if ($firstPage) { $wdHeaderFooterFirstPage } else { $wdHeaderFooterPrimary }))
  $range = $header.Range
  $range.Text = ""

  $top = $range.Tables.Add($range, 2, 3)
  Format-NoBorderTable $top @(1.40, 2.85, 2.25)
  if ($firstPage) {
    $logoRange = $top.Cell(1, 1).Range
    $logoRange.End = $logoRange.End - 1
    $logoRange.InlineShapes.AddPicture((Join-Path $assets "mcdean-logo-header.png"), $false, $true) | Out-Null
  }
  Set-CellText $top.Cell(1, 2) "M.C. Dean Proprietary" 8 $true $wdAlignCenter
  Set-CellText $top.Cell(1, 3) "UNCONTROLLED COPY`rSee online master for current revision" 7 $true $wdAlignRight
  $top.Cell(2, 1).Merge($top.Cell(2, 2))
  Set-CellText $top.Cell(2, 1) "Subject`rCheckout - SWR BKR 2B - Primary Block" 9 $false $wdAlignLeft
  $top.Cell(2, 1).Range.Words.Item(1).Font.Bold = -1
  Set-CellText $top.Cell(2, 2) "Document ID: FRM`rRevision: 0" 9 $false $wdAlignRight
}

function Add-Footer($section, $firstPage) {
  $footer = $section.Footers.Item($(if ($firstPage) { $wdHeaderFooterFirstPage } else { $wdHeaderFooterPrimary }))
  $range = $footer.Range
  $range.Text = ""

  if ($firstPage) {
    $range.InlineShapes.AddPicture((Join-Path $assets "mcdean-brand-bar-placeholder.png"), $false, $true) | Out-Null
    $range = $footer.Range
    $range.Collapse($wdCollapseEnd)
    $range.InsertParagraphAfter()
    $range.Collapse($wdCollapseEnd)
  }

  $table = $footer.Range.Tables.Add($range, 1, 3)
  Format-NoBorderTable $table @(2.55, 1.40, 2.55)
  Set-CellText $table.Cell(1, 1) "Classification Level: Confidential & Proprietary" 8 $false $wdAlignLeft
  $pageRange = $table.Cell(1, 2).Range
  $pageRange.Text = ""
  $pageRange.End = $pageRange.End - 1
  $pageRange.ParagraphFormat.Alignment = $wdAlignCenter
  Set-RangeFont $pageRange 8 $false
  $pageRange.Fields.Add($pageRange, -1, "PAGE") | Out-Null
  Set-CellText $table.Cell(1, 3) ([string]([char]0x00A9) + " 2025. M.C. Dean, Inc. All rights reserved.") 8 $false $wdAlignRight
}

function Add-EquipmentTable($selection, $doc) {
  $table = $doc.Tables.Add($selection.Range, 2, 3)
  Format-GridTable $table @(2.23, 2.29, 1.97)
  @("Equipment Tag Name", "Equipment Manufacturer", "Equipment Model") | ForEach-Object -Begin { $i = 1 } -Process {
    Set-CellText $table.Cell(1, $i) $_ 11 $true $wdAlignCenter
    $i++
  }
  @("RIC2_DC6_SWR_B1_BKR_2B", "ABB", "EMAX 4.2") | ForEach-Object -Begin { $i = 1 } -Process {
    Set-CellText $table.Cell(2, $i) $_ 9 $false $wdAlignLeft
    $i++
  }
  Move-AfterTable $selection $table
}

function Add-ControlTable($selection, $doc) {
  $widths = @(2.06, 1.0, 1.0, 0.92, 1.52)
  $analog = @(
    "Data/Amps_A", "Data/Amps_Avg", "Data/Amps_B", "Data/Amps_C", "Data/Amps_G", "Data/Amps_N",
    "Data/kVA", "Data/kW", "Data/kWh", "Data/PF", "Data/Pos", "Data/Status", "Data/Volts_AB",
    "Data/Volts_AN", "Data/Volts_BC", "Data/Volts_BN", "Data/Volts_CA", "Data/Volts_CN",
    "Data/Volts_LL_Avg", "Data/Volts_LN_Avg"
  )
  $digital = @("Data/CB_Position", "Data/Comm_Fail", "Data/Status_Changed")
  $alarm = @("Data/Breaker_Status_Alarm", "Data/CB_NC", "Data/CB_NO", "Data/Percent_Load", "Data/Tripped")
  $memory = @("Data/Amp_Rating", "Data/CB_Normal_State", "Data/Feeds", "Data/Nominal_Volts")

  $sections = @(
    @{ Title = "Section A - Analog Control Points"; Headers = @("Data Point", "Field Value", "SCADA Value", "Values Match", "Incident Report No. / Notes"); Points = $analog },
    @{ Title = "Section B - Digital Control Points"; Headers = @("Data Point", "Status Simulated / Command Sent", "Status Verified in SCADA", "Pass/ Fail", "Incident Report No. / Notes"); Points = $digital },
    @{ Title = "Section C - Alarm Points"; Headers = @("Data Point", "Status Simulated", "Status Verified in SCADA", "Pass/ Fail", "Incident Report No. / Notes"); Points = $alarm },
    @{ Title = "Section D - Memory Points"; Headers = @("Data Point", "Status Simulated/ Command Sent or Field Value", "Status Verified in SCADA or SCADA Value", "Pass/ Fail or Values Match", "Incident Report No./Notes"); Points = $memory }
  )

  $rowCount = 40
  $table = $doc.Tables.Add($selection.Range, $rowCount, 5)
  Format-GridTable $table $widths
  $row = 1
  foreach ($sectionInfo in $sections) {
    $table.Cell($row, 1).Merge($table.Cell($row, 5))
    Set-CellText $table.Cell($row, 1) $sectionInfo.Title 11 $true $wdAlignLeft
    $row++
    for ($c = 1; $c -le 5; $c++) {
      Set-CellText $table.Cell($row, $c) $sectionInfo.Headers[$c - 1] 11 $true $wdAlignCenter
    }
    $row++
    foreach ($point in $sectionInfo.Points) {
      Set-CellText $table.Cell($row, 1) $point 9 $false $wdAlignLeft
      for ($c = 2; $c -le 5; $c++) { Set-CellText $table.Cell($row, $c) "" 9 $false $wdAlignLeft }
      $row++
    }
  }
  Move-AfterTable $selection $table
}

function Add-Evidence($selection, $doc) {
  Add-Paragraph $selection "SCADA Evidence Screenshots" 11 $true $wdAlignLeft 3
  foreach ($imageName in @("scada-overview-placeholder.png", "scada-alerts-placeholder.png")) {
    $shape = $selection.Range.InlineShapes.AddPicture((Join-Path $assets $imageName), $false, $true)
    $selection.SetRange($shape.Range.End, $shape.Range.End)
    $selection.TypeParagraph()
  }
}

function Add-PunchlistTable($selection, $doc) {
  $widths = @(0.51, 2.14, 1.97, 0.88, 1.37)
  $table = $doc.Tables.Add($selection.Range, 8, 5)
  Format-GridTable $table $widths
  $table.Cell(1, 1).Merge($table.Cell(1, 5))
  Set-CellText $table.Cell(1, 1) "Punchlist Items" 11 $true $wdAlignLeft
  $headers = @("#", "Description", "Assign To", "Status", "Incident Report No. / Notes")
  for ($c = 1; $c -le 5; $c++) { Set-CellText $table.Cell(2, $c) $headers[$c - 1] 11 $true $wdAlignCenter }
  for ($r = 3; $r -le 8; $r++) {
    $table.Rows.Item($r).HeightRule = $wdRowHeightAtLeast
    $table.Rows.Item($r).Height = 21.5
    Set-CellText $table.Cell($r, 1) ([string]($r - 2)) 9 $false $wdAlignCenter
    Set-CellText $table.Cell($r, 2) "" 9 $false $wdAlignLeft
    Set-CellText $table.Cell($r, 3) "" 9 $false $wdAlignLeft
    Set-CellText $table.Cell($r, 4) "Choose an item." 9 $false $wdAlignCenter
    Set-CellText $table.Cell($r, 5) "" 9 $false $wdAlignLeft
    $ccRange = $table.Cell($r, 4).Range
    $ccRange.End = $ccRange.End - 1
    $cc = $doc.ContentControls.Add($wdContentControlDropdownList, $ccRange)
    $cc.Title = "Punchlist Status"
    $cc.Tag = "PunchlistStatus$($r - 2)"
    $cc.DropdownListEntries.Add("Choose an item.", "Choose an item.") | Out-Null
    $cc.DropdownListEntries.Add("Open", "Open") | Out-Null
    $cc.DropdownListEntries.Add("In Progress", "In Progress") | Out-Null
    $cc.DropdownListEntries.Add("Closed", "Closed") | Out-Null
    Set-RangeFont $cc.Range 9 $false
    $cc.Range.ParagraphFormat.Alignment = $wdAlignCenter
  }
  Move-AfterTable $selection $table
}

function Add-SignoffTable($selection, $doc) {
  $table = $doc.Tables.Add($selection.Range, 4, 3)
  Format-GridTable $table @(1.27, 2.61, 2.61)
  Set-CellText $table.Cell(1, 1) "M.C. Dean" 9 $true $wdAlignLeft
  Set-CellText $table.Cell(1, 2) "Engineer" 11 $true $wdAlignCenter
  Set-CellText $table.Cell(1, 3) "QC Representative" 11 $true $wdAlignCenter
  $labels = @("Print Name:", "Signature:", "Date:")
  for ($r = 2; $r -le 4; $r++) {
    Set-CellText $table.Cell($r, 1) $labels[$r - 2] 9 $false $wdAlignLeft
    Set-CellText $table.Cell($r, 2) "" 9 $false $wdAlignLeft
    Set-CellText $table.Cell($r, 3) "" 9 $false $wdAlignLeft
  }
  Move-AfterTable $selection $table
}

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$doc = $word.Documents.Add()

$doc.PageSetup.PageWidth = Inches 8.5
$doc.PageSetup.PageHeight = Inches 11
$doc.PageSetup.Orientation = 0
$doc.PageSetup.TopMargin = Inches 1.7
$doc.PageSetup.BottomMargin = Inches 1
$doc.PageSetup.LeftMargin = Inches 1
$doc.PageSetup.RightMargin = Inches 1
$doc.PageSetup.HeaderDistance = Inches 0.5
$doc.PageSetup.FooterDistance = Inches 0.6
$doc.PageSetup.DifferentFirstPageHeaderFooter = $true

$section = $doc.Sections.Item(1)
Add-Header $section $true
Add-Header $section $false
Add-Footer $section $true
Add-Footer $section $false

$sel = $word.Selection
$sel.HomeKey(6) | Out-Null

Add-Paragraph $sel "Checkout - SWR BKR 2B - Primary Block" 14 $true $wdAlignLeft 6
Add-Paragraph $sel "Safety Procedures" 11 $true $wdAlignLeft 2
Add-Paragraph $sel "OFCI Equipment Checkout Safety Plan" 10 $false $wdAlignLeft 4

$sel.Range.ListFormat.ApplyNumberDefault() | Out-Null
$sel.ParagraphFormat.LeftIndent = Inches 0.375
$sel.ParagraphFormat.FirstLineIndent = -1 * (Inches 0.187)
$sel.ParagraphFormat.SpaceAfter = 2
$sel.Font.Name = "Arial"
$sel.Font.Size = 9
$sel.Font.Bold = 0
$sel.TypeText("Pre-energization inspection is ")
$sel.Font.Bold = -1
$sel.TypeText("completed")
$sel.Font.Bold = 0
$sel.TypeText(" and the equipment is ready to be energized")
$sel.TypeParagraph()
@(
  "Perform ORM with all personnel involved and review procedure as well as backout plan. Identify muster point",
  "Verify appropriate safety zones and barricades are in place in accordance to our control scheme",
  "Area access control is in place",
  "Equipment signs - nameplate, name tag, arc-flash labels, and safety signage - are installed correctly",
  "Verify proper operation of test equipment",
  "Safe work conditions have been established and verified prior to energization",
  "Work with Vendor support team"
) | ForEach-Object {
  $sel.Font.Bold = 0
  $sel.TypeText($_)
  $sel.TypeParagraph()
}
$sel.Range.ListFormat.RemoveNumbers() | Out-Null
$sel.ParagraphFormat.LeftIndent = 0
$sel.ParagraphFormat.FirstLineIndent = 0
$sel.TypeParagraph()

Add-EquipmentTable $sel $doc
$sel.InsertBreak(7)
Add-ControlTable $sel $doc
Add-Evidence $sel $doc
Add-PunchlistTable $sel $doc
Add-SignoffTable $sel $doc

$doc.Fields.Update() | Out-Null
$savePath = [string]$outPath
$saveFormat = [int]$wdFormatXMLDocument
$doc.SaveAs2($savePath, $saveFormat)
$renderDir = Join-Path $root "rendered-checklist"
New-Item -ItemType Directory -Force -Path $renderDir | Out-Null
$pdfPath = [string](Join-Path $renderDir "Checkout - SWR BKR 2B - Primary Block.pdf")
$doc.ExportAsFixedFormat($pdfPath, $wdExportFormatPDF)
$pages = $doc.ComputeStatistics($wdStatisticPages)
$doc.Close($false)
$word.Quit()
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($doc) | Out-Null
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null

Write-Output "Saved $outPath"
Write-Output "PDF $pdfPath"
Write-Output "Pages $pages"
