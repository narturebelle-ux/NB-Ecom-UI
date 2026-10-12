import {
  Directive,
  Input,
  TemplateRef,
  ViewContainerRef,
  inject,
  effect
} from '@angular/core';
import { FeatureToggleService } from '../services/feature-toggle.service';
import { FeatureFlags } from '../models/feature-toggle.model';

@Directive({
  selector: '[appFeature]',
  standalone: true
})
export class FeatureDirective {
  private templateRef = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);
  private featureService = inject(FeatureToggleService);

  private featureName: keyof FeatureFlags | null = null;
  private isRendered = false;

  constructor() {
    effect(() => {
      // Re-evaluate whenever flags signal updates
      this.updateView();
    });
  }

  @Input()
  set appFeature(feature: keyof FeatureFlags) {
    this.featureName = feature;
    this.updateView();
  }

  private updateView(): void {
    if (!this.featureName) {
      this.clear();
      return;
    }

    const enabled = this.featureService.isEnabled(this.featureName);

    if (enabled && !this.isRendered) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.isRendered = true;
    } else if (!enabled && this.isRendered) {
      this.clear();
    }
  }

  private clear(): void {
    this.viewContainer.clear();
    this.isRendered = false;
  }
}
