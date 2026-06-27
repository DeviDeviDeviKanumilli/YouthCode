export const metadata = {
  title: "SproutGo API",
  description: "Backend API for SproutGo",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
