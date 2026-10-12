import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  template: `
    <footer class="main-footer">
      <!-- Newsletter / Lead Magnet Strip -->
      <div class="footer-cta-strip">
        <div class="container cta-content">
          <div class="cta-text">
            <h3>Join 25,000+ Expecting Mothers Across India</h3>
            <p>Get weekly doctor-reviewed trimester guides, scan test reminders, and 10% off your first mandatory care package.</p>
          </div>
          <div class="cta-form">
            <input type="email" placeholder="Enter your email address" class="cta-input" />
            <button class="btn btn-gold btn-sm">Subscribe & Get Guide</button>
          </div>
        </div>
      </div>

      <div class="container footer-grid">
        <!-- Col 1: Brand Story -->
        <div class="footer-col brand-col">
          <div class="footer-brand">
            <span class="brand-leaf">🌿</span>
            <span class="brand-name">NartureBelle™</span>
          </div>
          <p class="brand-mission">
            Your partner in conscious motherhood. We provide radical transparency on what pregnant mothers genuinely need vs. what to skip, paired with certified nurse care and doctor guidance.
          </p>
          <div class="trust-pill">
            <span>🛡️</span> 100% Doctor Vetted & Toxins-Free Formulations
          </div>
        </div>

        <!-- Col 2: Pregnancy Stages -->
        <div class="footer-col">
          <h4 class="col-title">Pregnancy Milestones</h4>
          <ul class="footer-links">
            <li><a routerLink="/products/month-3">Month 3: 1st Trimester Essentials</a></li>
            <li><a routerLink="/products/month-6">Month 6: 2nd Trimester & Sleep</a></li>
            <li><a routerLink="/products/month-9">Month 9: Hospital Bag & Delivery</a></li>
            <li><a routerLink="/checklists">Doctor Checkup & Scan Checklist</a></li>
            <li><span class="coming-soon">Baby Care 0–5 Years (Coming Soon)</span></li>
          </ul>
        </div>

        <!-- Col 3: Dedicated Healthcare Services -->
        <div class="footer-col">
          <h4 class="col-title">Maternal Services</h4>
          <ul class="footer-links">
            <li><a routerLink="/services/nurse-companion">Dedicated Care Nurse ("Maa Sakhi")</a></li>
            <li><a routerLink="/doctors-live">Live OB-GYN Webinars & Q&As</a></li>
            <li><a routerLink="/checklists">Accredited Maternity Hospitals</a></li>
            <li><a routerLink="/checklists">Fetal Scan Labs & 4D Anomaly Scans</a></li>
            <li><a routerLink="/auth/login">My Routine & Due Date Tracker</a></li>
          </ul>
        </div>

        <!-- Col 4: Clinical Helpline & Contact -->
        <div class="footer-col">
          <h4 class="col-title">Maternal Support</h4>
          <p class="support-text">Have a question regarding safe pregnancy ingredients or our nurse care companion?</p>
          <div class="contact-card">
            <div class="contact-item">
              <span class="icon">💬</span>
              <div>
                <strong>WhatsApp Care Desk:</strong>
                <span>+91 99880 12345</span>
              </div>
            </div>
            <div class="contact-item">
              <span class="icon">✉️</span>
              <div>
                <strong>Care Team:</strong>
                <span>care&#64;narturebelle.com</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Legal & Disclaimer -->
      <div class="container footer-bottom">
        <div class="disclaimer-box">
          <p>
            <strong>Medical Disclaimer:</strong> Information and products presented on NartureBelle™ are intended for supportive maternal wellness and educational guidance. They do not substitute for emergency medical care or direct clinical instructions from your registered obstetrician. Always consult your personal doctor regarding high-risk medical conditions.
          </p>
        </div>
        <div class="bottom-links">
          <span>&copy; {{ currentYear }} NartureBelle Technologies Pvt Ltd. All rights reserved.</span>
          <div class="legal-anchors">
            <a href="#">Privacy Policy</a>
            <span>•</span>
            <a href="#">Terms of Service</a>
            <span>•</span>
            <a href="#">Shipping & Returns</a>
          </div>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    .main-footer {
      background-color: var(--sage-900);
      color: #e2ede6;
      margin-top: 5rem;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }
    .footer-cta-strip {
      background: linear-gradient(135deg, #254434, #1b3327);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding: 2.5rem 0;
    }
    .cta-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 2rem;
      flex-wrap: wrap;
    }
    .cta-text h3 {
      font-size: 1.5rem;
      color: #fff;
      margin-bottom: 0.35rem;
    }
    .cta-text p {
      color: #cfe0d5;
      font-size: 0.95rem;
    }
    .cta-form {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .cta-input {
      padding: 0.75rem 1.25rem;
      border-radius: var(--radius-full);
      border: 1px solid rgba(255, 255, 255, 0.2);
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
      font-size: 0.95rem;
      min-width: 280px;
    }
    .cta-input::placeholder {
      color: #a4b8ac;
    }
    .cta-input:focus {
      outline: none;
      background: rgba(255, 255, 255, 0.2);
      border-color: #fff;
    }

    .footer-grid {
      display: grid;
      grid-template-columns: 1.4fr 1fr 1fr 1.2fr;
      gap: 2.5rem;
      padding-top: 4rem;
      padding-bottom: 3rem;
    }
    .brand-col .footer-brand {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-family: var(--font-serif);
      font-size: 1.5rem;
      color: #fff;
      font-weight: 700;
      margin-bottom: 1rem;
    }
    .brand-leaf {
      font-size: 1.8rem;
    }
    .brand-mission {
      font-size: 0.9rem;
      line-height: 1.6;
      color: #cfe0d5;
      margin-bottom: 1.25rem;
    }
    .trust-pill {
      background: rgba(255, 255, 255, 0.08);
      padding: 0.5rem 0.85rem;
      border-radius: var(--radius-md);
      font-size: 0.8rem;
      color: #e2ede6;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
    }

    .col-title {
      font-family: var(--font-sans);
      font-size: 1rem;
      font-weight: 700;
      color: #fff;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 1.25rem;
    }
    .footer-links {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .footer-links a {
      color: #cfe0d5;
      font-size: 0.9rem;
      transition: color var(--transition-fast);
    }
    .footer-links a:hover {
      color: #fff;
      text-decoration: underline;
    }
    .coming-soon {
      color: #8c9e94;
      font-size: 0.85rem;
      font-style: italic;
    }

    .support-text {
      font-size: 0.9rem;
      color: #cfe0d5;
      margin-bottom: 1rem;
    }
    .contact-card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: var(--radius-md);
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }
    .contact-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.85rem;
    }
    .contact-item .icon {
      font-size: 1.3rem;
    }
    .contact-item strong {
      display: block;
      color: #fff;
    }
    .contact-item span {
      color: #cfe0d5;
    }

    .footer-bottom {
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 2rem;
      padding-bottom: 2.5rem;
    }
    .disclaimer-box {
      background: rgba(0, 0, 0, 0.2);
      border-radius: var(--radius-md);
      padding: 1rem 1.25rem;
      margin-bottom: 1.5rem;
    }
    .disclaimer-box p {
      font-size: 0.78rem;
      line-height: 1.55;
      color: #a4b8ac;
    }
    .bottom-links {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.85rem;
      color: #a4b8ac;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .legal-anchors {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .legal-anchors a {
      color: #a4b8ac;
    }
    .legal-anchors a:hover {
      color: #fff;
    }

    @media (max-width: 992px) {
      .footer-grid {
        grid-template-columns: 1fr 1fr;
      }
    }
    @media (max-width: 600px) {
      .footer-grid {
        grid-template-columns: 1fr;
      }
      .cta-content {
        flex-direction: column;
        align-items: flex-start;
      }
      .cta-input {
        width: 100%;
        min-width: unset;
      }
    }
  `]
})
export class FooterComponent {
  currentYear = new Date().getFullYear();
}
