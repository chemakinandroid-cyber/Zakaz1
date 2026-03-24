
export function ScrollArea({ children, className="" }: any) {
  return (
    <div className={"overflow-auto " + className}>
      {children}
    </div>
  );
}
