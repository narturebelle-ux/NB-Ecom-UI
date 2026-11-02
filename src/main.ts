import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { logApiHellos } from './app/startup/api-hello';
import { waitForBackends } from './app/startup/backend-check';

logApiHellos();

waitForBackends()
  .then(() => bootstrapApplication(App, appConfig))
  .catch((err) => console.error(err));
