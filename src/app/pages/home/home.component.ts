import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, CommonModule],
  template: `
    <!-- Hero Section with Calming Maternal Aesthetics -->
    <section class="hero-section">
      <div class="container hero-container">
        <div class="hero-content">
          <div class="hero-pill">
            <span class="pill-icon">🌸</span>
            <span>Radically Honest Maternal Care</span>
          </div>
          <h1 class="hero-title">
            What You <span class="highlight-mandatory">Actually Need</span> During Pregnancy.
          </h1>
          <p class="hero-desc">
            No marketing clutter. We guide expecting mothers with doctor-vetted honesty: which products are <strong>mandatory</strong> for each month, what's purely optional, and which gimmicks to skip.
          </p>

          <div class="hero-cta-group">
            <button (click)="openAssessment()" class="btn btn-primary btn-lg">
              <span>✨</span> Take 60s Pregnancy Checkup
            </button>
            <a routerLink="/checklists" class="btn btn-outline btn-lg">
              <span>📋</span> Free Doctor Visit Checklist
            </a>
          </div>

          <div class="hero-trust-row">
            <div class="trust-item">
              <strong>100%</strong>
              <span>Toxins-Free Certified</span>
            </div>
            <div class="divider"></div>
            <div class="trust-item">
              <strong>15+</strong>
              <span>Senior OB-GYNs & Doulas</span>
            </div>
            <div class="divider"></div>
            <div class="trust-item">
              <strong>25,000+</strong>
              <span>Mothers Guided in India</span>
            </div>
          </div>
        </div>

        <!-- Hero Stage Selector Cards -->
        <div class="hero-card-column">
          <div class="stage-quick-box card glass">
            <span class="box-tag">Jump Directly To Your Stage</span>
            <h3>Where are you in your pregnancy?</h3>

            <div class="stage-link-cards">
              <a routerLink="/products/month-3" class="stage-nav-card m3-card">
                <div class="stage-badge-col">
                  <span class="s-badge">Month 3</span>
                  <span class="s-trim">1st Trimester</span>
                </div>
                <div class="stage-text-col">
                  <strong>Nausea & Early Formation</strong>
                  <p>Methylfolate, morning sickness drops, gentle care</p>
                </div>
                <span class="arrow">&rarr;</span>
              </a>

              <a routerLink="/products/month-6" class="stage-nav-card m6-card">
                <div class="stage-badge-col">
                  <span class="s-badge">Month 6</span>
                  <span class="s-trim">2nd Trimester</span>
                </div>
                <div class="stage-text-col">
                  <strong>Bump Growth & Sleep Comfort</strong>
                  <p>Body pillows, stretch mark butter, bump bands</p>
                </div>
                <span class="arrow">&rarr;</span>
              </a>

              <a routerLink="/products/month-9" class="stage-nav-card m9-card">
                <div class="stage-badge-col">
                  <span class="s-badge">Month 9</span>
                  <span class="s-trim">3rd Trimester</span>
                </div>
                <div class="stage-text-col">
                  <strong>Hospital Bag & Delivery Prep</strong>
                  <p>Pre-packed bags, perineal oil, labor prep tea</p>
                </div>
                <span class="arrow">&rarr;</span>
              </a>
            </div>

            <div class="future-baby-banner">
              <span>👶 <strong>Stage 2 Preview:</strong> Baby & Toddler Care (0–5 Years) arriving soon!</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- The 3 Pillars of NartureBelle -->
    <section class="pillars-section">
      <div class="container">
        <div class="section-header">
          <span class="tagline">Our Three Care Pillars</span>
          <h2>A Complete Ecosystem for Expecting Mothers</h2>
          <p>We blend evidence-based products, accredited local healthcare recommendations, and personal nurse handholding.</p>
        </div>

        <div class="pillars-grid">
          <!-- Pillar 1 -->
          <div class="pillar-card card">
            <div class="pillar-icon-box bg-sage">
              <span>🛍️</span>
            </div>
            <span class="pillar-num">Pillar 01</span>
            <h3>Mandatory vs. Optional Products</h3>
            <p>
              We categorize every item by clinical necessity. Know exactly what will keep you and your baby safe, what is a luxury comfort, and what is a wasteful gimmick.
            </p>
            <a routerLink="/products/month-3" class="pillar-link">Explore Stage Products &rarr;</a>
          </div>

          <!-- Pillar 2 -->
          <div class="pillar-card card">
            <div class="pillar-icon-box bg-blush">
              <span>🏥</span>
            </div>
            <span class="pillar-num">Pillar 02</span>
            <h3>Checklists & Vetted Local Hospitals</h3>
            <p>
              Never miss an essential blood test or 4D ultrasound scan. Download month-by-month doctor visit checklists and discover accredited fetal scan centers and birthing hospitals near you.
            </p>
            <a routerLink="/checklists" class="pillar-link">Find Nearby Hospitals &rarr;</a>
          </div>

          <!-- Pillar 3 -->
          <div class="pillar-card card">
            <div class="pillar-icon-box bg-gold">
              <span>👩‍⚕️</span>
            </div>
            <span class="pillar-num">Pillar 03</span>
            <h3>Dedicated Nurse Care Companion</h3>
            <p>
              Have your own certified senior female nurse on-call. Get daily WhatsApp reassurance, lab report explanations, and labor readiness coaching throughout your pregnancy.
            </p>
            <a routerLink="/services/nurse-companion" class="pillar-link">Meet "Maa Sakhi" Nurse &rarr;</a>
          </div>
        </div>
      </div>
    </section>

    <!-- Radical Honesty Comparison Strip -->
    <section class="honesty-banner-section">
      <div class="container">
        <div class="honesty-card card glass">
          <div class="honesty-text">
            <span class="badge badge-mandatory">Our Clinical Promise</span>
            <h2>Why We Openly Tell You What <em>NOT</em> To Buy</h2>
            <p>
              Typical baby and maternity brands try to sell you 40 different gadgets worth ₹50,000 before your baby is even born. At NartureBelle, our panel of Obstetricians marks non-essential gimmicks with red <strong>"Skip for Now"</strong> badges so you save your budget for what truly matters: your nutrition, sleep, and delivery safety.
            </p>
            <div class="honesty-tags">
              <span>✓ Certified Non-Toxic</span>
              <span>✓ Cochrane-Review Grounded</span>
              <span>✓ Zero Unproven Gadgets</span>
            </div>
          </div>
          <div class="honesty-stats">
            <div class="stat-box">
              <span class="stat-number">₹14,500</span>
              <span class="stat-label">Average family savings by skipping unneeded gimmicks</span>
            </div>
            <div class="stat-box">
              <span class="stat-number">100%</span>
              <span class="stat-label">Doctor-approved ingredient safety protocol</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Live Doctor Sessions Highlight -->
    <section class="live-sessions-preview">
      <div class="container">
        <div class="section-header">
          <span class="tagline">Interactive Expert Webinars</span>
          <h2>Ask Top Obstetricians & Doulas Live</h2>
          <p>Free weekly masterclasses covering nausea relief, anomaly ultrasound scans, and painless natural birth preparation.</p>
        </div>

        <div class="doctor-preview-grid">
          <div class="doctor-card card">
            <div class="doc-header">
              <img src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80" alt="Dr. Ananya Sharma" class="doc-avatar" />
              <div>
                <h4>Dr. Ananya Sharma, MD (OB-GYN)</h4>
                <span class="doc-sub">Senior Obstetrician • Cloudnine Hospital</span>
              </div>
            </div>
            <div class="doc-body">
              <span class="doc-stage-pill">Month 3 Focus</span>
              <h3>Demystifying 1st Trimester Nausea & 12-Week NT Scans</h3>
              <p>Learn what blood tests are truly mandatory and how to safely calm severe morning sickness.</p>
              <div class="doc-meta">
                <span>📅 Saturday, 5:00 PM IST</span>
                <span>👥 240 Mothers Registered</span>
              </div>
            </div>
            <div class="doc-footer">
              <a routerLink="/doctors-live" class="btn btn-primary btn-sm full-w">Reserve Free Seat</a>
            </div>
          </div>

          <div class="doctor-card card">
            <div class="doc-header">
              <img src="https://images.unsplash.com/photo-1594824813500-2921516e537c?auto=format&fit=crop&w=400&q=80" alt="Dr. Priya Ramanathan" class="doc-avatar" />
              <div>
                <h4>Dr. Priya Ramanathan, MD, DNB</h4>
                <span class="doc-sub">Fetal Medicine Specialist • Apollo Cradle</span>
              </div>
            </div>
            <div class="doc-body">
              <span class="doc-stage-pill">Month 6 Focus</span>
              <h3>Navigating Month 6: The Anomaly Scan & Pelvic Pain</h3>
              <p>Understanding Level-II ultrasound scan findings and ergonomic side-sleeping to protect placental blood flow.</p>
              <div class="doc-meta">
                <span>📅 Sunday, 11:30 AM IST</span>
                <span>👥 312 Mothers Registered</span>
              </div>
            </div>
            <div class="doc-footer">
              <a routerLink="/doctors-live" class="btn btn-primary btn-sm full-w">Reserve Free Seat</a>
            </div>
          </div>
        </div>

        <div class="text-center mt-3">
          <a routerLink="/doctors-live" class="btn btn-outline btn-lg">View Full Doctor Calendar &rarr;</a>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .hero-section {
      padding: 4.5rem 0 3.5rem 0;
      background: radial-gradient(circle at 80% 20%, rgba(235, 241, 237, 0.8) 0%, transparent 60%),
                  radial-gradient(circle at 10% 80%, rgba(253, 241, 238, 0.8) 0%, transparent 60%);
    }
    .hero-container {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 3.5rem;
      align-items: center;
    }

    .hero-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--sage-100);
      color: var(--sage-900);
      padding: 0.4rem 0.95rem;
      border-radius: var(--radius-full);
      font-size: 0.82rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 1.25rem;
    }
    .hero-title {
      font-size: 3.25rem;
      line-height: 1.15;
      color: var(--sage-900);
      margin-bottom: 1.25rem;
      letter-spacing: -0.02em;
    }
    .highlight-mandatory {
      color: var(--blush-700);
      font-style: italic;
    }
    .hero-desc {
      font-size: 1.15rem;
      color: var(--text-secondary);
      line-height: 1.6;
      margin-bottom: 2rem;
      max-width: 560px;
    }

    .hero-cta-group {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      margin-bottom: 2.5rem;
    }

    .hero-trust-row {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--border-light);
    }
    .trust-item strong {
      display: block;
      font-family: var(--font-serif);
      font-size: 1.45rem;
      color: var(--sage-900);
      line-height: 1;
    }
    .trust-item span {
      font-size: 0.82rem;
      color: var(--text-muted);
    }
    .divider {
      width: 1px;
      height: 32px;
      background: var(--border-light);
    }

    /* Stage Quick Box */
    .stage-quick-box {
      padding: 2.25rem;
      border-radius: var(--radius-xl);
      background: rgba(255, 255, 255, 0.9);
      box-shadow: var(--shadow-lg);
    }
    .box-tag {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 800;
      color: var(--blush-700);
      display: block;
      margin-bottom: 0.35rem;
    }
    .stage-quick-box h3 {
      font-size: 1.5rem;
      color: var(--sage-900);
      margin-bottom: 1.5rem;
    }
    .stage-link-cards {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      margin-bottom: 1.5rem;
    }
    .stage-nav-card {
      display: flex;
      align-items: center;
      padding: 1rem 1.25rem;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-light);
      background: #fff;
      transition: all var(--transition-fast);
      text-decoration: none;
      gap: 1rem;
    }
    .stage-nav-card:hover {
      transform: translateX(4px);
      box-shadow: var(--shadow-md);
      border-color: var(--sage-600);
    }
    .stage-badge-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 72px;
      padding-right: 0.75rem;
      border-right: 1px solid var(--border-subtle);
    }
    .s-badge {
      font-weight: 800;
      font-size: 0.95rem;
      color: var(--sage-900);
    }
    .s-trim {
      font-size: 0.68rem;
      color: var(--blush-700);
      font-weight: 700;
    }
    .stage-text-col {
      flex: 1;
    }
    .stage-text-col strong {
      display: block;
      font-size: 0.95rem;
      color: var(--sage-900);
    }
    .stage-text-col p {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-top: 0.15rem;
    }
    .arrow {
      font-size: 1.2rem;
      color: var(--sage-700);
    }

    .future-baby-banner {
      background: var(--sage-50);
      border: 1px dashed var(--sage-200);
      border-radius: var(--radius-md);
      padding: 0.75rem 1rem;
      font-size: 0.82rem;
      color: var(--sage-900);
      text-align: center;
    }

    /* Pillars Section */
    .pillars-section {
      padding: 5rem 0;
    }
    .pillars-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 2rem;
    }
    .pillar-card {
      padding: 2.25rem;
      display: flex;
      flex-direction: column;
    }
    .pillar-icon-box {
      width: 56px;
      height: 56px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.75rem;
      margin-bottom: 1.25rem;
    }
    .bg-sage { background: var(--sage-100); }
    .bg-blush { background: var(--blush-100); }
    .bg-gold { background: var(--gold-100); }

    .pillar-num {
      font-size: 0.75rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      color: var(--text-muted);
      text-transform: uppercase;
      margin-bottom: 0.35rem;
    }
    .pillar-card h3 {
      font-size: 1.35rem;
      margin-bottom: 0.75rem;
      color: var(--sage-900);
    }
    .pillar-card p {
      font-size: 0.92rem;
      color: var(--text-secondary);
      line-height: 1.6;
      margin-bottom: 1.5rem;
    }
    .pillar-link {
      margin-top: auto;
      font-weight: 700;
      font-size: 0.9rem;
      color: var(--sage-800);
    }
    .pillar-link:hover {
      color: var(--blush-700);
      text-decoration: underline;
    }

    /* Honesty Banner */
    .honesty-banner-section {
      padding: 2.5rem 0;
    }
    .honesty-card {
      padding: 3.5rem;
      display: grid;
      grid-template-columns: 1.4fr 0.8fr;
      gap: 3rem;
      align-items: center;
      background: linear-gradient(135deg, #ffffff, #faf7f2);
    }
    .honesty-text h2 {
      font-size: 2rem;
      margin: 0.75rem 0 1rem 0;
      color: var(--sage-900);
    }
    .honesty-text p {
      color: var(--text-secondary);
      line-height: 1.65;
      font-size: 1rem;
      margin-bottom: 1.25rem;
    }
    .honesty-tags {
      display: flex;
      gap: 1rem;
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--sage-800);
      flex-wrap: wrap;
    }
    .honesty-stats {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .stat-box {
      background: #fff;
      padding: 1.5rem;
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-light);
      box-shadow: var(--shadow-sm);
    }
    .stat-number {
      display: block;
      font-family: var(--font-serif);
      font-size: 2.2rem;
      font-weight: 700;
      color: var(--sage-800);
      line-height: 1.1;
    }
    .stat-label {
      font-size: 0.88rem;
      color: var(--text-muted);
      margin-top: 0.25rem;
      display: block;
    }

    /* Live Sessions Preview */
    .live-sessions-preview {
      padding: 4.5rem 0;
    }
    .doctor-preview-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
      margin-bottom: 2.5rem;
    }
    .doctor-card {
      padding: 1.75rem;
      display: flex;
      flex-direction: column;
    }
    .doc-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.25rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--border-subtle);
    }
    .doc-avatar {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid var(--sage-200);
    }
    .doc-header h4 {
      font-size: 1.05rem;
      color: var(--sage-900);
    }
    .doc-sub {
      font-size: 0.8rem;
      color: var(--text-muted);
    }
    .doc-stage-pill {
      font-size: 0.72rem;
      font-weight: 800;
      text-transform: uppercase;
      color: var(--blush-700);
      background: var(--blush-50);
      padding: 0.2rem 0.5rem;
      border-radius: var(--radius-sm);
      display: inline-block;
      margin-bottom: 0.5rem;
    }
    .doc-body h3 {
      font-size: 1.2rem;
      color: var(--sage-900);
      margin-bottom: 0.5rem;
      line-height: 1.35;
    }
    .doc-body p {
      font-size: 0.88rem;
      color: var(--text-secondary);
      margin-bottom: 1rem;
      line-height: 1.5;
    }
    .doc-meta {
      display: flex;
      justify-content: space-between;
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--text-muted);
      margin-bottom: 1.25rem;
    }
    .full-w {
      width: 100%;
    }
    .text-center {
      text-align: center;
    }
    .mt-3 {
      margin-top: 1.5rem;
    }

    @media (max-width: 992px) {
      .hero-container {
        grid-template-columns: 1fr;
      }
      .pillars-grid {
        grid-template-columns: 1fr;
      }
      .honesty-card {
        grid-template-columns: 1fr;
        padding: 2rem;
      }
      .doctor-preview-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class HomeComponent {
  api = inject(ApiService);

  openAssessment() {
    this.api.isAssessmentOpen.set(true);
  }
}
