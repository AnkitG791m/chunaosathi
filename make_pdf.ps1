Add-Type -AssemblyName System.Drawing

$brain = "C:\Users\User\.gemini\antigravity\brain\b4185762-2b44-4eb5-bcd3-e6975aaf1d33"
$outPdf = "C:\Users\User\Desktop\Chunao_Saathi_App.pdf"

$images = @(
    @{ path = "$brain\home_1777041546303.png"; label = "Home Screen" },
    @{ path = "$brain\chat_new_1777041649414.png"; label = "AI Chat Assistant" },
    @{ path = "$brain\booth_1777042057497.png"; label = "Booth Finder" },
    @{ path = "$brain\fakcheck_final_1777042230013.png"; label = "Fact Checker" },
    @{ path = "$brain\quiz_actual_final_1777042347557.png"; label = "Election Quiz" }
)

# Use iTextSharp if available, else use built-in printDocument trick
# Create HTML that browsers can print to PDF
$html = @"
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Chunao Saathi — App Screenshots</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #050505; font-family: 'Segoe UI', Arial, sans-serif; color: white; }
  .cover { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: linear-gradient(135deg, #FF6B35, #D44D1F); page-break-after: always; }
  .cover h1 { font-size: 52px; font-weight: 900; color: white; margin-bottom: 12px; }
  .cover p { font-size: 20px; color: rgba(255,255,255,0.85); text-align: center; max-width: 500px; line-height: 1.6; }
  .cover .badge { margin-top: 24px; background: rgba(255,255,255,0.2); padding: 10px 24px; border-radius: 100px; font-size: 14px; font-weight: 700; }
  .page { page-break-after: always; display: flex; flex-direction: column; align-items: center; padding: 40px 20px; background: #050505; min-height: 100vh; }
  .page h2 { font-size: 28px; font-weight: 800; color: #FF6B35; margin-bottom: 24px; text-align: center; }
  .page img { width: 390px; max-width: 100%; border-radius: 20px; box-shadow: 0 20px 60px rgba(255,107,53,0.3); border: 2px solid rgba(255,255,255,0.1); }
  .page .url { margin-top: 20px; font-size: 13px; color: #555; }
  .tech { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin-bottom: 24px; }
  .chip { background: rgba(255,107,53,0.15); border: 1px solid rgba(255,107,53,0.4); color: #FF6B35; padding: 5px 14px; border-radius: 100px; font-size: 13px; font-weight: 700; }
  .last-page { page-break-after: avoid; }
</style>
</head>
<body>

<!-- COVER PAGE -->
<div class="cover">
  <div style="font-size:80px;margin-bottom:20px;">🗳️</div>
  <h1>Chunao Saathi</h1>
  <p>AI-Powered Election Education Platform for India's 950 Million Voters</p>
  <div class="badge">🇮🇳 Built on Google Cloud • Hackathon Project</div>
  <div style="margin-top:16px; font-size:13px; opacity:0.7;">chunao-app-2026.web.app</div>
</div>

<!-- TECH STACK PAGE -->
<div class="page">
  <h2>⚙️ Tech Stack</h2>
  <div class="tech">
    <span class="chip">React + Vite</span>
    <span class="chip">Firebase Hosting</span>
    <span class="chip">Google Cloud Run</span>
    <span class="chip">Gemini AI</span>
    <span class="chip">Firestore</span>
    <span class="chip">Google Maps API</span>
    <span class="chip">Firebase Analytics</span>
    <span class="chip">Node.js + Express</span>
  </div>
  <div style="color:#888; font-size:14px; line-height:2; text-align:center; max-width:480px;">
    ✅ AI Chatbot (Hindi + English)<br>
    ✅ Real-time Booth Finder with Maps<br>
    ✅ AI-powered Fact Checker<br>
    ✅ Gamified Election Quiz<br>
    ✅ Valid ID Documents Guide<br>
    ✅ Step-by-step Voting Guide<br>
    ✅ Firebase Auth (Google Sign-in)<br>
    ✅ WCAG 2.1 Accessibility Compliant
  </div>
</div>

<!-- SCREENSHOT PAGES -->
"@

$labels = @("🏠 Home Screen", "🤖 AI Chat Assistant", "📍 Booth Finder", "🛡️ Fact Checker", "🏆 Election Quiz")
$descriptions = @(
    "Landing page with quick access to all features, voter helpline, and language switcher",
    "Gemini AI-powered chatbot answering election queries in Hindi and English",
    "Location-based booth finder with Google Maps integration for all Indian states",
    "AI fact-checker to verify viral news and election rumors in real-time",
    "Gamified quiz module with 7+ questions, score tracking, and medal system"
)

for ($i = 0; $i -lt $images.Count; $i++) {
    $img64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($images[$i].path))
    $isLast = if ($i -eq $images.Count - 1) { "last-page" } else { "" }
    $html += @"

<div class="page $isLast">
  <h2>$($labels[$i])</h2>
  <p style="color:#888; font-size:13px; margin-bottom:20px; text-align:center; max-width:420px;">$($descriptions[$i])</p>
  <img src="data:image/png;base64,$img64" alt="$($labels[$i])" />
  <div class="url">🌐 chunao-app-2026.web.app</div>
</div>
"@
}

$html += @"

</body>
</html>
"@

$htmlPath = "C:\Users\User\Desktop\Chunao_Saathi_App.html"
[IO.File]::WriteAllText($htmlPath, $html, [System.Text.Encoding]::UTF8)
Write-Host "HTML created at: $htmlPath"
Write-Host "Open this file in Chrome and press Ctrl+P -> Save as PDF"
