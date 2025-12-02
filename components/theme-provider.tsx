"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

// TİP DÜZELTMESİ:
// Artık 'dist/types' yolundan import etmiyoruz.
// Doğrudan NextThemesProvider'ın kabul ettiği props'ları alıyoruz.
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}