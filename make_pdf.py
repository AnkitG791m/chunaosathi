import base64, os

brain = r"C:\Users\User\.gemini\antigravity\brain\b4185762-2b44-4eb5-bcd3-e6975aaf1d33"

imgs = [
    (os.path.join(brain, "home_1777041546303.png"), "Home Screen", "Landing page with all features, language switcher and voter helpline"),
    (os.path.join(brain, "chat_new_1777041649414.png"), "AI Chat Assistant", "Gemini AI chatbot answering election queries in Hindi & English"),
    (os.path.join(brain, "booth_1777042057497.png"), "Booth Finder", "Google Maps integrated booth finder for all Indian states"),
    (os.path.join(brain, "fakcheck_final_1777042230013.png"), "Fact Checker", "AI-powered viral news verifier to stop election misinformation"),
    (os.path.join(brain, "quiz_actual_final_1777042347557.png"), "Election Quiz", "Gamified civic quiz with scoring, medals and instant feedback"),
]

pages_html = ""
for path, label, desc in imgs:
    with open(path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()
    pages_html += f"""
<div class="page">
  <h2>{label}</h2>
  <p class="desc">{desc}</p>
  <img src="data:image/png;base64,{b64}" alt="{label}" />
  <div class="url">chunao-app-2026.web.app</div>
</div>
"""

html = f"""<!DOCTYPE html>
<html lang="hi">
<head>
<meta charset="UTF-8">
<title>Chunao Saathi - App Presentation</title>
<style>
  * {{ margin:0; padding:0; box-sizing:border-box; }}
  body {{ background:#050505; font-family:'Segoe UI',Arial,sans-serif; color:#fff; }}
  
  .cover {{
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    height:100vh; background:linear-gradient(135deg,#FF6B35,#C23B1A);
    page-break-after:always; text-align:center; padding:40px;
  }}
  .cover .emoji {{ font-size:90px; margin-bottom:20px; }}
  .cover h1 {{ font-size:54px; font-weight:900; color:#fff; margin-bottom:14px; letter-spacing:-1px; }}
  .cover .sub {{ font-size:18px; color:rgba(255,255,255,0.85); max-width:480px; line-height:1.7; margin-bottom:20px; }}
  .cover .badge {{ background:rgba(255,255,255,0.18); padding:10px 28px; border-radius:100px; font-size:14px; font-weight:700; }}
  .cover .link {{ margin-top:12px; font-size:13px; opacity:0.7; }}
  
  .tech-page {{
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    min-height:100vh; background:#0a0a0a; page-break-after:always; padding:60px 40px;
  }}
  .tech-page h2 {{ font-size:32px; font-weight:800; color:#FF6B35; margin-bottom:32px; }}
  .chips {{ display:flex; flex-wrap:wrap; gap:12px; justify-content:center; margin-bottom:40px; max-width:600px; }}
  .chip {{ background:rgba(255,107,53,0.12); border:1.5px solid rgba(255,107,53,0.4); color:#FF6B35; padding:8px 18px; border-radius:100px; font-size:14px; font-weight:700; }}
  .features {{ color:#888; font-size:15px; line-height:2.2; text-align:center; }}
  .features span {{ color:#ccc; }}
  
  .page {{
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    min-height:100vh; background:#050505; page-break-after:always; padding:50px 20px;
  }}
  .page h2 {{ font-size:28px; font-weight:800; color:#FF6B35; margin-bottom:10px; text-align:center; }}
  .page .desc {{ font-size:14px; color:#666; margin-bottom:28px; text-align:center; max-width:420px; line-height:1.6; }}
  .page img {{ width:360px; max-width:100%; border-radius:22px; box-shadow:0 24px 64px rgba(255,107,53,0.25); border:2px solid rgba(255,255,255,0.08); }}
  .page .url {{ margin-top:18px; font-size:12px; color:#333; }}
  
  @media print {{
    .cover, .tech-page, .page {{ page-break-after:always; min-height:100vh; }}
  }}
</style>
</head>
<body>

<div class="cover">
  <div class="emoji">🗳️</div>
  <h1>Chunao Saathi</h1>
  <p class="sub">AI-Powered Election Education Platform for India's 950 Million Voters — Built 100% on Google Cloud</p>
  <div class="badge">🇮🇳 Google Cloud Hackathon Project</div>
  <div class="link">🌐 chunao-app-2026.web.app</div>
</div>

<div class="tech-page">
  <h2>Tech Stack</h2>
  <div class="chips">
    <span class="chip">React + Vite</span>
    <span class="chip">Firebase Hosting</span>
    <span class="chip">Google Cloud Run</span>
    <span class="chip">Gemini AI</span>
    <span class="chip">Cloud Firestore</span>
    <span class="chip">Google Maps API</span>
    <span class="chip">Firebase Analytics</span>
    <span class="chip">Node.js + Express</span>
    <span class="chip">Firebase Auth</span>
  </div>
  <div class="features">
    <span>✅ AI Chatbot</span> — Hindi + English powered by Gemini<br>
    <span>✅ Booth Finder</span> — All 29 states with Google Maps<br>
    <span>✅ Fact Checker</span> — Real-time election rumor verifier<br>
    <span>✅ Election Quiz</span> — Gamified civic education<br>
    <span>✅ ID Guide</span> — Valid documents for voting<br>
    <span>✅ Voting Guide</span> — Step-by-step process<br>
    <span>✅ Accessibility</span> — WCAG 2.1 AA compliant<br>
    <span>✅ Multilingual</span> — Hindi & English support
  </div>
</div>

{pages_html}

</body>
</html>"""

out = r"C:\Users\User\Desktop\Chunao_Saathi_App.html"
with open(out, "w", encoding="utf-8") as f:
    f.write(html)

print(f"SUCCESS! File created at: {out}")
print("To make PDF: Open this file in Chrome, then Ctrl+P > Save as PDF")
