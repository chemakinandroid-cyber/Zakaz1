export const metadata = {
  title: "На Виражах",
  description: "Онлайн-заказы кафе На Виражах",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body style={{ margin: 0, fontFamily: 'Inter, Arial, sans-serif', background: '#0b1020', color: '#fff' }}>
        {children}
      </body>
    </html>
  );
}
