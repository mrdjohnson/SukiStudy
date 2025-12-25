// https://signaldb.js.org/guides/react/

import { createUseReactivityHook } from '@signaldb/react'
import { effect } from '@maverick-js/signals'

const useReactivity = createUseReactivityHook(effect)
export default useReactivity
