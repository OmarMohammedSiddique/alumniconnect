export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="bg-background text-foreground">{children}</div>;
}
