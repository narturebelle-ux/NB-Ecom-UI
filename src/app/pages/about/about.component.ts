import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

interface Person {
  name: string;
  role: string;
}

/** Public "About us": what NartureBelle is, the founder's note, and the leadership team. */
@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  template: `
    <div class="about-page">
      <section class="hero">
        <div class="container narrow">
          <span class="kicker">About us</span>
          <h1>Nurturing You, Nurturing Life</h1>
          <p class="lead">
            NartureBelle is a care-coordination platform for mothers and young families, from the first weeks of pregnancy
            through postpartum and early childhood.
          </p>
        </div>
      </section>

      <section class="container narrow story">
        <h2>Why NartureBelle</h2>
        <p>
          Pregnancy and early parenthood come with countless questions, appointments and decisions, and too often mothers are left
          to piece their care together on their own. NartureBelle brings it into one private place: a care plan that fits your
          stage, a care coordinator who speaks your language, and verified professionals who work together around you.
        </p>
        <p>
          Every professional on NartureBelle is credential-verified before they can see a single mother. Anything that touches
          your health, from the records you upload to the products we suggest, is shared only with your consent.
        </p>

        <div class="pillars">
          @for (p of pillars; track p.title) {
            <div class="pillar">
              <mat-icon>{{ p.icon }}</mat-icon>
              <strong>{{ p.title }}</strong>
              <span>{{ p.text }}</span>
            </div>
          }
        </div>
      </section>

      <section class="quote-band">
        <div class="container narrow">
          <blockquote>
            <p>“{{ founderQuote }}”</p>
            <footer>{{ founder.name }}, {{ founder.role }}</footer>
          </blockquote>
        </div>
      </section>

      <section class="container narrow team">
        <h2>Leadership</h2>
        <div class="founder card">
          <span class="avatar lg">{{ initials(founder.name) }}</span>
          <div>
            <h3>{{ founder.name }}</h3>
            <span class="role">{{ founder.role }}</span>
          </div>
        </div>

        <h2 class="sub-h">Executive Board</h2>
        <div class="people">
          @for (m of executiveBoard; track m.name) {
            <div class="person card">
              <span class="avatar">{{ initials(m.name) }}</span>
              <div><h3>{{ m.name }}</h3><span class="role">{{ m.role }}</span></div>
            </div>
          }
        </div>

        <h2 class="sub-h">Non-Executive Board</h2>
        <div class="people">
          @for (m of nonExecutiveBoard; track m.name) {
            <div class="person card">
              <span class="avatar">{{ initials(m.name) }}</span>
              <div><h3>{{ m.name }}</h3><span class="role">{{ m.role }}</span></div>
            </div>
          }
        </div>
      </section>

      <section class="container narrow cta">
        <h2>Start your care journey</h2>
        <p>Tell us where you are in your journey, and we’ll suggest a plan and introduce you to your care coordinator.</p>
        <div class="cta-row">
          <a routerLink="/auth/signup" class="btn btn-primary btn-lg">Get started</a>
          <a routerLink="/plans" class="btn btn-outline btn-lg">See care plans</a>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .about-page { padding-bottom: 5rem; }
    .narrow { max-width: 880px; }
    .hero { padding: 4rem 0 2.5rem; text-align: center; background: linear-gradient(180deg, var(--sage-50), transparent); }
    .kicker { font-size: 0.78rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--blush-700); }
    .hero h1 { font-size: clamp(2rem, 4.5vw, 3rem); color: var(--sage-900); margin: 0.6rem 0; }
    .lead { font-size: 1.1rem; color: var(--text-secondary); max-width: 640px; margin: 0 auto; line-height: 1.6; }
    h2 { font-size: 1.5rem; color: var(--sage-900); margin-bottom: 0.8rem; }
    .story { padding-top: 2rem; }
    .story p { color: var(--text-secondary); line-height: 1.75; margin-bottom: 1rem; }
    .pillars { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 1rem; margin-top: 1.75rem; }
    .pillar { display: flex; flex-direction: column; gap: 0.35rem; padding: 1.1rem; border-radius: var(--radius-lg, 14px); background: #fff; border: 1px solid var(--border-light); }
    .pillar mat-icon { color: var(--sage-700); }
    .pillar strong { color: var(--sage-900); }
    .pillar span { font-size: 0.86rem; color: var(--text-secondary); line-height: 1.5; }
    .quote-band { margin: 3rem 0; padding: 3rem 0; background: var(--sage-900); }
    blockquote { margin: 0; text-align: center; }
    blockquote p { font-family: var(--font-serif); font-size: clamp(1.25rem, 2.6vw, 1.7rem); line-height: 1.5; color: #fff; font-style: italic; }
    blockquote footer { margin-top: 1rem; font-size: 0.9rem; color: rgba(255, 255, 255, 0.75); font-weight: 600; }
    .card { border-radius: var(--radius-lg, 14px); background: #fff; border: 1px solid var(--border-light); }
    .founder { display: flex; gap: 1.25rem; align-items: center; padding: 1.4rem 1.5rem; margin-bottom: 2rem; }
    .founder h3 { font-size: 1.3rem; color: var(--sage-900); }
    .sub-h { font-size: 1.15rem; margin-top: 1.5rem; }
    .people { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 0.9rem; }
    .person { display: flex; gap: 0.9rem; align-items: center; padding: 1rem 1.1rem; }
    .person h3 { font-size: 1rem; color: var(--sage-900); }
    .avatar { width: 48px; height: 48px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: var(--sage-700); color: #fff; font-weight: 800; letter-spacing: 0.03em; }
    .avatar.lg { width: 72px; height: 72px; font-size: 1.4rem; }
    .role { display: block; font-size: 0.82rem; font-weight: 700; color: var(--blush-700); margin-top: 0.15rem; }
    .cta { text-align: center; margin-top: 3rem; }
    .cta p { color: var(--text-secondary); margin-bottom: 1.2rem; }
    .cta-row { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }
    @media (max-width: 560px) { .founder { flex-direction: column; text-align: center; } }
  `]
})
export class AboutComponent {
  founder: Person = {
    name: 'Kumbam VijayvenkatReddy',
    role: 'Founder & CEO'
  };

  /** Draft for the founder's approval. */
  founderQuote =
    'Every mother deserves care that knows her: her stage, her language and her story. We built NartureBelle so that no mother has to find her way through pregnancy and early parenthood alone.';

  executiveBoard: Person[] = [
    { name: 'Kumbam RajaRajeshReddy', role: 'Executive Board Member' },
    { name: 'Balnagar JayaLaxmi', role: 'Executive Board Member' },
    { name: 'Veerlapati Manoj', role: 'Executive Board Member' },
    { name: 'BusiReddy Subba Reddy', role: 'Executive Board Member' }
  ];

  nonExecutiveBoard: Person[] = [
    { name: 'Mitul Patel', role: 'Non-Executive Board Member' },
    { name: 'Sai Kumar', role: 'Non-Executive Board Member' },
    { name: 'Prem Kumar', role: 'Non-Executive Board Member' }
  ];

  pillars = [
    { icon: 'diversity_1', title: 'Care that fits you', text: 'A plan matched to your stage, from pregnancy to postpartum and early childhood.' },
    { icon: 'verified', title: 'Verified professionals', text: 'Gynecologists, nutritionists, lactation consultants and more, all credential-checked.' },
    { icon: 'support_agent', title: 'Your own coordinator', text: 'A named care coordinator who speaks your language and keeps your care connected.' },
    { icon: 'lock', title: 'Private by design', text: 'Your records and health details are shared only with your consent.' }
  ];

  initials(name: string): string {
    // Split on spaces and on run-together words like "VijayvenkatReddy" → V + R.
    const parts = name.replace(/([a-z])([A-Z])/g, '$1 $2').split(/\s+/).filter(Boolean);
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }
}
