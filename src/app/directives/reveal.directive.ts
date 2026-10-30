import { Directive, ElementRef, OnDestroy, OnInit, inject, input } from '@angular/core';

/**
 * Fades/rises an element in the first time it scrolls into view. CSS lives in styles.css
 * (.reveal / .reveal.is-visible) and is disabled under prefers-reduced-motion. Elements are
 * revealed immediately where IntersectionObserver isn't available, so nothing stays hidden.
 */
@Directive({
  selector: '[appReveal]',
  standalone: true,
  host: { class: 'reveal' }
})
export class RevealDirective implements OnInit, OnDestroy {
  /** Optional stagger, in ms. */
  revealDelay = input<number>(0);

  private el = inject(ElementRef<HTMLElement>);
  private observer?: IntersectionObserver;

  ngOnInit() {
    const node = this.el.nativeElement;
    node.style.transitionDelay = `${this.revealDelay()}ms`;
    if (typeof IntersectionObserver === 'undefined') {
      node.classList.add('is-visible');
      return;
    }
    this.observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          node.classList.add('is-visible');
          this.observer?.disconnect();
        }
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    this.observer.observe(node);
  }

  ngOnDestroy() {
    this.observer?.disconnect();
  }
}
