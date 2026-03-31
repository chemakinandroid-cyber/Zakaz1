export const metadata = {
  title: 'На Виражах — Заказ онлайн',
  description: 'Кафе быстрого питания На Виражах — закажи онлайн и забери готовое',
  icons: { icon: '/favicon.ico', apple: '/icon-192.png' },
}

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#ff6b35" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Playfair+Display:wght@700;900&display=swap" rel="stylesheet" />
      </head>
      <body style={{
        margin: 0,
        background: '#f7f3ee',
        color: '#1a1a1a',
        fontFamily: "'Nunito', sans-serif",
        minHeight: '100vh',
      }}>
        {children}
      </body>
    </html>
  )
}
