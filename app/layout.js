export const metadata = { title: 'На Виражах', description: 'Онлайн-заказ' }

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body style={{ margin: 0, background: '#071432', color: '#fff', fontFamily: 'Arial, sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
