
export function Dialog({ open, children }: any) {
  if (!open) return null;
  return <div className="fixed inset-0 bg-black/50 flex items-center justify-center">{children}</div>;
}

export function DialogContent({ children }: any) {
  return <div className="bg-white p-4 rounded-xl max-w-lg w-full">{children}</div>;
}

export function DialogHeader({ children }: any) {
  return <div className="mb-2">{children}</div>;
}

export function DialogTitle({ children }: any) {
  return <h2 className="text-lg font-bold">{children}</h2>;
}
