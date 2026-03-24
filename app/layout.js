export const metadata = {
  title: "На Виражах — Заказ еды",
  description: "Онлайн-заказы кафе На Виражах · самовывоз",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, padding: 0, fontFamily: "'Nunito', 'Segoe UI', sans-serif", background: '#111212', color: '#f4f4f2' }}>
        {children}
      </body>
    </html>
  );
}
