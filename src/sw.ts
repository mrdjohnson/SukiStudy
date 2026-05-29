import { installAppCaching } from './serviceWorker/cache'

declare let self: ServiceWorkerGlobalScope

// Workbox owns the app-shell and runtime caches. Keeping this in the service
// worker lets injectManifest replace __WB_MANIFEST during the production build.
installAppCaching(self.__WB_MANIFEST)
