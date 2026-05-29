import { installAppCaching } from './serviceWorker/cache'
import { registerPushNotificationHandlers } from './serviceWorker/pushNotifications/push.worker'

declare let self: ServiceWorkerGlobalScope

// Workbox owns the app-shell and runtime caches. Keeping this in the service
// worker lets injectManifest replace __WB_MANIFEST during the production build.
installAppCaching(self.__WB_MANIFEST)

// Push events are intentionally separated from caching so notification payloads,
// click routing, and local notification scheduling can evolve independently.
registerPushNotificationHandlers()
