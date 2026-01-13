import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Basketball Playing Time Scheduler',
  description: 'Manage youth basketball team playing time schedules',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
