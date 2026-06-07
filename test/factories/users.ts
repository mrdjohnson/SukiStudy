import { faker } from '@faker-js/faker'
import { Factory } from 'fishery'
import type { User } from '../../src/core/types'
import { users } from '../../src/core/db'

type UserRecord = User & { id: string }

type UserTransientParams = {
  isGuest?: boolean
}

export const userFactory = Factory.define<UserRecord, UserTransientParams>(
  ({ transientParams, onCreate }) => {
    onCreate(user => {
      users.insert(user)

      return user
    })

    const isGuest = transientParams.isGuest ?? false

    return {
      id: 'current',
      username: isGuest ? 'Guest' : faker.internet.username().toLowerCase(),
      level: faker.number.int({ min: 1, max: 60 }),
      started_at: faker.date.past().toISOString(),
      current_vacation_started_at: null,
      profile_url: faker.internet.url(),
      subscription: {
        max_level_granted: 60,
      },
      is_guest: isGuest,
    }
  },
)
