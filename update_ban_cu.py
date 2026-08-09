import json

with open(r'd:\Checklist_App\ban-cu.html', 'r', encoding='utf-8') as f:
    html = f.read()

# CSS patch for poster image and live badge
css_patch = """
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

if '.hero-poster-wrap' not in html:
    html = html.replace('/* ───── REVEAL ANIMATION ───── */', css_patch + '\n    /* ───── REVEAL ANIMATION ───── */')

# Right side hero replacement with poster image
hero_right_old = """    <!-- Right card -->
    <div class="hero-card">
      <div class="hero-card-glow"></div>

      <div class="card-coach-row">
        <div class="card-coach-avatar">NXV</div>
        <div>
          <div class="card-coach-name">Ngô Xuân Vũ</div>
          <div class="card-coach-sub">NLP Master Coach</div>
        </div>
        <div class="card-badge">ONLINE</div>
      </div>

      <div class="session-pills">
        <div class="session-pill">
          <div class="s-label">Buổi 1</div>
          <div class="s-date">11/8</div>
          <div class="s-day">Thứ Ba</div>
        </div>
        <div class="session-pill">
          <div class="s-label">Buổi 2</div>
          <div class="s-date">12/8</div>
          <div class="s-day">Thứ Tư</div>
        </div>
        <div class="session-pill">
          <div class="s-label">Buổi 3</div>
          <div class="s-date">13/8</div>
          <div class="s-day">Thứ Năm</div>
        </div>
      </div>

      <div class="session-time">
        <div class="dot"></div>
        <span><strong>20:00 – 22:00</strong> · Học Online · Zoom/Meet</span>
      </div>

      <div class="card-stats">
        <div class="card-stat">
          <div class="stat-val">12</div>
          <div class="stat-label">Điểm nghẽn được chẩn đoán</div>
        </div>
        <div class="card-stat">
          <div class="stat-val">1:1</div>
          <div class="stat-label">Coaching cá nhân kèm theo</div>
        </div>
        <div class="card-stat">
          <div class="stat-val">CEO</div>
          <div class="stat-label">SME đột phá doanh thu</div>
        </div>
        <div class="card-stat">
          <div class="stat-val">4T</div>
          <div class="stat-label">Chiến lược cuối năm</div>
        </div>
      </div>
    </div>"""

hero_right_new = """    <!-- Right: Poster image -->
    <div class="hero-poster-wrap">
      <img src="poster.jpg" alt="Khóa học Giải Mã Nghẽn Doanh Thu – Ngô Xuân Vũ NLP Master Coach" />
      <div class="hero-poster-badge">
        <div class="dot-live"></div>
        <span>Đăng ký qua Zalo</span>
        <a href="https://zalo.me/g/bpmqbq067" target="_blank" rel="noopener">Tham gia ngay →</a>
      </div>
    </div>"""

if hero_right_old in html:
    html = html.replace(hero_right_old, hero_right_new)

# Logo & Links
html = html.replace('<div class="nav-avatar">NXV</div>', '<img src="logo.png" alt="Ngô Xuân Vũ Logo" style="height:44px;width:auto;object-fit:contain;" />')
html = html.replace('<h3>XV.NLP ACADEMY</h3>', '<img src="logo.png" alt="Ngô Xuân Vũ Logo" style="height:50px;width:auto;object-fit:contain;margin-bottom:12px;background:white;padding:4px;border-radius:8px;" />\n      <h3>XV.NLP ACADEMY</h3>')
html = html.replace('href="#" id="main-register-btn"', 'href="https://zalo.me/g/bpmqbq067" target="_blank" rel="noopener" id="main-register-btn"')
html = html.replace('href="#dang-ky" class="btn-primary"', 'href="https://zalo.me/g/bpmqbq067" target="_blank" rel="noopener" class="btn-primary"')

with open(r'd:\Checklist_App\ban-cu.html', 'w', encoding='utf-8') as out:
    out.write(html)

print('Updated ban-cu.html successfully!')
