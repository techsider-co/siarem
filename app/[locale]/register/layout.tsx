export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Register sayfası için özel layout - sidebar olmadan
  return <>{children}</>;
}

