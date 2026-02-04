import { useRegisterSW } from 'virtual:pwa-register/react'
import { useEffect } from 'react'

const hour_1 = 60 * 60 * 1000

function PWABadge() {
  // check for updates every hour

  const {
    offlineReady: [offlineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swScriptUrl, registration) {
      console.log(`Service Worker at: ${swScriptUrl}`)

      if (registration) {
        // update registration every hour
        setInterval(() => {
          console.log('updating registration')

          registration.update()
        }, hour_1)
      } else {
        console.log('SW Registered: ' + registration)
      }
    },

    onOfflineReady() {
      console.log('Offline ready')
    },
  })

  useEffect(() => {
    // do not ask for prompt, immediately update for now
    if (needRefresh) {
      console.log('refreshing page')
      setNeedRefresh(false)
      updateServiceWorker()
    }
  }, [needRefresh, offlineReady])

  return null
}

export default PWABadge
