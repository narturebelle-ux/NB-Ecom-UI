import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

const SITE_URL = 'https://www.narturebelle.com';

/**
 * Sets the search metadata along with the page title. A route with `data.description` is public: it gets
 * that description and a canonical URL. Any other route (signed-in pages, retired pages) is marked noindex.
 */
@Injectable()
export class SeoTitleStrategy extends TitleStrategy {
  private title = inject(Title);
  private meta = inject(Meta);
  private document = inject(DOCUMENT);

  override updateTitle(state: RouterStateSnapshot): void {
    const title = this.buildTitle(state);
    if (title) this.title.setTitle(title);

    let route = state.root;
    while (route.firstChild) route = route.firstChild;
    const description: string | undefined = route.data['description'];

    if (description) {
      this.meta.updateTag({ name: 'description', content: description });
      this.meta.removeTag('name="robots"');
      this.setCanonical(SITE_URL + state.url.split(/[?#]/)[0]);
    } else {
      this.meta.updateTag({ name: 'robots', content: 'noindex' });
      this.setCanonical(null);
    }
  }

  private setCanonical(url: string | null): void {
    let link = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!url) {
      link?.remove();
      return;
    }
    if (!link) {
      link = this.document.createElement('link');
      link.rel = 'canonical';
      this.document.head.appendChild(link);
    }
    link.href = url;
  }
}
