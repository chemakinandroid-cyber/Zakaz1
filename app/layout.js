import './globals.css';

export const metadata = {
  title: 'На Виражах — заказ',
  description: 'Онлайн-заказ для кафе На Виражах',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
