export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body style={{ margin: 0, fontFamily: 'sans-serif', background: '#0f172a', color: '#fff' }}>
        {children}
      </body>
    </html>
  )
}
