import { Component, computed, input, signal } from '@angular/core';

@Component({
  selector: 'app-game-image',
  standalone: true,
  template: `
    @if (imageLink() && failedSource() !== imageLink()) {
      <img [src]="imageLink()" [alt]="label()" draggable="false"
           (error)="failedSource.set(imageLink())">
    } @else {
      <span class="initials" [attr.aria-label]="label()">{{ initials() }}</span>
    }
  `,
  styles: `
    :host { display: block; width: 100%; height: 100%; overflow: hidden; }
    img { width: 100%; height: 100%; object-fit: cover; }
    .initials {
      display: grid; place-items: center; width: 100%; height: 100%;
      background: linear-gradient(135deg, var(--surface-2), var(--surface-0));
      color: var(--accent-light); font-weight: 600; font-size: 1rem;
    }
  `,
})
export class GameImageComponent {
  readonly imageLink = input<string | null>(null);
  readonly label = input.required<string>();
  readonly failedSource = signal<string | null>(null);
  readonly initials = computed(() => this.label().split(/\s+/)
    .slice(0, 2).map(word => word.charAt(0)).join('').toUpperCase());
}
