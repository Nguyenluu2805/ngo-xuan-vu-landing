/*
  XV Business Health Index - Interactive Assessment & Page Interactivity
  Brand: Master Coach Ngô Xuân Vũ (XV.NLP Academy)
*/

document.addEventListener('DOMContentLoaded', () => {

  // 12 Pillars Data & Assessment Logic
  const pillarsData = [
    {
      id: 1,
      title: "Tư Duy Lãnh Đạo & Tầm Nhìn",
      desc: "Tư duy cấp tiến của CEO, tầm nhìn sứ mệnh rõ ràng và khả năng truyền cảm hứng cho toàn bộ tổ chức.",
      question: "CEO & Lãnh đạo có tầm nhìn 3-5 năm rõ ràng và truyền tải nhất quán đến toàn bộ đội ngũ chưa?"
    },
    {
      id: 2,
      title: "Chiến Lược Kinh Doanh",
      desc: "Định vị sản phẩm khác biệt, chiến lược giá, mục tiêu doanh thu và lộ trình hành động theo quý/năm.",
      question: "Doanh nghiệp có mục tiêu kinh doanh cụ thể cùng kế hoạch hành động chi tiết từng quý không?"
    },
    {
      id: 3,
      title: "Khách Hàng & Thị Trường",
      desc: "Nhận diện chân dung khách hàng mục tiêu, hiểu rõ nỗi đau và dung lượng thị trường khai thác.",
      question: "Doanh nghiệp có vẽ đúng chân dung khách hàng lý tưởng và thấu hiểu nỗi đau của họ không?"
    },
    {
      id: 4,
      title: "Marketing Multi-Channel",
      desc: "Hệ thống thu hút khách hàng tiềm năng đa kênh, thông điệp truyền thông sắc bén và đo lường ROI.",
      question: "Hệ thống Marketing có tạo ra dòng Lead (khách tiềm năng) đều đặn mỗi ngày không?"
    },
    {
      id: 5,
      title: "Hệ Thống Bán Hàng (Sales)",
      desc: "Kịch bản chốt sale chuẩn hóa, kỹ năng đội ngũ bán hàng và tỷ lệ chuyển đổi đơn hàng tối ưu.",
      question: "Đội ngũ Sales có quy trình & kịch bản chốt sale chuẩn hóa với tỷ lệ chuyển đổi cao không?"
    },
    {
      id: 6,
      title: "Chăm Sóc Khách Hàng",
      desc: "Quy trình sau bán hàng, giữ chân khách hàng cũ, tăng giá trị trọn đời (LTV) và giới thiệu (Referral).",
      question: "Doanh nghiệp có quy trình chăm sóc biến khách hàng cũ thành người giới thiệu sản phẩm không?"
    },
    {
      id: 7,
      title: "Đội Ngũ Nhân Sự",
      desc: "Tuyển dụng đúng người, văn hóa làm việc năng nổ, giữ chân nhân tài và trao quyền hiệu quả.",
      question: "Đội ngũ nhân sự có chủ động, làm việc hết mình và ít biến động nhân tài không?"
    },
    {
      id: 8,
      title: "Hệ Thống Vận Hành (SOP & KPI)",
      desc: "Quy trình thao tác chuẩn (SOP), hệ thống đo lường KPI minh bạch và Dashboard quản trị tự động.",
      question: "Mọi phòng ban đã có SOP làm việc chuẩn hóa và đo lường KPI rõ ràng chưa?"
    },
    {
      id: 9,
      title: "Pháp Lý & Kế Toán",
      desc: "Tuân thủ pháp luật, bảo vệ tài sản trí tuệ, sổ sách kế toán minh bạch và tối ưu rủi ro.",
      question: "Sổ sách kế toán và hồ sơ pháp lý của doanh nghiệp có minh bạch và an toàn không?"
    },
    {
      id: 10,
      title: "Tài Chính (Doanh Thu & Dòng Tiền)",
      desc: "Kiểm soát lợi nhuận gộp/ròng, quản trị dòng tiền (Cashflow) và kế hoạch dự phòng rủi ro.",
      question: "Doanh nghiệp có kiểm soát chặt chẽ dòng tiền vào/ra và đảm bảo lợi nhuận ròng ổn định không?"
    },
    {
      id: 11,
      title: "AI & Chuyển Đổi Số",
      desc: "Ứng dụng trí tuệ nhân tạo (AI), tự động hóa quy trình (Automation) và quản trị số hóa.",
      question: "Doanh nghiệp đã ứng dụng AI và các công cụ tự động hóa để tăng tốc hiệu suất công việc chưa?"
    },
    {
      id: 12,
      title: "Tăng Trưởng Bền Vững",
      desc: "Khả năng mở rộng quy trình, nhân bản chi nhánh/mô hình và giải phóng lãnh đạo khỏi vận hành.",
      question: "Doanh nghiệp có thể tự vận hành trơn tru ngay cả khi CEO vắng mặt 1-2 tháng không?"
    }
  ];

  // User Assessment Ratings State (Default score 3 for each)
  const userRatings = Array(12).fill(3);

  // Render Quiz Questions
  const quizListContainer = document.getElementById('quiz-questions-container');
  if (quizListContainer) {
    quizListContainer.innerHTML = pillarsData.map((item, index) => `
      <div class="quiz-question-item">
        <div class="quiz-q-header">
          <span class="quiz-q-num">Trụ cột #${item.id}</span>
          <h4 class="quiz-q-title">${item.title}</h4>
        </div>
        <p style="font-size: 13.5px; color: var(--neutral-600); margin-bottom: 12px;">${item.question}</p>
        <div class="quiz-options-group" data-pillar-idx="${index}">
          <button class="quiz-option-btn ${userRatings[index] === 1 ? 'selected' : ''}" data-val="1">1 - Yếu</button>
          <button class="quiz-option-btn ${userRatings[index] === 2 ? 'selected' : ''}" data-val="2">2 - Trung bình</button>
          <button class="quiz-option-btn ${userRatings[index] === 3 ? 'selected' : ''}" data-val="3">3 - Khá</button>
          <button class="quiz-option-btn ${userRatings[index] === 4 ? 'selected' : ''}" data-val="4">4 - Tốt</button>
          <button class="quiz-option-btn ${userRatings[index] === 5 ? 'selected' : ''}" data-val="5">5 - Xuất sắc</button>
        </div>
      </div>
    `).join('');

    // Attach Event Listeners to Quiz Option Buttons
    quizListContainer.querySelectorAll('.quiz-option-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const group = e.target.closest('.quiz-options-group');
        const pIdx = parseInt(group.getAttribute('data-pillar-idx'));
        const scoreVal = parseInt(e.target.getAttribute('data-val'));

        // Update active class
        group.querySelectorAll('.quiz-option-btn').forEach(b => b.classList.remove('selected'));
        e.target.classList.add('selected');

        // Update rating state and recalculate total score
        userRatings[pIdx] = scoreVal;
        updateAssessmentScore();
      });
    });
  }

  // Calculate & Update Score Display
  function updateAssessmentScore() {
    const totalPoints = userRatings.reduce((sum, val) => sum + val, 0);
    // Total max is 12 * 5 = 60 points. Convert to 100-scale.
    const healthIndex = Math.round((totalPoints / 60) * 100);

    const scoreNumEl = document.getElementById('score-number');
    const scoreMeterEl = document.getElementById('score-meter');
    const statusBadgeEl = document.getElementById('status-badge');
    const diagnosisTextEl = document.getElementById('diagnosis-text');

    if (scoreNumEl) scoreNumEl.textContent = healthIndex;

    // Update conic gradient meter ring
    if (scoreMeterEl) {
      const deg = Math.round((healthIndex / 100) * 360);
      scoreMeterEl.style.background = `conic-gradient(var(--gold) ${deg}deg, rgba(255, 255, 255, 0.1) ${deg}deg)`;
    }

    // Status evaluation & Diagnosis
    let statusMsg = "";
    let diagMsg = "";

    if (healthIndex >= 85) {
      statusMsg = "SỨC KHỎE DOANH NGHIỆP: VỮNG MẠNH";
      diagMsg = "Doanh nghiệp có nền tảng vận hành rất tốt. Hãy tiếp tục tối ưu hóa AI Chuyển đổi số & nhân bản quy mô bứt phá!";
    } else if (healthIndex >= 70) {
      statusMsg = "SỨC KHỎE DOANH NGHIỆP: KHÁ (CÓ ĐIỂM NGHẼN)";
      diagMsg = "Doanh nghiệp tăng trưởng ổn định nhưng đang vấp phải 2-3 điểm nghẽn ở Hệ thống SOP Vận hành & Đội ngũ nhân sự.";
    } else if (healthIndex >= 50) {
      statusMsg = "CẢNH BÁO: NHIỀU ĐIỂM NGHẼN NGUY CẤP!";
      diagMsg = "Doanh nghiệp của bạn đang chịu áp lực lớn từ Marketing, Sales & Dòng tiền. Cần tái cấu trúc chiến lược ngay lập tức!";
    } else {
      statusMsg = "BÁO ĐỘNG ĐỎ: NGHẼN TOÀN HỆ THỐNG!";
      diagMsg = "Vận hành trì trệ, nhân sự rời rạc & CEO bị quá tải. Đăng ký ngay 01 Phiên Coaching CEO 60 phút để tháo gỡ lập tức!";
    }

    if (statusBadgeEl) statusBadgeEl.textContent = statusMsg;
    if (diagnosisTextEl) diagnosisTextEl.textContent = diagMsg;
  }

  // Run initial score calculation
  updateAssessmentScore();

  // Registration Modal Elements
  const modalOverlay = document.getElementById('registration-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const leadForm = document.getElementById('ceo-lead-form');
  const triggerBtns = document.querySelectorAll('.btn-trigger-modal');

  // Trigger Modal
  triggerBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (modalOverlay) modalOverlay.classList.add('active');
    });
  });

  // Close Modal
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', () => {
      if (modalOverlay) modalOverlay.classList.remove('active');
    });
  }

  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) modalOverlay.classList.remove('active');
    });
  }

  // ───── GOOGLE SHEETS INTEGRATION ─────
  const GOOGLE_SHEET_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyoO5eD_2ZmdpWPHIHRh4cNhIa0bv7IuIY5UjL4lnPXfsobu4V6NArDgA1FuuQHYemD-A/exec';

  async function sendLeadToGoogleSheet(leadData) {
    if (!GOOGLE_SHEET_SCRIPT_URL) return;
    try {
      const formData = new URLSearchParams();
      for (const key in leadData) {
        formData.append(key, leadData[key]);
      }

      await fetch(GOOGLE_SHEET_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString()
      });
      console.log('Successfully sent lead to Google Sheet!');
    } catch (err) {
      console.warn('Google Sheet submission warning:', err);
    }
  }

  // Lead Form Submission Handler
  if (leadForm) {
    leadForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const name = document.getElementById('lead-name')?.value.trim();
      const phone = document.getElementById('lead-phone')?.value.trim();
      const company = document.getElementById('lead-company')?.value.trim();

      if (!name || !phone) {
        showToast("Vui lòng điền Họ tên và Số điện thoại!");
        return;
      }

      // Prepare lead payload
      const leadData = {
        name: name,
        phone: phone,
        company: company || 'Chưa cung cấp',
        score: document.getElementById('score-number')?.textContent || '75',
        source: 'Giao diện V2 (Executive)',
        timestamp: new Date().toLocaleString('vi-VN')
      };
      
      // Save locally & Send to Google Sheet
      localStorage.setItem('xv_ceo_lead', JSON.stringify(leadData));
      sendLeadToGoogleSheet(leadData);

      // Close modal if open
      if (modalOverlay) modalOverlay.classList.remove('active');

      // Reset form
      leadForm.reset();

      // Show Success Confirmation Toast
      showToast("Đăng ký thành công! Chuyên gia XV.NLP Academy sẽ liên hệ Zalo trong ít phút.");

      // Open Zalo Group link after brief delay
      setTimeout(() => {
        window.open('https://zalo.me/g/bpmqbq067', '_blank');
      }, 1500);
    });
  }

  // Toast Notification Helper
  function showToast(msg) {
    let toast = document.getElementById('toast-box');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast-box';
      toast.className = 'toast-box';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');

    setTimeout(() => {
      toast.classList.remove('show');
    }, 4500);
  }

  // Navbar Active Link Scroll Highlights
  const navLinks = document.querySelectorAll('.nav-item-link');
  window.addEventListener('scroll', () => {
    let current = '';
    const sections = document.querySelectorAll('section[id]');
    sections.forEach(sec => {
      const secTop = sec.offsetTop - 120;
      if (window.scrollY >= secTop) {
        current = sec.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('active');
      }
    });
  });

  // Mobile Menu Drawer Toggle
  const mobileToggleBtn = document.getElementById('mobile-toggle-btn');
  const mobileDrawer = document.getElementById('mobile-drawer');
  const mobileNavItems = document.querySelectorAll('.mobile-nav-item');

  if (mobileToggleBtn && mobileDrawer) {
    mobileToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      mobileDrawer.classList.toggle('active');
    });

    mobileNavItems.forEach(item => {
      item.addEventListener('click', () => {
        mobileDrawer.classList.remove('active');
      });
    });

    document.addEventListener('click', (e) => {
      if (!mobileDrawer.contains(e.target) && !mobileToggleBtn.contains(e.target)) {
        mobileDrawer.classList.remove('active');
      }
    });
  }

});
