import re

with open(r'd:\Checklist_App\ban-cu.html', 'r', encoding='utf-8') as f:
    text = f.read()

# CSS for hero-poster-wrap, hero-poster-badge, dot-live
css = """
    /* ───── POSTER IMAGE ───── */
    .hero-poster-wrap {
      position: relative;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06);
    }

    .hero-poster-wrap img {
      width: 100%;
      height: auto;
      display: block;
      border-radius: 20px;
    }

    .hero-poster-badge {
      position: absolute;
      bottom: 16px;
      left: 16px;
      right: 16px;
      background: rgba(255,255,255,0.95);
      backdrop-filter: blur(8px);
      border-radius: 12px;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.12);
    }

    .hero-poster-badge .dot-live {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #ef4444;
      flex-shrink: 0;
      animation: pulse-dot 1.5s ease-in-out infinite;
    }

    .hero-poster-badge span {
      font-size: 13px;
      font-weight: 600;
      color: var(--neutral-700);
    }

    .hero-poster-badge a {
      margin-left: auto;
      font-size: 12px;
      font-weight: 700;
      color: var(--green);
      text-decoration: none;
      border: 1.5px solid var(--green);
      border-radius: 6px;
      padding: 4px 10px;
      white-space: nowrap;
      transition: all 0.2s;
    }

    .hero-poster-badge a:hover {
      background: var(--green);
      color: white;
    }
"""

if '.hero-poster-wrap' not in text:
    text = text.replace('/* ───── REVEAL ANIMATION ───── */', css + '\n    /* ───── REVEAL ANIMATION ───── */')

# Replacement for hero right side
poster_markup = """    <!-- Right: Poster image -->
    <div class="hero-poster-wrap">
      <img src="poster.jpg" alt="Khóa học Giải Mã Nghẽn Doanh Thu – Ngô Xuân Vũ NLP Master Coach" />
      <div class="hero-poster-badge">
        <div class="dot-live"></div>
        <span>Đăng ký qua Zalo</span>
        <a href="https://zalo.me/g/bpmqbq067" target="_blank" rel="noopener">Tham gia ngay →</a>
      </div>
    </div>"""

# Replace the hero right element (hero-image-wrap or hero-card)
if '<div class="hero-image-wrap">' in text:
    text = re.sub(r'<div class="hero-image-wrap">.*?</div>', poster_markup, text, flags=re.DOTALL)
elif '<div class="hero-card">' in text:
    text = re.sub(r'<div class="hero-card">.*?</div>\s*</div>\s*</div>', poster_markup, text, flags=re.DOTALL)

# Replace Logo & Links
text = text.replace('<div class="nav-avatar">NXV</div>', '<img src="logo.png" alt="Ngô Xuân Vũ Logo" style="height:44px;width:auto;object-fit:contain;" />')
text = text.replace('<h3>XV.NLP ACADEMY</h3>', '<img src="logo.png" alt="Ngô Xuân Vũ Logo" style="height:50px;width:auto;object-fit:contain;margin-bottom:12px;background:white;padding:4px;border-radius:8px;" />\n      <h3>XV.NLP ACADEMY</h3>')
text = text.replace('href="#" id="main-register-btn"', 'href="https://zalo.me/g/bpmqbq067" target="_blank" rel="noopener" id="main-register-btn"')
text = text.replace('href="#dang-ky" class="btn-primary"', 'href="https://zalo.me/g/bpmqbq067" target="_blank" rel="noopener" class="btn-primary"')
text = text.replace('src="qr_code.png"', 'src="qr_zalo.png"')

with open(r'd:\Checklist_App\ban-cu.html', 'w', encoding='utf-8') as out:
    out.write(text)

print('Patched ban-cu.html cleanly!')
