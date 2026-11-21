'use client'

import { createContext, useContext } from 'react'
import type { CurrentUser } from '@/lib/session'

const UserCtx = createContext<CurrentUser | null>(null)

export function UserProvider({
  user,
  children,
}: {
  user: CurrentUser | null
  children: React.ReactNode
}) {
  return <UserCtx.Provider value={user}>{children}</UserCtx.Provider>
}

export function useUser() {
  return useContext(UserCtx)
}
