import './style.css';

const app = document.querySelector<HTMLDivElement>('#app')!;

app.innerHTML = `
  <!-- Glassmorphic Header Navbar -->
  <header id="_header-238-12" class="oxy-header-wrapper oxy-sticky-header oxy-overlay-header oxy-header main-header">
    <div class="oxy-header-container">
      
      <!-- Right: Brand Logo (RTL Start) -->
      <div id="_header_left-240-12" class="oxy-header-left">
        <a id="link-242-12" class="atomic-logo" href="#home">
          <img id="image-243-12" alt="Logo TREND, شعار" src="https://trenddc.com/wp-content/uploads/2025/03/rend-new-logo-r088nhh5j04hd8piy1u4rtunmb2x5oy2jo1oduuwgq.png" />
        </a>
      </div>

      <!-- Center: Navigation Menu -->
      <div id="_header_center-244-12" class="oxy-header-center">
        <nav class="header-main-menu">
          <button class="mobile-menu-toggle" id="mobileMenuToggle" aria-label="قائمة الملاحة">
            <i class="fa-solid fa-bars"></i>
          </button>
          <ul id="menu-main-menu" class="oxy-pro-menu-list">
            <li class="menu-item current-menu-item"><a href="#home">الرئيسية</a></li>
            <li class="menu-item"><a href="#about">من نحن</a></li>
            <li class="menu-item"><a href="#services">خدماتنا</a></li>
            <li class="menu-item"><a href="#products">المنتجات</a></li>
            <li class="menu-item"><a href="#blog">المدونة</a></li>
            <li class="menu-item"><a href="#projects">المشاريع</a></li>
          </ul>
        </nav>
      </div>

      <!-- Left: Contact CTA Button (RTL End) -->
      <div id="_header_right-246-12" class="oxy-header-right">
        <a id="link-247-12" class="btn-global btn-header-cta" href="#contact" role="button">
          <div class="btn-global-icon"><i class="fa-solid fa-phone"></i></div>
          <span class="btn-global-text">تواصل معنا</span>
        </a>
      </div>

    </div>
  </header>

  <main class="page-main-wrap">
    
    <!-- SECTION 1: HERO SECTION -->
    <section id="home" class="hero-section-anchor">
      <div id="div_block-2560-363" class="ct-div-block full-width hero-container">
        
        <!-- Background YouTube Video Frame -->
        <div id="code_block-2580-363" class="hero-video-bg">
          <div class="yt-overlay"></div>
          <iframe
            class="bg-video-iframe"
            src="https://www.youtube.com/embed/4-1RcR1PgrU?autoplay=1&mute=1&loop=1&playlist=4-1RcR1PgrU&controls=0&modestbranding=1&rel=0&playsinline=1&disablekb=1&iv_load_policy=3&fs=0&showinfo=0&start=1"
            frameborder="0"
            allow="autoplay; fullscreen"
            allowfullscreen
          ></iframe>
        </div>

        <!-- Giant Scrolling Background Text Overlay -->
        <div class="hero-bg-marquee">
          <div class="hero-marquee-track">
            <span>شريكك الرقمي للتأثير والإنجاز • نتبنى الطموح • شريكك الرقمي للتأثير والإنجاز • </span>
            <span>شريكك الرقمي للتأثير والإنجاز • نتبنى الطموح • شريكك الرقمي للتأثير والإنجاز • </span>
          </div>
        </div>

        <!-- Hero Section Content Layer -->
        <div id="div_block-2561-363" class="hero-foreground">
          
          <!-- Social Media Vertical Sidebar (Left Side) -->
          <div id="div_block-2562-363" class="hero-social-sidebar">
            <a id="link-2563-363" class="ct-link social-icon-link" href="https://x.com/Trend1DC" target="_blank" aria-label="X / Twitter">
              <i class="fa-brands fa-x-twitter"></i>
            </a>
            <a id="link-2565-363" class="ct-link social-icon-link" href="https://www.instagram.com/trend1dc/" target="_blank" aria-label="Instagram">
              <i class="fa-brands fa-instagram"></i>
            </a>
            <a id="link-2567-363" class="ct-link social-icon-link" href="https://www.linkedin.com/company/trend1dc" target="_blank" aria-label="LinkedIn">
              <i class="fa-brands fa-linkedin-in"></i>
            </a>
            <a id="link-2569-363" class="ct-link social-icon-link" href="https://wa.me/920032032" target="_blank" aria-label="WhatsApp">
              <i class="fa-brands fa-whatsapp"></i>
            </a>
            <a id="link-2571-363" class="ct-link badge-link" href="https://drive.google.com/file/d/1ipJCEGsS1z3aUeM9lBuYqOPVxJtErIa7/view" target="_blank">
              <img id="image-2572-363" alt="Trend Identity" src="https://trenddc.com/wp-content/uploads/2025/05/Component-3.png" class="ct-image badge-img" />
            </a>
            <a id="link-2573-363" class="ct-link badge-link" href="https://trenddc.com/wp-content/uploads/2025/05/Trend-Company-Profile-2025.pdf" target="_blank">
              <img id="image-2574-363" alt="Trend Profile" src="https://trenddc.com/wp-content/uploads/2025/05/Component-2.png" class="ct-image badge-img" />
            </a>
          </div>

          <!-- Main Headline (Right Aligned RTL) -->
          <div id="div_block-2575-363" class="hero-headline-wrap">
            <h1 id="headline-2576-363" class="ct-headline atomic-primary-heading">
              نتبنى الطموح<br />
              من الفكرة إلى الإنجاز<br />
            </h1>
          </div>

          <!-- Circular Rotating Video Trigger (Bottom Right) -->
          <a id="link-2578-363" class="ct-link play-video-link video-trigger-btn" href="#" role="button" aria-label="مشاهدة الفيديو" data-video-id="pQ1bHDVsmc4">
            <div id="code_block-2579-363" class="ct-code-block play-widget-container">
              <svg class="rotating-play-svg" xmlns="http://www.w3.org/2000/svg" width="140" height="140" viewBox="0 0 158 158" fill="none">
                <path d="M79 127.24C105.642 127.24 127.239 105.643 127.239 79.0011C127.239 52.3592 105.642 30.7617 79 30.7617C52.3582 30.7617 30.7607 52.3592 30.7607 79.0011C30.7607 105.643 52.3582 127.24 79 127.24Z" stroke="#00CC57" stroke-width="2" stroke-miterlimit="10"/>
                <path d="M79 157C122.078 157 157 122.078 157 79C157 35.9218 122.078 1 79 1C35.9218 1 1 35.9218 1 79C1 122.078 35.9218 157 79 157Z" stroke="#00CC57" stroke-width="2" stroke-miterlimit="10"/>
                <path d="M90.6208 80.4567C91.6875 79.8409 91.6875 78.3013 90.6208 77.6855L74.4865 68.3703C73.4198 67.7544 72.0865 68.5242 72.0865 69.7559V88.3863C72.0865 89.618 73.4198 90.3878 74.4865 89.7719L90.6208 80.4567Z" fill="#00CC57"/>
                <path id="textCirclePath" d="M 79, 79 m -58, 0 a 58,58 0 1,1 116,0 a 58,58 0 1,1 -116,0" fill="none"/>
                <g class="rotating-text-layer">
                  <text fill="#ffffff" font-size="11" font-weight="600" font-family="'DahabArabicITF', sans-serif">
                    <textPath href="#textCirclePath" startOffset="0%">
                      تابع الفيديو • تابع الفيديو • تابع الفيديو •
                    </textPath>
                  </text>
                </g>
              </svg>
            </div>
          </a>

        </div>
      </div>
    </section>

    <!-- SECTION 2: SERVICES ("خدماتنا") -->
    <section id="services" class="site-section services-section-exact">
      <div class="container services-two-col-container">
        
        <div class="services-info-col">
          <span class="section-tag-badge">خدماتنـــــا</span>
          <h2 class="services-exact-title">
            الخطوة الأولى لبناء حضور رقمي يصنع الفارق ويترك الأثر
          </h2>
          <p class="services-exact-sub">
            نلتزم بأن نكون الخيار الأول للقطاعين العام والخاص، نبتكر، نطور، ونصنع محتوى يتجاوز التوقعات.
          </p>

          <a href="#services" class="btn-services-exact">
            <div class="btn-arrow-circle"><i class="fa-solid fa-arrow-up-right-from-square"></i></div>
            <span>جميع الخدمات</span>
          </a>
        </div>

        <div class="services-list-col">
          <div class="service-exact-row">
            <div class="service-circle-icon"><i class="fa-solid fa-bullhorn"></i></div>
            <div class="service-row-content">
              <h3 class="service-row-title">الحملات الاتصالية والعلاقات العامة</h3>
              <p class="service-row-desc">نُخطط ونُنفّذ حملات ومعارض تفاعلية تحقق الانتشار وتُرسّخ الأثر.</p>
            </div>
            <div class="service-arrow-left"><i class="fa-solid fa-arrow-up-right-from-square"></i></div>
          </div>

          <div class="service-exact-row">
            <div class="service-circle-icon"><i class="fa-solid fa-building-user"></i></div>
            <div class="service-row-content">
              <h3 class="service-row-title">إدارة المراكز الإعلامية</h3>
              <p class="service-row-desc">نُدير المراكز الإعلامية تشغيلًا متكاملًا يضمن الحضور والتفاعل الفعّال.</p>
            </div>
            <div class="service-arrow-left"><i class="fa-solid fa-arrow-up-right-from-square"></i></div>
          </div>

          <div class="service-exact-row">
            <div class="service-circle-icon"><i class="fa-solid fa-shield-halved"></i></div>
            <div class="service-row-content">
              <h3 class="service-row-title">إدارة السمعــة</h3>
              <p class="service-row-desc">نُراقب الصورة الذهنية وندير التحديات لضمان حضور إيجابي مستدام.</p>
            </div>
            <div class="service-arrow-left"><i class="fa-solid fa-arrow-up-right-from-square"></i></div>
          </div>

          <div class="service-exact-row">
            <div class="service-circle-icon"><i class="fa-solid fa-film"></i></div>
            <div class="service-row-content">
              <h3 class="service-row-title">الإنتاج المرئي</h3>
              <p class="service-row-desc">نُصمّم ونُنفّذ محتوى بصريًا يعكس الهوية ويُبرز الرسالة بوضوح.</p>
            </div>
            <div class="service-arrow-left"><i class="fa-solid fa-arrow-up-right-from-square"></i></div>
          </div>
        </div>

      </div>
    </section>

    <!-- SECTION 3: SECTORS ("قطاعاتنا") -->
    <section id="about" class="site-section sectors-section-exact">
      <div class="container">
        <div class="sectors-card-container">
          
          <div class="sectors-top-header">
            <div class="sectors-title-wrap">
              <span class="section-tag-badge">قطاعاتنا</span>
              <h2 class="sectors-exact-headline">
                <span class="green-highlight">منظومة</span> متكاملة
              </h2>
            </div>
            <div class="sectors-desc-wrap">
              <p class="sectors-exact-desc">
                إطار متكامل تتداخل فيه الأدوار، وتتقاطع فيه المسؤوليات، بهدف تحقيق أعلى مستويات الكفاءة والتأثير..
              </p>
            </div>
          </div>

          <div class="subbrands-grid">
            <div class="subbrand-card">
              <div class="subbrand-logo"><span class="brand-base">TREND'</span><span class="brand-sub">Creative</span></div>
              <p class="subbrand-desc">نكتب الحكاية، لنصنع الأثر بأسلوبٍ يُلفت، يُقنع، ويُلهم.. لنترك بصمة لا تُنسى، ونُثري المحتوى بخطوات مدروسة.</p>
            </div>
            <div class="subbrand-card">
              <div class="subbrand-logo"><span class="brand-base">TREND'</span><span class="brand-sub">Ad</span></div>
              <p class="subbrand-desc">نصنع التأثير ونُعزز الظهور بتطوير وتنفيذ استراتيجيات تسويقية فعّالة تُحقق الأثر المطلوب لبناء حضور قوي ومستدام..</p>
            </div>
            <div class="subbrand-card">
              <div class="subbrand-logo"><span class="brand-base">TREND'</span><span class="brand-sub">Rmo</span></div>
              <p class="subbrand-desc">برؤية استراتيجية وبتنفيذ متكامل نراقب الأداء ونُقيم النتائج، لنحقق أقصى تأثيرًا..</p>
            </div>
            <div class="subbrand-card">
              <div class="subbrand-logo"><span class="brand-base">TREND'</span><span class="brand-sub">Tech</span></div>
              <p class="subbrand-desc">نقود التحوّل بلغة التقنية، وننسج من الابتكار خيوط حلولٍ تُملهم، تُبهر، وتُغيّر الواقع..</p>
            </div>
            <div class="subbrand-card">
              <div class="subbrand-logo"><span class="brand-base">TREND'</span><span class="brand-sub">Art</span></div>
              <p class="subbrand-desc">نُعيد تشكيل الفكرة بلغة بصرية ناطقة.. ترى ما وراء الكلمات، لنمنح المشاريع حضورًا لا يُنسى..</p>
            </div>
            <div class="subbrand-card">
              <div class="subbrand-logo"><span class="brand-base">TREND'</span><span class="brand-sub">Studio</span></div>
              <p class="subbrand-desc">نكتب الحكاية، لنصنع الأثر بأسلوب يُلفت، يُقنع، ويُلهم.. لنترك بصمة لا تُنسى، ونُثري المحتوى بخطوات مدروسة..</p>
            </div>
          </div>

        </div>
      </div>
    </section>

    <!-- SECTION 4: STATS & MASCOT SECTION -->
    <section class="site-section stats-exact-section">
      <div class="container">
        
        <div class="stats-marquee-wrap">
          <div class="stats-marquee-track">
            <span>في عالم تُحركه البيانات، وتُصاغ رؤاه بالأرقام، نصنع التأثير برؤى واضحة... • </span>
            <span>في عالم تُحركه البيانات، وتُصاغ رؤاه بالأرقام، نصنع التأثير برؤى واضحة... • </span>
          </div>
        </div>

        <div class="stats-mascot-layout">
          <div class="stats-exact-col">
            <div class="stat-item-exact">
              <div class="stat-num-outline">50+</div>
              <div class="stat-text-label">خطة إدارة أزمة</div>
            </div>
            <div class="stat-item-exact">
              <div class="stat-num-outline">20+</div>
              <div class="stat-text-label">استراتيجية اتصالية</div>
            </div>
            <div class="stat-item-exact">
              <div class="stat-num-outline">1K+</div>
              <div class="stat-text-label">خطة لإدارة الأزمات</div>
            </div>
          </div>

          <div class="mascot-center-wrap">
            <img src="https://trenddc.com/wp-content/uploads/2025/06/TRENDO.png" alt="TRENDO Mascot Character" class="trend-mascot-img" />
          </div>

          <div class="stats-exact-col">
            <div class="stat-item-exact">
              <div class="stat-num-outline">2.5K+</div>
              <div class="stat-text-label">حملة إعلانية مـــــــــــــدارة</div>
            </div>
            <div class="stat-item-exact">
              <div class="stat-num-outline">12.5K+</div>
              <div class="stat-text-label">تقريـــــرًا إعلامـــيًا</div>
            </div>
            <div class="stat-item-exact">
              <div class="stat-num-outline">45+</div>
              <div class="stat-text-label">حساب تواصل اجتماعي مدار</div>
            </div>
          </div>
        </div>

      </div>
    </section>

    <!-- SECTION 5: PRODUCTS SECTION -->
    <section id="products" class="site-section products-exact-section">
      <div class="container">
        <div class="products-exact-card">
          <div class="products-card-header">
            <div class="brand-logo-products">
              <span class="brand-base">TREND'</span><span class="brand-sub">Products</span>
            </div>
            <a href="#products" class="btn-products-exact">
              <span>جميع المنتجات</span>
              <i class="fa-solid fa-arrow-left"></i>
            </a>
          </div>

          <div class="products-grid-showcase">
            <div class="product-item-card">
              <div class="product-card-top">
                <div class="product-tag-badge">تأثيراً</div>
                <p class="product-desc">نشر المعلومات والأخبار والصور والفيديو الأكثر تأثيراً وانتشاراً في المجتمع العربي.</p>
              </div>
              <div class="product-stats-row">
                <div class="p-stat">
                  <div class="p-num">4.5M</div>
                  <div class="p-lbl">عدد المتابعين</div>
                </div>
                <div class="p-stat">
                  <div class="p-num">946M</div>
                  <div class="p-lbl">إجمالي المشاهدات</div>
                </div>
              </div>
              <div class="product-social-icons">
                <i class="fa-brands fa-x-twitter"></i>
                <i class="fa-brands fa-facebook-f"></i>
                <i class="fa-brands fa-instagram"></i>
                <i class="fa-brands fa-tiktok"></i>
                <i class="fa-brands fa-snapchat"></i>
                <i class="fa-brands fa-linkedin-in"></i>
                <i class="fa-brands fa-youtube"></i>
              </div>
            </div>

            <div class="product-item-card">
              <div class="product-card-top">
                <div class="product-tag-badge">صحيفة سبورت</div>
                <p class="product-desc">صحيفة إلكترونية، تسعى لأن تكون خيارك الأول في صحافة التقارب، حيث تتلاقى أشكال المحتوى المكتوب والمرئي في مزيج ثري جذاب.</p>
              </div>
              <div class="product-stats-row">
                <div class="p-stat">
                  <div class="p-num">17.5M</div>
                  <div class="p-lbl">عدد المتابعين</div>
                </div>
                <div class="p-stat">
                  <div class="p-num">181M</div>
                  <div class="p-lbl">إجمالي المشاهدات</div>
                </div>
              </div>
              <div class="product-social-icons">
                <i class="fa-brands fa-x-twitter"></i>
                <i class="fa-brands fa-facebook-f"></i>
                <i class="fa-brands fa-instagram"></i>
                <i class="fa-brands fa-tiktok"></i>
                <i class="fa-brands fa-youtube"></i>
                <i class="fa-brands fa-whatsapp"></i>
                <i class="fa-solid fa-globe"></i>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>

    <!-- SECTION 6: PARTNERS & SLOGANS MARQUEE -->
    <section class="site-section partners-section">
      <div class="container">
        <div class="section-header text-center">
          <span class="section-tag-badge">شركائنا</span>
          <h2 class="section-title text-center">
            شراكات استراتيجية تمتد عبر القطاعات، تُجسد الثقة، وتفتح آفاق المستقبل
          </h2>
        </div>

        <div class="partners-logos-grid">
          <div class="p-logo"><i class="fa-brands fa-google"></i> Google</div>
          <div class="p-logo"><i class="fa-brands fa-youtube"></i> YouTube</div>
          <div class="p-logo"><i class="fa-brands fa-linkedin"></i> LinkedIn</div>
          <div class="p-logo"><i class="fa-brands fa-tiktok"></i> TikTok</div>
          <div class="p-logo"><i class="fa-brands fa-snapchat"></i> Snapchat</div>
          <div class="p-logo"><i class="fa-solid fa-layer-group"></i> MICS</div>
          <div class="p-logo"><i class="fa-solid fa-cube"></i> CIPHER</div>
          <div class="p-logo"><i class="fa-solid fa-feather-pointed"></i> TOUCH</div>
        </div>

        <div class="brand-slogans-marquee-wrap">
          <div class="slogans-marquee-track">
            <span class="s-light">نبحث عن الفرص</span>
            <span class="s-bold">نبتكر الحلول</span>
            <span class="s-light">حضور واضح و تأثير مستدام</span>
            <span class="s-bold">نستكشف الآفاق</span>
            <span class="s-light">حلول إنتاجية متكاملة</span>
            <span class="s-light">• نبحث عن الفرص</span>
            <span class="s-bold">نبتكر الحلول</span>
            <span class="s-light">حضور واضح و تأثير مستدام</span>
            <span class="s-bold">نستكشف الآفاق</span>
            <span class="s-light">حلول إنتاجية متكاملة</span>
          </div>
        </div>

      </div>
    </section>

    <!-- SECTION 7: PORTFOLIO -->
    <section id="projects" class="site-section portfolio-section">
      <div class="container">
        <div class="section-header">
          <span class="section-tag-badge">من أعـمــــالنا</span>
          <h2 class="section-title">
            نحـول الأفكـار إلى قصص نجـاح حقيقيـة
          </h2>
        </div>

        <div class="portfolio-grid">
          <div class="portfolio-card video-trigger-btn" data-video-id="pQ1bHDVsmc4" role="button">
            <div class="portfolio-thumb-wrap">
              <div class="portfolio-overlay">
                <div class="play-icon-badge"><i class="fa-solid fa-play"></i></div>
              </div>
              <div class="portfolio-bg-placeholder bg-p1"></div>
            </div>
            <div class="portfolio-info">
              <span class="portfolio-client">الهيئة العامة للعقار</span>
              <h3 class="portfolio-title">حملة التعريف بالتشريعات العقارية الجديدة</h3>
            </div>
          </div>

          <div class="portfolio-card video-trigger-btn" data-video-id="4-1RcR1PgrU" role="button">
            <div class="portfolio-thumb-wrap">
              <div class="portfolio-overlay">
                <div class="play-icon-badge"><i class="fa-solid fa-play"></i></div>
              </div>
              <div class="portfolio-bg-placeholder bg-p2"></div>
            </div>
            <div class="portfolio-info">
              <span class="portfolio-client">طموح - منشآت</span>
              <h3 class="portfolio-title">تغطيات وإدارة المراكز الإعلامية لملتقى منشآت</h3>
            </div>
          </div>

          <div class="portfolio-card video-trigger-btn" data-video-id="pQ1bHDVsmc4" role="button">
            <div class="portfolio-thumb-wrap">
              <div class="portfolio-overlay">
                <div class="play-icon-badge"><i class="fa-solid fa-play"></i></div>
              </div>
              <div class="portfolio-bg-placeholder bg-p3"></div>
            </div>
            <div class="portfolio-info">
              <span class="portfolio-client">الاتحاد السعودي لكرة القدم</span>
              <h3 class="portfolio-title">من بدينا ولعبنا جد - إنتاج وتسويق مرئي</h3>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION 8: BLOG ARTICLES -->
    <section id="blog" class="site-section blog-section">
      <div class="container">
        <div class="section-header">
          <span class="section-tag-badge">المدونة</span>
          <h2 class="section-title">
            رؤى وأفكار في صناعة الاتصال الرقمي
          </h2>
        </div>

        <div class="blog-grid">
          <article class="blog-card">
            <div class="blog-meta">
              <span class="blog-author"><i class="fa-regular fa-user"></i> TREND</span>
              <span class="blog-date"><i class="fa-regular fa-calendar"></i> 27 يوليو 2026</span>
            </div>
            <h3 class="blog-title"><a href="#">هل انتهى عصر «الجمهور» وبدأ عصر «المجتمع»؟</a></h3>
            <p class="blog-excerpt">دراسة تحليليّة لكيفيّة تحول الاستراتيجيات التسويقيّة والاتصاليّة من مخاطبة الجمهور العام إلى بناء مجتمعات رقميّة مترابطة.</p>
            <a href="#" class="blog-read-more">اقرأ المقال <i class="fa-solid fa-arrow-left"></i></a>
          </article>

          <article class="blog-card">
            <div class="blog-meta">
              <span class="blog-author"><i class="fa-regular fa-user"></i> TREND</span>
              <span class="blog-date"><i class="fa-regular fa-calendar"></i> 19 يوليو 2026</span>
            </div>
            <h3 class="blog-title"><a href="#">ثقل الأثر.. لماذا تموت الأرقام وتعيش اللحظة؟</a></h3>
            <p class="blog-excerpt">كيف نصنع محتوى عاطفيًا ومؤثرًا يترسخ في ذاكرة المتابعين متجاوزًا لغة الأرقام والمشاهدات السطحية.</p>
            <a href="#" class="blog-read-more">اقرأ المقال <i class="fa-solid fa-arrow-left"></i></a>
          </article>

          <article class="blog-card">
            <div class="blog-meta">
              <span class="blog-author"><i class="fa-regular fa-user"></i> TREND</span>
              <span class="blog-date"><i class="fa-regular fa-calendar"></i> 12 يوليو 2026</span>
            </div>
            <h3 class="blog-title"><a href="#">صحافة "خيالية".. عندما تكتب عن التنانين بجدية!</a></h3>
            <p class="blog-excerpt">قراءة في أساليب السرد القصصي وصناعة المحتوى الترفيهي التفاعلي وتوظيف السرد البصري الحديث.</p>
            <a href="#" class="blog-read-more">اقرأ المقال <i class="fa-solid fa-arrow-left"></i></a>
          </article>
        </div>
      </div>
    </section>

    <!-- SECTION 9: CTA BANNER -->
    <section id="contact" class="site-section cta-banner-section">
      <div class="container">
        <div class="cta-banner-card">
          <div class="cta-banner-content">
            <h2 class="cta-banner-title">
              في Trend.. نخلق الفرص، نبتكر الحلول، ونسابق التحولات..
            </h2>
            <p class="cta-banner-sub">
              جاهز للارتقاء بحضورك الرقمي وإطلاق حملتك القادمة مع فريقنا الخبير؟
            </p>
            <a href="https://wa.me/920032032" target="_blank" class="btn-global btn-large-cta">
              <div class="btn-global-icon"><i class="fa-solid fa-phone"></i></div>
              <span class="btn-global-text">تواصل معنا الآن</span>
            </a>
          </div>
        </div>
      </div>
    </section>

  </main>

  <!-- SECTION 10: FOOTER -->
  <footer id="section-252-12" class="ct-section main-footer-holder">
    <div class="container footer-container">
      <div class="footer-top-grid">
        <div class="footer-col brand-col">
          <a href="#" class="footer-logo">
            <img src="https://trenddc.com/wp-content/uploads/2025/03/rend-new-logo-r088nhh5j04hd8piy1u4rtunmb2x5oy2jo1oduuwgq.png" alt="Trend Logo" />
          </a>
          <h3 class="footer-slogan">لتَظهر بوضوح</h3>
          <p class="footer-desc">نواكب التطور في قطاع الإعلام والاتصال الرقمي، نتبنى طموح عملائنا من التخطيط إلى الإنجاز.</p>
        </div>

        <div class="footer-col">
          <h4 class="footer-col-title">روابط سريعة</h4>
          <ul class="footer-links-list">
            <li><a href="#about">من نحن</a></li>
            <li><a href="#services">خدماتنا</a></li>
            <li><a href="#services">إدارة السمعة</a></li>
            <li><a href="#blog">المدونة</a></li>
            <li><a href="#projects">ستوديو Trend</a></li>
          </ul>
        </div>

        <div class="footer-col">
          <h4 class="footer-col-title">الانضمام إلينا</h4>
          <ul class="footer-links-list">
            <li><a href="#">التوظيف</a></li>
            <li><a href="#">التدريب التعاوني</a></li>
            <li><a href="#contact">اتصل بنا</a></li>
          </ul>
        </div>

        <div class="footer-col contact-col">
          <h4 class="footer-col-title">العنوان والتواصل</h4>
          <p class="footer-contact-item">
            <i class="fa-solid fa-location-dot"></i>
            المملكة العربية السعودية - الرياض - حي الصحافة - شارع الأمير ناصر بن سعود بن فرحان آل سعود
          </p>
          <p class="footer-contact-item">
            <i class="fa-solid fa-envelope"></i>
            <a href="mailto:bd@trenddc.com">bd@trenddc.com</a>
          </p>
          <p class="footer-contact-item">
            <i class="fa-solid fa-phone"></i>
            <a href="tel:920032032">920032032</a>
          </p>

          <div class="footer-social-icons">
            <a href="https://www.facebook.com/Trend1DC" target="_blank" aria-label="Facebook"><i class="fa-brands fa-facebook-f"></i></a>
            <a href="https://www.instagram.com/trend1dc/" target="_blank" aria-label="Instagram"><i class="fa-brands fa-instagram"></i></a>
            <a href="https://x.com/Trend1DC" target="_blank" aria-label="X"><i class="fa-brands fa-x-twitter"></i></a>
            <a href="https://www.linkedin.com/company/trend1dc" target="_blank" aria-label="LinkedIn"><i class="fa-brands fa-linkedin-in"></i></a>
            <a href="https://www.youtube.com/@trenddc" target="_blank" aria-label="YouTube"><i class="fa-brands fa-youtube"></i></a>
          </div>
        </div>
      </div>

      <div class="footer-bottom-bar">
        <p>© TREND جميع الحقوق محفوظة 2025</p>
        <p>Powered by Trend'tech</p>
      </div>
    </div>
  </footer>

  <!-- Video Popup Modal -->
  <div id="oxy-custom-video-popup" class="video-popup" style="display:none;">
    <div class="video-popup-content">
      <span class="close-popup" id="closeVideoBtn">&times;</span>
      <div class="video-container">
        <div id="video-frame">
          <iframe id="popupIframe" width="100%" height="100%" frameborder="0" allowfullscreen allow="autoplay"></iframe>
        </div>
      </div>
    </div>
  </div>
`;

/* Complete Interactivity & Animations Handlers */
document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector<HTMLElement>('#_header-238-12');
  const videoPopup = document.querySelector<HTMLElement>('#oxy-custom-video-popup');
  const popupIframe = document.querySelector<HTMLIFrameElement>('#popupIframe');
  const closeVideoBtn = document.querySelector<HTMLElement>('#closeVideoBtn');
  const mobileToggle = document.querySelector<HTMLButtonElement>('#mobileMenuToggle');
  const menuContainer = document.querySelector<HTMLElement>('.header-main-menu');

  // 1. Scroll-driven Sticky Header Animation
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header?.classList.add('oxy-sticky-header-active');
    } else {
      header?.classList.remove('oxy-sticky-header-active');
    }
  });

  // 2. Mobile Nav Drawer Toggle
  mobileToggle?.addEventListener('click', () => {
    menuContainer?.classList.toggle('active');
  });

  // 3. Interactive Video Popup Triggers
  const videoBtns = document.querySelectorAll<HTMLElement>('.video-trigger-btn');
  videoBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const videoId = btn.getAttribute('data-video-id') || 'pQ1bHDVsmc4';
      if (popupIframe) {
        popupIframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
      }
      if (videoPopup) {
        videoPopup.style.display = 'flex';
      }
    });
  });

  // 4. Modal Dismissal
  const closePopup = () => {
    if (videoPopup) videoPopup.style.display = 'none';
    if (popupIframe) popupIframe.src = '';
  };

  closeVideoBtn?.addEventListener('click', closePopup);
  videoPopup?.addEventListener('click', (e) => {
    if (e.target === videoPopup) closePopup();
  });

  // 5. Smooth Scroll Navigation for Anchor Links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = anchor.getAttribute('href');
      if (targetId && targetId !== '#') {
        const targetEl = document.querySelector(targetId);
        if (targetEl) {
          e.preventDefault();
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });
});
