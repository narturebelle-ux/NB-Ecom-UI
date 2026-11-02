import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { FeatureDirective } from '../../directives/feature.directive';
import { isProfessionalUser } from '../../models/maternal.models';
import { ApiService } from '../../services/api.service';
import { CommerceService } from '../../services/commerce.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink, MatIconModule, FeatureDirective],
  template: `
    <footer class="main-footer">
      <div class="container footer-intro">
        <div class="footer-brand">
          <img src="favicon.svg" alt="" class="brand-leaf">
          <span class="brand-name">NartureBelle™</span>
        </div>
        <p class="brand-mission">
          Care coordination for mothers and young families — from pregnancy through early childhood, with verified professionals and records you control.
        </p>
        <div class="trust-pill">
          <mat-icon class="icon-sm">verified_user</mat-icon> Credential-verified professionals
        </div>
      </div>

      <div class="container footer-grid">
        @if (!isProfessional()) {
          <div class="footer-col">
            <h4 class="col-title">For Mothers</h4>
            <ul class="footer-links">
              <li><a routerLink="/journey">My Journey</a></li>
              <li><a routerLink="/plans">Care Plans</a></li>
              <li><a routerLink="/care">Find a Professional</a></li>
              <li><a routerLink="/checklists">Checkup & Scan Checklist</a></li>
              <li><a routerLink="/checklists">Maternity Hospitals & Scan Labs</a></li>
              <li *appFeature="'recordsVault'"><a routerLink="/records">Records Vault</a></li>
              <li *appFeature="'childTracker'"><a routerLink="/child">Child & Vaccinations</a></li>
              <li *appFeature="'productRecommendations'"><a routerLink="/recommendations">Recommended for you</a></li>
              <li *appFeature="'joyCircle'"><a routerLink="/joy-circle">Joy Circle events</a></li>
              <li *appFeature="'legacyLeadForms'"><a routerLink="/services/nurse-companion">Dedicated Care Nurse ("Maa Sakhi")</a></li>
              <li *appFeature="'legacyLeadForms'"><a routerLink="/doctors-live">Live OB-GYN Webinars & Q&As</a></li>
              @if (commerce.canShareIdeas()) { <li><a routerLink="/ideas">Share an Idea</a></li> }
              <li><a routerLink="/invite">Refer &amp; Invite</a></li>
              <li><a routerLink="/profile">Profile & Privacy</a></li>
            </ul>
          </div>
        }

        <div class="footer-col">
          <h4 class="col-title">For Professionals</h4>
          <ul class="footer-links">
            @if (isProfessional()) {
              <li><a routerLink="/provider">Dashboard</a></li>
              <li><a routerLink="/provider/availability">Availability and services</a></li>
              <li><a routerLink="/provider/earnings">Earnings</a></li>
              <li><a routerLink="/provider/profile">Profile and documents</a></li>
            } @else {
              <li><a routerLink="/provider/join">Join as a professional</a></li>
              <li><a routerLink="/provider/join" fragment="how">Our process</a></li>
            }
          </ul>
        </div>

        <div class="footer-col">
          <h4 class="col-title">General</h4>
          <ul class="footer-links">
            <li><a routerLink="/about">About us</a></li>
            <li><a routerLink="/careers">Careers</a></li>
          </ul>
        </div>

        <div class="footer-col">
          <h4 class="col-title">Support & Care</h4>
          <p class="support-text">Questions about your plan, a booking or your privacy? Our care team is here to help.</p>
          <div class="contact-card">
            <div class="contact-item">
              <mat-icon class="icon">chat</mat-icon>
              <div>
                <strong>WhatsApp Care Desk:</strong>
                <span>+91 99880 12345</span>
              </div>
            </div>
            <div class="contact-item">
              <mat-icon class="icon">mail</mat-icon>
              <div>
                <strong>Care Team:</strong>
                <span>support-care&#64;narturebelle.com</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Legal & Disclaimer -->
      <div class="container footer-bottom">
        <div class="disclaimer-box">
          <p>
            <strong>Medical Disclaimer:</strong> Information and guidance on NartureBelle™ supports maternal and child wellbeing and is not a diagnosis. It does not substitute for emergency medical care or direct clinical instructions from your own doctor or obstetrician. Always consult your personal doctor regarding high-risk medical conditions.
          </p>
        </div>
        <div class="bottom-links">
          <span>&copy; {{ currentYear }} NartureBelle™ Pvt Ltd. All rights reserved.</span>
          <div class="legal-anchors">
            <a href="#">Privacy Policy</a>
            <span>•</span>
            <a href="#">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    .main-footer {
      background-color: var(--solid-sage-900);
      color: #e2ede6;
      margin-top: 5rem;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }

    .footer-intro {
      padding-top: 3.5rem;
      padding-bottom: 2.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .footer-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 2.5rem;
      padding-top: 2.5rem;
      padding-bottom: 3rem;
    }
    .footer-brand {
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
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.92);
      padding: 2px;
    }
    .brand-mission {
      font-size: 0.9rem;
      line-height: 1.6;
      color: #cfe0d5;
      max-width: 640px;
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
      color: var(--text-muted);
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
      width: 1.3rem;
      height: 1.3rem;
      color: var(--solid-sage-200);
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

  `]
})
export class FooterComponent {
  commerce = inject(CommerceService);
  private api = inject(ApiService);
  isProfessional = computed(() => isProfessionalUser(this.api.currentUser()));
  currentYear = new Date().getFullYear();
}
