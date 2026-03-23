export const metadata = {
  title: "На Виражах",
  description: "Кафе На Виражах",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body style={{ margin: 0, fontFamily: "Arial, sans-serif", background: "#f8fafc" }}>
        {children}
      </body>
    </html>
  );
}
