import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { App } from './app/app';

bootstrapApplication(App, {
  providers: [provideRouter([])],
}).catch((error: unknown) => {
  console.error('ASHA Studio bootstrap failed', error);
});
