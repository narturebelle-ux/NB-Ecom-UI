import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from './components/navbar/navbar.component';
import { FooterComponent } from './components/footer/footer.component';
import { AssessmentModalComponent } from './components/assessment-modal/assessment-modal.component';
import { CartDrawerComponent } from './components/cart-drawer/cart-drawer.component';
import { ApiService } from './services/api.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    NavbarComponent,
    FooterComponent,
    AssessmentModalComponent,
    CartDrawerComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  api = inject(ApiService);
}
