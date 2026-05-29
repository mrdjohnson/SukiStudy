import { defineHandler } from 'nitro'

export default defineHandler(() => {
  return { message: 'Hello Nitro!', buildDate: __BUILD_DATE_LONG__, appEnv: __APP_ENV__ }
})
