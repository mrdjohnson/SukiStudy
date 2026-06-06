export type StartupMigration = {
  id: string
  run: () => Promise<void>
}
