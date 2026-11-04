import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { logApiHellos } from './app/startup/api-hello';
import { waitWhileClosed } from './app/startup/maintenance';

logApiHellos();

waitWhileClosed()
  .then(() => bootstrapApplication(App, appConfig))
  .catch((err) => console.error(err));
