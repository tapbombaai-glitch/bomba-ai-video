import "./globals.css";

export const metadata = {
  title: "BOMBA AI Video Studio",
  description: "Create realistic AI videos, scenes and full episodes."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
