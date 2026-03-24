export const metadata = {
  title: "На Виражах",
  description: "Онлайн-заказы кафе На Виражах",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body
        style={{
          margin: 0,
          fontFamily:
            'Inter, Arial, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          background: "#08111f",
          color: "#eef2ff",
        }}
      >
        {children}
      </body>
    </html>
  );
}
