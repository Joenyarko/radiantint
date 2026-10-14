/**
 * Radiant Trust International (RTI Ghana)
 * Main JavaScript Controller
 * Controls: Africa Map Photo Switcher, Modals, Drawer, Counters & Copy Actions
 */

document.addEventListener('DOMContentLoaded', () => {

  // ===================================================================
  // 1. AFRICA MAP IMAGE SWITCHER & AUTO-CYCLE (Hero Section)
  // ===================================================================
  const mapButtons = document.querySelectorAll('.map-tab-btn');
  const mapImages = document.querySelectorAll('.africa-slide-img');
  let currentMapIndex = 0;
  let mapTimer = null;

  function switchMapImage(index) {
    if (mapImages.length === 0) return;
    currentMapIndex = index % mapImages.length;

    // Toggle active image inside Africa SVG clipPath
    mapImages.forEach((img, i) => {
      if (i === currentMapIndex) {
        img.classList.add('active');
      } else {
        img.classList.remove('active');
      }
    });

    // Toggle active tab button
    mapButtons.forEach((btn, i) => {
      if (i === currentMapIndex) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  // Click on map tab buttons
  mapButtons.forEach((btn, idx) => {
    btn.addEventListener('click', () => {
      switchMapImage(idx);
      resetMapTimer();
    });
  });

  function startMapTimer() {
    mapTimer = setInterval(() => {
      switchMapImage(currentMapIndex + 1);
    }, 5500); // Transitions every 5.5s
  }

  function resetMapTimer() {
    clearInterval(mapTimer);
    startMapTimer();
  }

  if (mapImages.length > 0) {
    startMapTimer();
  }

  // ===================================================================
  // 2. DONATION MODAL (MoMo, Bank Routing, Copy)
  // ===================================================================
  const donateModal = document.getElementById('donateModal');
  const modalClose = document.getElementById('modalClose');
  const openDonateButtons = document.querySelectorAll('[data-open-donate="true"]');

  function openModal() {
    if (donateModal) {
      donateModal.classList.add('open');
      donateModal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeModal() {
    if (donateModal) {
      donateModal.classList.remove('open');
      donateModal.setAttribute('aria-hidden', 'true');
      if (!volunteerModal?.classList.contains('open')) {
        document.body.style.overflow = '';
      }
    }
  }

  openDonateButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      closeDrawer();
      openModal();
    });
  });

  modalClose?.addEventListener('click', closeModal);

  donateModal?.addEventListener('click', (e) => {
    if (e.target === donateModal) {
      closeModal();
    }
  });

  // ===================================================================
  // 2B. VOLUNTEER POPUP MODAL (Form Popup When Volunteer is Clicked)
  // ===================================================================
  const volunteerModal = document.getElementById('volunteerModal');
  const volunteerModalClose = document.getElementById('volunteerModalClose');
  const openVolunteerButtons = document.querySelectorAll('[data-open-volunteer="true"], a[href="#volunteer"], .btn-volunteer');

  function openVolunteerModal() {
    if (volunteerModal) {
      volunteerModal.classList.add('open');
      volunteerModal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeVolunteerModal() {
    if (volunteerModal) {
      volunteerModal.classList.remove('open');
      volunteerModal.setAttribute('aria-hidden', 'true');
      if (!donateModal?.classList.contains('open')) {
        document.body.style.overflow = '';
      }
    }
  }

  openVolunteerButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      closeDrawer();
      openVolunteerModal();
    });
  });

  volunteerModalClose?.addEventListener('click', closeVolunteerModal);

  volunteerModal?.addEventListener('click', (e) => {
    if (e.target === volunteerModal) {
      closeVolunteerModal();
    }
  });

  // Global Escape key listener for all open modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (donateModal?.classList.contains('open')) closeModal();
      if (volunteerModal?.classList.contains('open')) closeVolunteerModal();
    }
  });

  // Volunteer Form Submission Handler
  const volunteerForm = document.getElementById('volunteerForm');
  const volunteerSuccessBox = document.getElementById('volunteerSuccessBox');
  const volSubmitBtn = document.getElementById('volSubmitBtn');

  volunteerForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (volSubmitBtn) {
      volSubmitBtn.disabled = true;
      volSubmitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting Application...';
    }

    setTimeout(() => {
      if (volSubmitBtn) {
        volSubmitBtn.disabled = false;
        volSubmitBtn.innerHTML = 'Submit Volunteer Application';
        volSubmitBtn.style.display = 'none';
      }
      if (volunteerSuccessBox) {
        volunteerSuccessBox.style.display = 'flex';
      }

      // Automatically reset form and close modal after 4 seconds
      setTimeout(() => {
        volunteerForm.reset();
        if (volunteerSuccessBox) volunteerSuccessBox.style.display = 'none';
        if (volSubmitBtn) volSubmitBtn.style.display = 'flex';
        closeVolunteerModal();
      }, 4000);
    }, 600);
  });

  // Copy MoMo Number to Clipboard
  const copyButtons = document.querySelectorAll('.copy-btn');
  copyButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const textToCopy = btn.getAttribute('data-copy');
      if (textToCopy) {
        navigator.clipboard.writeText(textToCopy).then(() => {
          const originalHtml = btn.innerHTML;
          btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
          btn.style.background = '#10b981';
          setTimeout(() => {
            btn.innerHTML = originalHtml;
            btn.style.background = '';
          }, 2000);
        });
      }
    });
  });

  // ===================================================================
  // 3. MOBILE MENU DRAWER (Cross-Page Compatibility)
  // ===================================================================
  const mobileToggle = document.getElementById('mobileToggle');
  const mobileDrawer = document.getElementById('mobileDrawer');
  const drawerClose = document.getElementById('drawerClose');
  const mobileOverlay = document.getElementById('mobileOverlay') || document.getElementById('drawerOverlay') || document.querySelector('.mobile-overlay, .drawer-overlay');

  function openDrawer() {
    mobileDrawer?.classList.add('open');
    mobileOverlay?.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    mobileDrawer?.classList.remove('open');
    mobileOverlay?.classList.remove('open');
    if (!donateModal?.classList.contains('open') && !volunteerModal?.classList.contains('open')) {
      document.body.style.overflow = '';
    }
  }

  mobileToggle?.addEventListener('click', openDrawer);
  drawerClose?.addEventListener('click', closeDrawer);
  mobileOverlay?.addEventListener('click', closeDrawer);

  document.querySelectorAll('.drawer-link').forEach(link => {
    link.addEventListener('click', closeDrawer);
  });

  // ===================================================================
  // 4. STATS COUNTER ANIMATION
  // ===================================================================
  const counters = document.querySelectorAll('.counter');
  let countersAnimated = false;

  function runCounters() {
    counters.forEach(counter => {
      const target = parseInt(counter.getAttribute('data-target'), 10);
      if (isNaN(target)) return;

      const duration = 1600; // ms
      const stepTime = 25;
      const totalSteps = duration / stepTime;
      const increment = target / totalSteps;
      let current = 0;

      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          counter.textContent = target;
          clearInterval(timer);
        } else {
          counter.textContent = Math.floor(current);
        }
      }, stepTime);
    });
  }

  // IntersectionObserver for Counters
  if (counters.length > 0) {
    const statsObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !countersAnimated) {
          countersAnimated = true;
          runCounters();
        }
      });
    }, { threshold: 0.2 });

    const statsRow = document.querySelector('.hero-stats-row');
    if (statsRow) statsObserver.observe(statsRow);
  }

  // ===================================================================
  // 5. STICKY HEADER SCROLL EFFECT
  // ===================================================================
  const siteHeader = document.getElementById('siteHeader');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      siteHeader?.style.setProperty('box-shadow', '0 8px 24px rgba(0, 0, 0, 0.08)');
    } else {
      siteHeader?.style.removeProperty('box-shadow');
    }
  });

  // ===================================================================
  // 6. NEWSLETTER FORM HANDLER
  // ===================================================================
  const newsletterForm = document.getElementById('footerNewsletterForm');
  newsletterForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = newsletterForm.querySelector('input');
    if (input && input.value) {
      alert('Thank you for subscribing to the Radiant Trust field bulletin!');
      input.value = '';
    }
  });

  // ===================================================================
  // 7. FOUR CORE PILLARS EXPANDING ACCORDION (For index.html)
  // ===================================================================
  const pillarCards = document.querySelectorAll('.pillar-acc-card');
  pillarCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      if (window.innerWidth > 992) {
        pillarCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
      }
    });
    card.addEventListener('click', (e) => {
      if (e.target.closest('a, button')) return;
      pillarCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
    });
  });

  // ===================================================================
  // 8. SCROLL REVEAL ANIMATIONS (Home & Subpages)
  // ===================================================================
  const revealElements = document.querySelectorAll('.reveal-up, .reveal-fade, .section-header, .stat-item, .team-card, .value-feature-card, .activity-card, .cta-banner-card');
  
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px'
    });

    revealElements.forEach(el => {
      el.classList.add('reveal-ready');
      revealObserver.observe(el);
    });
  } else {
    revealElements.forEach(el => el.classList.add('revealed'));
  }

  // ===================================================================
  // 9. AUTO-FOCUS ON CEO IN MOBILE VIEW (Team Perspective Carousel)
  // ===================================================================
  function centerCeoCardOnMobile() {
    if (window.innerWidth <= 992) {
      const containers = document.querySelectorAll('.team-perspective-container');
      containers.forEach(container => {
        const ceoCard = container.querySelector('.depth-ceo');
        if (ceoCard) {
          const cardCenter = ceoCard.offsetLeft + (ceoCard.offsetWidth / 2);
          const containerCenter = container.clientWidth / 2;
          container.scrollTo({
            left: Math.max(0, cardCenter - containerCenter),
            behavior: 'auto'
          });
        }
      });
    }
  }

  // Focus immediately and again after fonts/images render
  centerCeoCardOnMobile();
  window.addEventListener('load', centerCeoCardOnMobile);
  window.addEventListener('resize', centerCeoCardOnMobile);

});


