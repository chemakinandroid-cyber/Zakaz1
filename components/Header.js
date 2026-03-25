import Link from 'next/link';

export default function Header({ adminHref = '/admin/login', rightAction = null }) {
  return (
    <header className="topbar">
      <div className="container topbar-inner">
        <Link href="/" className="brand">
          <span className="brand-mark">✈</span>
          <span>
            <strong>На Виражах</strong>
            <small>онлайн-заказ</small>
          </span>
        </Link>
        <div className="topbar-actions">
          {rightAction}
          <Link href={adminHref} className="btn btn-light">Админка</Link>
        </div>
      </div>
    </header>
  );
}
